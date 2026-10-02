import { createHash } from "node:crypto";
import { ageOn, formatCpf, formatPhone, isValidCpf, isValidMobilePhone, normalizeCpf } from "@academia/domain";
import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { requireStaff } from "./auth.js";
import { db, localDate } from "./platform.js";
import { parseInput } from "./validation.js";

const basePersonSchema = z.object({
  fullName: z.string().trim().min(3).max(160).transform((value) => value.toLocaleUpperCase("pt-BR")),
  birthDate: z.iso.date(),
  cpf: z.string().trim().max(18).optional(),
  phone: z.string().trim().max(30).refine((value) => !value || isValidMobilePhone(value), "Telefone inválido.").optional(),
  whatsapp: z.string().trim().max(30).refine((value) => !value || isValidMobilePhone(value), "WhatsApp inválido.").optional(),
  email: z.email().optional().or(z.literal("")),
});

const guardianSchema = z.object({
  fullName: z.string().trim().min(3).max(160).transform((value) => value.toLocaleUpperCase("pt-BR")),
  cpf: z.string().trim().max(18),
  relationship: z.string().trim().min(2).max(60).transform((value) => value.toLocaleUpperCase("pt-BR")),
});

const createStudentSchema = z.object({
  person: basePersonSchema,
  student: z.object({
    currentBelt: z.enum([
      "Branca", "Cinza", "Amarela", "Laranja", "Verde",
      "Azul", "Roxa", "Marrom", "Preta",
    ]).default("Branca"),
    lastGraduationDate: z.iso.date().optional(),
    professorPersonId: z.string().trim().min(1).optional(),
    planId: z.string().trim().min(1).optional(),
    notes: z.string().trim().max(2000).transform((value) => value.toLocaleUpperCase("pt-BR")).optional(),
  }),
  guardian: guardianSchema.optional(),
});

function cpfIndexKey(cpfDigits: string): string {
  return createHash("sha256").update(cpfDigits, "utf8").digest("hex");
}

function validatedCpf(cpf: string | undefined, required: boolean): string | undefined {
  const digits = normalizeCpf(cpf ?? "");
  if (!digits && !required) return undefined;
  if (!isValidCpf(digits)) throw new HttpsError("invalid-argument", "CPF inválido.");
  return digits;
}

