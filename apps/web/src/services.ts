import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

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

export async function createStudent(payload: CreateStudentPayload): Promise<{ personId: string }> {
  if (!functions) throw new Error("Firebase ainda não foi configurado.");
  const callable = httpsCallable<CreateStudentPayload, { personId: string }>(functions, "createStudent");
  const response = await callable(payload);
  return response.data;
}
