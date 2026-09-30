export type PersonRole =
  | "ALUNO"
  | "RESPONSAVEL"
  | "ADMINISTRADOR"
  | "RECEPCAO"
  | "PROFESSOR"
  | "ACOMPANHANTE";

export type PersonStatus = "ATIVA" | "INATIVA" | "BLOQUEADA";
export type FacialStatus = "PENDENTE" | "CADASTRADA" | "INATIVA";
export type Belt =
  | "Branca"
  | "Cinza"
  | "Amarela"
  | "Laranja"
  | "Verde"
  | "Azul"
  | "Roxa"
  | "Marrom"
  | "Preta";

export interface Person {
  personId: string;
  fullName: string;
  birthDate: string;
  cpfDigits?: string;
  roles: PersonRole[];
  status: PersonStatus;
  phone?: string;
  whatsapp?: string;
  email?: string;
  deletedAt?: string | null;
}

export interface StudentProfile {
  personId: string;
  currentBelt: Belt;
  lastGraduationDate?: string;
  professorPersonId?: string;
  topdataUserId?: string;
  facialStatus: FacialStatus;
  administrativeRestriction?: string | null;
}

export type AttendanceKind = "SCHEDULED" | "EXTRA" | "NONE";