export const createStudent = onCall({ enforceAppCheck: true }, async (request) => {
  const actor = requireStaff(request.auth);
  const input = parseInput(createStudentSchema, request.data);
  const age = ageOn(input.person.birthDate, localDate());
  const minor = age < 18;
  if (minor && !input.guardian) {
    throw new HttpsError("failed-precondition", "Responsável obrigatório para menor de 18 anos.");
  }

  const studentCpf = validatedCpf(input.person.cpf, !minor);
  const studentRef = db.collection("people").doc();
  const profileRef = db.collection("studentProfiles").doc(studentRef.id);
  const enrollmentRef = db.collection("enrollments").doc(studentRef.id);
  const auditRef = db.collection("auditLogs").doc();

  const newGuardianRef = input.guardian ? db.collection("people").doc() : null;
  const guardianCpf = input.guardian ? validatedCpf(input.guardian.cpf, true) : undefined;
  if (studentCpf && guardianCpf === studentCpf) {
    throw new HttpsError("invalid-argument", "Aluno e responsável não podem usar o mesmo CPF.");
  }

  await db.runTransaction(async (transaction) => {
    const studentCpfRef = studentCpf
      ? db.collection("cpfIndex").doc(cpfIndexKey(studentCpf))
      : null;
    const guardianCpfRef = guardianCpf
      ? db.collection("cpfIndex").doc(cpfIndexKey(guardianCpf))
      : null;

    const [studentIndex, guardianIndex] = await Promise.all([
      studentCpfRef ? transaction.get(studentCpfRef) : Promise.resolve(null),
      guardianCpfRef ? transaction.get(guardianCpfRef) : Promise.resolve(null),
    ]);

    if (studentIndex?.exists) throw new HttpsError("already-exists", "CPF já cadastrado.");

    let resolvedGuardianRef = newGuardianRef;
    let existingGuardianFound = false;
    if (guardianIndex?.exists) {
      const existingPersonId = String(guardianIndex.data()?.personId ?? "");
      if (!existingPersonId) throw new HttpsError("data-loss", "Índice do responsável inconsistente.");
      resolvedGuardianRef = db.collection("people").doc(existingPersonId);
      const existingGuardian = await transaction.get(resolvedGuardianRef);
      if (!existingGuardian.exists) throw new HttpsError("not-found", "Responsável localizado pelo CPF não foi encontrado.");
      existingGuardianFound = true;
    }

    const now = FieldValue.serverTimestamp();
    transaction.create(studentRef, {
      personId: studentRef.id,
      fullName: input.person.fullName,
      birthDate: input.person.birthDate,
      ...(studentCpf ? { cpfDigits: studentCpf, cpfFormatted: formatCpf(studentCpf) } : {}),
      phone: input.person.phone ? formatPhone(input.person.phone) : null,
      whatsapp: input.person.whatsapp ? formatPhone(input.person.whatsapp) : null,
      email: input.person.email || null,
      roles: ["ALUNO"],
      status: "ATIVA",
      ageBand: age < 15 ? "ATE_14" : age < 18 ? "15_A_17" : "ADULTO",
      requiresAdultTerm: false,
      createdAt: now,
      createdBy: actor.uid,
      updatedAt: now,
      deletedAt: null,
    });

    transaction.create(profileRef, {
      personId: studentRef.id,
      currentBelt: input.student.currentBelt,
      lastGraduationDate: input.student.lastGraduationDate ?? null,
      professorPersonId: input.student.professorPersonId ?? null,
      notes: input.student.notes ?? null,
      topdataUserId: null,
      facialStatus: "PENDENTE",
      profilePhotoPath: null,
      administrativeRestriction: null,
      updatedAt: now,
    });

    transaction.create(enrollmentRef, {
      personId: studentRef.id,
      planId: input.student.planId ?? null,
      status: "ATIVA",
      validUntil: null,
      createdAt: now,
      updatedAt: now,
    });

    if (studentCpfRef) {
      transaction.create(studentCpfRef, { personId: studentRef.id, createdAt: now });
    }

    let guardianPersonId: string | null = null;
    let relationship: string | null = null;
    if (input.guardian && resolvedGuardianRef && guardianCpfRef && guardianCpf) {
      guardianPersonId = resolvedGuardianRef.id;
      relationship = input.guardian.relationship;
      if (existingGuardianFound) {
        transaction.update(resolvedGuardianRef, {
        roles: FieldValue.arrayUnion("RESPONSAVEL"),
        updatedAt: now,
      });
      } else {
        transaction.create(resolvedGuardianRef, {
        personId: resolvedGuardianRef.id,
        fullName: input.guardian.fullName,
        birthDate: null,
        cpfDigits: guardianCpf,
        cpfFormatted: formatCpf(guardianCpf),
        phone: null,
        whatsapp: null,
        email: null,
        roles: ["RESPONSAVEL"],
        status: "ATIVA",
        createdAt: now,
        createdBy: actor.uid,
        updatedAt: now,
        deletedAt: null,
      });
        transaction.create(guardianCpfRef, { personId: resolvedGuardianRef.id, createdAt: now });
      }
    }

    if (guardianPersonId && relationship) {
      const linkRef = db.collection("guardianLinks").doc(`${guardianPersonId}_${studentRef.id}`);
      transaction.create(linkRef, {
        guardianPersonId,
        dependentPersonId: studentRef.id,
        relationship,
        status: "ATIVO",
        historicallyLinked: true,
        createdAt: now,
      });
    }

    transaction.create(auditRef, {
      actorUid: actor.uid,
      action: "PERSON_CREATED",
      entityType: "people",
      entityId: studentRef.id,
      occurredAt: now,
      after: { fullName: input.person.fullName, roles: ["ALUNO"], minor },
    });
  });

  return { personId: studentRef.id, age, minor };
});
