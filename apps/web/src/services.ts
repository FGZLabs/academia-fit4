import { ageOn, formatCpf, isValidCpf, normalizeCpf } from "@academia/domain";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  getIdTokenResult,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  updatePassword,
  type User,
} from "firebase/auth";
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { auth, db } from "./firebase";

export interface CreateStudentPayload {
  person: {
    fullName: string;
    birthDate: string;
    cpf?: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
  };
  student: {
    currentBelt: string;
    lastGraduationDate?: string;
    professorPersonId?: string;
    planId?: string;
    notes?: string;
  };
  guardian?:
    | { mode: "EXISTING"; personId: string; relationship: string }
    | {
      mode: "NEW";
      person: {
        fullName: string;
        birthDate: string;
        cpf: string;
        phone?: string;
        whatsapp?: string;
        email?: string;
        relationship: string;
      };
    };
}

export interface SessionProfile {
  kind: "ADMIN" | "RECEPTION" | "STUDENT" | "UNLINKED";
  personId?: string;
  displayName: string;
}

export interface PersonRow {
  personId: string;
  fullName: string;
  birthDate: string;
  roles: string[];
  status: string;
  cpfFormatted?: string;
  email?: string;
}

export interface StudentPortalData {
  person: DocumentData | null;
  profile: DocumentData | null;
  enrollment: DocumentData | null;
}

function requireFirebase() {
  if (!auth || !db) throw new Error("Firebase ainda não foi configurado.");
  return { auth, db };
}

function todayLocal(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, "0")).join("");
}

export function friendlyAuthError(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  const messages: Record<string, string> = {
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/invalid-email": "Informe um e-mail válido.",
    "auth/email-already-in-use": "Este e-mail já possui uma conta. Use Entrar ou Esqueci minha senha.",
    "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    "auth/requires-recent-login": "Por segurança, saia e entre novamente antes de trocar a senha.",
    "auth/network-request-failed": "Não foi possível acessar o Firebase. Verifique sua conexão.",
  };
  return messages[code] ?? (error instanceof Error ? error.message : "Não foi possível concluir a operação.");
}

export async function loadSessionProfile(user: User): Promise<SessionProfile> {
  const { db } = requireFirebase();
  const token = await getIdTokenResult(user, true);
  if (token.claims.admin === true) {
    return { kind: "ADMIN", displayName: user.displayName || user.email || "Administrador" };
  }
  if (token.claims.reception === true) {
    return { kind: "RECEPTION", displayName: user.displayName || user.email || "Recepção" };
  }
  const account = await getDoc(doc(db, "users", user.uid));
  if (account.exists()) {
    const data = account.data();
    return {
      kind: "STUDENT",
      personId: String(data.personId || user.uid),
      displayName: String(data.displayName || user.displayName || user.email || "Aluno"),
    };
  }
  return { kind: "UNLINKED", displayName: user.displayName || user.email || "Usuário" };
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { auth } = requireFirebase();
  await sendPasswordResetEmail(auth, email, { url: `${window.location.origin}/?portal=aluno` });
}

export async function changePassword(user: User, currentPassword: string, newPassword: string): Promise<void> {
  if (!user.email) throw new Error("Esta conta não possui e-mail para reautenticação.");
  if (newPassword.length < 8) throw new Error("A nova senha deve ter pelo menos 8 caracteres.");
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
  await updatePassword(user, newPassword);
}

