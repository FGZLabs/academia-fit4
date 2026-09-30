import { HttpsError } from "firebase-functions/v2/https";

export interface CallableAuth {
  uid: string;
  token: Record<string, unknown>;
}

export function requireAuth(auth: CallableAuth | undefined): CallableAuth {
  if (!auth) throw new HttpsError("unauthenticated", "Autenticação obrigatória.");
  return auth;
}

export function requireStaff(auth: CallableAuth | undefined): CallableAuth {
  const current = requireAuth(auth);
  if (current.token.admin !== true && current.token.reception !== true) {
    throw new HttpsError("permission-denied", "Operação permitida somente à equipe autorizada.");
  }
  return current;
}

export function requireAdmin(auth: CallableAuth | undefined): CallableAuth {
  const current = requireAuth(auth);
  if (current.token.admin !== true) {
    throw new HttpsError("permission-denied", "Operação permitida somente ao administrador.");
  }
  return current;
}
