import { classifyAttendanceDay, dailyAttendanceId } from "@academia/domain";
import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { requireStaff } from "./auth.js";
import { db, localDate } from "./platform.js";
import { parseInput } from "./validation.js";

const accessSchema = z.object({
  personId: z.string().trim().min(1),
  deviceId: z.string().trim().min(1).max(120),
  credentialType: z.enum(["FACIAL", "PIN_ACOMPANHANTE", "SIMULADOR"]),
  direction: z.enum(["ENTRADA", "SAIDA", "INDEFINIDO"]).default("ENTRADA"),
  date: z.iso.date().optional(),
});

export const recordSimulatedAccess = onCall({ enforceAppCheck: true }, async (request) => {
  const actor = requireStaff(request.auth);
  const input = parseInput(accessSchema, request.data);
  const date = input.date ?? localDate();
  const personRef = db.collection("people").doc(input.personId);
  const studentProfileRef = db.collection("studentProfiles").doc(input.personId);
  const enrollmentRef = db.collection("enrollments").doc(input.personId);
  const dayRef = db.collection("academyDays").doc(date);
  const attendanceRef = db.collection("dailyAttendance").doc(dailyAttendanceId(input.personId, date));
  const accessRef = db.collection("accessEvents").doc();

  return db.runTransaction(async (transaction) => {
    const [personSnapshot, studentProfileSnapshot, enrollmentSnapshot, daySnapshot, attendanceSnapshot] = await Promise.all([
      transaction.get(personRef),
      transaction.get(studentProfileRef),
      transaction.get(enrollmentRef),
      transaction.get(dayRef),
      transaction.get(attendanceRef),
    ]);
    if (!personSnapshot.exists) throw new HttpsError("not-found", "Pessoa não encontrada.");

    const person = personSnapshot.data()!;
    const studentProfile = studentProfileSnapshot.data();
    const enrollment = enrollmentSnapshot.data();
    const academyDay = daySnapshot.data() ?? {};
    const roles = Array.isArray(person.roles) ? person.roles as string[] : [];
    const isStudent = roles.includes("ALUNO");
    const registrationActive = person.status === "ATIVA" && person.deletedAt == null;
    const enrollmentActive = !isStudent || (
      enrollmentSnapshot.exists
      && enrollment?.status === "ATIVA"
      && typeof enrollment.validUntil === "string"
      && enrollment.validUntil >= date
    );
    const open = academyDay.openMat === true || academyDay.closed !== true;
    const unrestricted = !studentProfile?.administrativeRestriction;
    const allowed = registrationActive && enrollmentActive && open && unrestricted;
    const reason = !registrationActive
      ? "CADASTRO_INATIVO"
      : !enrollmentActive
        ? "FINANCEIRO_IRREGULAR"
        : !open
          ? "ACADEMIA_FECHADA"
          : !unrestricted
            ? "RESTRICAO_ADMINISTRATIVA"
            : "AUTORIZADO";
    const now = FieldValue.serverTimestamp();

    transaction.create(accessRef, {
      accessEventId: accessRef.id,
      personId: input.personId,
      occurredAt: now,
      localDate: date,
      deviceId: input.deviceId,
      credentialType: input.credentialType,
      direction: input.direction,
      allowed,
      reason,
      origin: "SIMULATOR",
      academyEventId: academyDay.eventId ?? null,
      recordedBy: actor.uid,
    });

    let attendanceCreated = false;
    if (allowed && isStudent && input.direction !== "SAIDA" && !attendanceSnapshot.exists) {
      const kind = classifyAttendanceDay({
        birthDate: String(person.birthDate),
        date,
        academyClosed: academyDay.closed === true,
        holiday: academyDay.holiday === true,
        optionalEvent: academyDay.optionalEvent === true,
        openMat: academyDay.openMat === true,
      });
      if (kind !== "NONE") {
        transaction.create(attendanceRef, {
          attendanceId: attendanceRef.id,
          personId: input.personId,
          date,
          firstAccessEventId: accessRef.id,
          kind,
          extra: kind === "EXTRA",
          createdAt: now,
        });
        attendanceCreated = true;
      }
    }

    return { allowed, reason, accessEventId: accessRef.id, attendanceCreated };
  });
});