export async function registerAdultStudent(input: {
  fullName: string;
  birthDate: string;
  email: string;
  password: string;
}): Promise<void> {
  const firebase = requireFirebase();
  const age = ageOn(input.birthDate, todayLocal());
  if (age < 18) throw new Error("Para menores de 18 anos, o cadastro inicial deve ser feito pelo responsável ou pela recepção.");
  const credential = await createUserWithEmailAndPassword(firebase.auth, input.email, input.password);
  const uid = credential.user.uid;
  try {
    const batch = writeBatch(firebase.db);
    batch.set(doc(firebase.db, "users", uid), {
      uid,
      personId: uid,
      displayName: input.fullName.trim(),
      roles: ["ALUNO"],
      onboardingStatus: "PENDENTE_COMPLEMENTO",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(firebase.db, "people", uid), {
      personId: uid,
      fullName: input.fullName.trim(),
      birthDate: input.birthDate,
      email: input.email.trim().toLowerCase(),
      roles: ["ALUNO"],
      status: "ATIVA",
      ageBand: "ADULTO",
      createdAt: serverTimestamp(),
      createdBy: uid,
      updatedAt: serverTimestamp(),
      deletedAt: null,
    });
    batch.set(doc(firebase.db, "studentProfiles", uid), {
      personId: uid,
      currentBelt: "Branca",
      lastGraduationDate: null,
      professorPersonId: null,
      facialStatus: "PENDENTE",
      profilePhotoPath: null,
      administrativeRestriction: null,
      onboardingStatus: "PENDENTE_COMPLEMENTO",
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(firebase.db, "enrollments", uid), {
      personId: uid,
      planId: null,
      status: "PENDENTE",
      validUntil: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    await deleteUser(credential.user).catch(() => undefined);
    throw error;
  }
}

export async function createStudent(payload: CreateStudentPayload): Promise<{ personId: string }> {
  const { auth, db } = requireFirebase();
  if (!auth.currentUser) throw new Error("Sessão expirada. Entre novamente.");
  const age = ageOn(payload.person.birthDate, todayLocal());
  const minor = age < 18;
  if (minor && !payload.guardian) throw new Error("Responsável obrigatório para menor de 18 anos.");

  const studentCpf = normalizeCpf(payload.person.cpf ?? "");
  if ((!minor || studentCpf) && !isValidCpf(studentCpf)) throw new Error("CPF do aluno inválido.");
  const guardianCpf = payload.guardian?.mode === "NEW" ? normalizeCpf(payload.guardian.person.cpf) : "";
  if (guardianCpf && !isValidCpf(guardianCpf)) throw new Error("CPF do responsável inválido.");

  const personRef = doc(collection(db, "people"));
  const profileRef = doc(db, "studentProfiles", personRef.id);
  const enrollmentRef = doc(db, "enrollments", personRef.id);
  const studentCpfRef = studentCpf ? doc(db, "cpfIndex", await sha256(studentCpf)) : null;
  const guardianRef = payload.guardian?.mode === "NEW" ? doc(collection(db, "people")) : null;
  const guardianCpfRef = guardianCpf ? doc(db, "cpfIndex", await sha256(guardianCpf)) : null;
  const actorUid = auth.currentUser.uid;

  await runTransaction(db, async (transaction) => {
    if (studentCpfRef && (await transaction.get(studentCpfRef)).exists()) throw new Error("CPF do aluno já cadastrado.");
    if (guardianCpfRef && (await transaction.get(guardianCpfRef)).exists()) throw new Error("CPF do responsável já cadastrado.");
    const existingGuardianRef = payload.guardian?.mode === "EXISTING" ? doc(db, "people", payload.guardian.personId) : null;
    if (existingGuardianRef && !(await transaction.get(existingGuardianRef)).exists()) throw new Error("Responsável não encontrado.");

    const now = serverTimestamp();
    transaction.set(personRef, {
      personId: personRef.id,
      fullName: payload.person.fullName.trim(),
      birthDate: payload.person.birthDate,
      ...(studentCpf ? { cpfDigits: studentCpf, cpfFormatted: formatCpf(studentCpf) } : {}),
      phone: payload.person.phone || null,
      whatsapp: payload.person.whatsapp || null,
      email: payload.person.email?.trim().toLowerCase() || null,
      roles: ["ALUNO"],
      status: "ATIVA",
      ageBand: age < 15 ? "ATE_14" : age < 18 ? "15_A_17" : "ADULTO",
      requiresAdultTerm: false,
      createdAt: now,
      createdBy: actorUid,
      updatedAt: now,
      deletedAt: null,
    });
    transaction.set(profileRef, {
      personId: personRef.id,
      currentBelt: payload.student.currentBelt,
      lastGraduationDate: payload.student.lastGraduationDate || null,
      professorPersonId: payload.student.professorPersonId || null,
      planId: payload.student.planId || null,
      notes: payload.student.notes || null,
      facialStatus: "PENDENTE",
      profilePhotoPath: null,
      administrativeRestriction: null,
      updatedAt: now,
    });
    transaction.set(enrollmentRef, {
      personId: personRef.id,
      planId: payload.student.planId || null,
      status: "ATIVA",
      validUntil: null,
      createdAt: now,
      updatedAt: now,
    });
    if (studentCpfRef) transaction.set(studentCpfRef, { personId: personRef.id, createdAt: now });

    let guardianPersonId: string | null = null;
    let relationship: string | null = null;
    if (payload.guardian?.mode === "EXISTING" && existingGuardianRef) {
      guardianPersonId = existingGuardianRef.id;
      relationship = payload.guardian.relationship;
      transaction.update(existingGuardianRef, { roles: arrayUnion("RESPONSAVEL"), updatedAt: now });
    } else if (payload.guardian?.mode === "NEW" && guardianRef && guardianCpfRef) {
      guardianPersonId = guardianRef.id;
      relationship = payload.guardian.person.relationship;
      transaction.set(guardianRef, {
        personId: guardianRef.id,
        fullName: payload.guardian.person.fullName.trim(),
        birthDate: payload.guardian.person.birthDate,
        cpfDigits: guardianCpf,
        cpfFormatted: formatCpf(guardianCpf),
        phone: payload.guardian.person.phone || null,
        whatsapp: payload.guardian.person.whatsapp || null,
        email: payload.guardian.person.email?.trim().toLowerCase() || null,
        roles: ["RESPONSAVEL"],
        status: "ATIVA",
        createdAt: now,
        createdBy: actorUid,
        updatedAt: now,
        deletedAt: null,
      });
      transaction.set(guardianCpfRef, { personId: guardianRef.id, createdAt: now });
    }
    if (guardianPersonId && relationship) {
      transaction.set(doc(db, "guardianLinks", `${guardianPersonId}_${personRef.id}`), {
        guardianPersonId,
        dependentPersonId: personRef.id,
        relationship,
        status: "ATIVO",
        historicallyLinked: true,
        createdAt: now,
      });
    }
    const auditRef = doc(collection(db, "auditLogs"));
    transaction.set(auditRef, {
      actorUid,
      action: "PERSON_CREATED",
      entityType: "people",
      entityId: personRef.id,
      occurredAt: now,
      after: { fullName: payload.person.fullName.trim(), roles: ["ALUNO"], minor },
    });
  });

  return { personId: personRef.id };
}

export function watchPeople(onData: (people: PersonRow[]) => void, onError: (message: string) => void): Unsubscribe {
  const { db } = requireFirebase();
  const peopleQuery = query(collection(db, "people"), orderBy("fullName"), limit(200));
  return onSnapshot(peopleQuery, (snapshot) => {
    onData(snapshot.docs.map((item) => ({ personId: item.id, ...item.data() } as PersonRow)));
  }, (error) => onError(error.message));
}

export async function loadStudentPortal(personId: string): Promise<StudentPortalData> {
  const { db } = requireFirebase();
  const [person, profile, enrollment] = await Promise.all([
    getDoc(doc(db, "people", personId)),
    getDoc(doc(db, "studentProfiles", personId)),
    getDoc(doc(db, "enrollments", personId)),
  ]);
  return {
    person: person.exists() ? person.data() : null,
    profile: profile.exists() ? profile.data() : null,
    enrollment: enrollment.exists() ? enrollment.data() : null,
  };
}
