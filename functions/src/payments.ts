import { paymentEventKey, renewMembershipValidity } from "@academia/domain";
import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { requireAdmin, requireStaff } from "./auth.js";
import { db, localDate } from "./platform.js";
import { parseInput } from "./validation.js";

const confirmPaymentSchema = z.object({
  provider: z.string().trim().min(1).max(40),
  eventId: z.string().trim().min(1).max(160),
  personId: z.string().trim().min(1),
  paidAt: z.iso.date().optional(),
  amountCents: z.number().int().positive(),
  method: z.enum(["PIX", "DINHEIRO", "CARTAO", "TRANSFERENCIA", "COMPROVANTE"]),
  cycleId: z.string().trim().min(1).optional(),
});

async function applyConfirmedPayment(
  input: z.infer<typeof confirmPaymentSchema>,
  actorUid: string,
): Promise<{ applied: boolean; validUntil: string }> {
  const paidAt = input.paidAt ?? localDate();
  const eventKey = paymentEventKey(input.provider, input.eventId);
  const eventRef = db.collection("paymentEvents").doc(eventKey);
  const enrollmentRef = db.collection("enrollments").doc(input.personId);
  const paymentRef = db.collection("payments").doc();
  const auditRef = db.collection("auditLogs").doc();
  const cycleRef = input.cycleId ? db.collection("billingCycles").doc(input.cycleId) : null;

  return db.runTransaction(async (transaction) => {
    const [eventSnapshot, enrollmentSnapshot, cycleSnapshot] = await Promise.all([
      transaction.get(eventRef),
      transaction.get(enrollmentRef),
      cycleRef ? transaction.get(cycleRef) : Promise.resolve(null),
    ]);

    if (eventSnapshot.exists) {
      return {
        applied: false,
        validUntil: String(eventSnapshot.data()?.validUntil ?? ""),
      };
    }
    if (!enrollmentSnapshot.exists) throw new HttpsError("not-found", "Matrícula não encontrada.");
    if (cycleRef && !cycleSnapshot?.exists) throw new HttpsError("not-found", "Ciclo financeiro não encontrado.");

    const beforeValidity = enrollmentSnapshot.data()?.validUntil as string | null | undefined;
    const validUntil = renewMembershipValidity(beforeValidity, paidAt);
    const now = FieldValue.serverTimestamp();

    transaction.create(eventRef, {
      provider: input.provider,
      providerEventId: input.eventId,
      personId: input.personId,
      paymentId: paymentRef.id,
      validUntil,
      processedAt: now,
    });
    transaction.create(paymentRef, {
      paymentId: paymentRef.id,
      personId: input.personId,
      cycleId: input.cycleId ?? null,
      provider: input.provider,
      providerEventId: input.eventId,
      amountCents: input.amountCents,
      method: input.method,
      status: "CONFIRMADO",
      paidAt,
      createdAt: now,
    });
    transaction.update(enrollmentRef, { validUntil, updatedAt: now });
    if (cycleRef) {
      transaction.update(cycleRef, {
        status: "PAGO",
        paidAt,
        paymentId: paymentRef.id,
        notificationsCancelledAt: now,
        updatedAt: now,
      });
    }
    transaction.create(auditRef, {
      actorUid,
      action: "PAYMENT_CONFIRMED",
      entityType: "payments",
      entityId: paymentRef.id,
      occurredAt: now,
      before: { validUntil: beforeValidity ?? null },
      after: { validUntil, amountCents: input.amountCents, method: input.method },
    });
    return { applied: true, validUntil };
  });
}

export const confirmMockPayment = onCall({ enforceAppCheck: true }, async (request) => {
  const actor = requireStaff(request.auth);
  const input = parseInput(confirmPaymentSchema, request.data);
  return applyConfirmedPayment(input, actor.uid);
});

const submitReceiptSchema = z.object({
  personId: z.string().trim().min(1),
  cycleId: z.string().trim().min(1),
  storagePath: z.string().trim().startsWith("externalReceipts/"),
  amountCents: z.number().int().positive(),
  note: z.string().trim().max(1000).optional(),
});

export const submitExternalReceipt = onCall({ enforceAppCheck: true }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Autenticação obrigatória.");
  const input = parseInput(submitReceiptSchema, request.data);
  const callerPersonId = request.auth.token.personId;
  const staff = request.auth.token.admin === true || request.auth.token.reception === true;
  if (!staff && callerPersonId !== input.personId) {
    throw new HttpsError("permission-denied", "Comprovante pertence a outra pessoa.");
  }

  const receiptRef = db.collection("externalReceipts").doc();
  await receiptRef.create({
    receiptId: receiptRef.id,
    ...input,
    status: "AGUARDANDO_APROVACAO",
    submittedBy: request.auth.uid,
    submittedAt: FieldValue.serverTimestamp(),
    reviewedAt: null,
    reviewedBy: null,
  });
  return { receiptId: receiptRef.id, status: "AGUARDANDO_APROVACAO" };
});

const reviewReceiptSchema = z.object({
  receiptId: z.string().trim().min(1),
  decision: z.enum(["APROVADO", "REJEITADO"]),
  observation: z.string().trim().max(1000).optional(),
});

export const reviewExternalReceipt = onCall({ enforceAppCheck: true }, async (request) => {
  const actor = requireAdmin(request.auth);
  const input = parseInput(reviewReceiptSchema, request.data);
  const receiptRef = db.collection("externalReceipts").doc(input.receiptId);
  const snapshot = await receiptRef.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "Comprovante não encontrado.");
  const receipt = snapshot.data()!;
  if (receipt.status !== "AGUARDANDO_APROVACAO") {
    throw new HttpsError("failed-precondition", "Comprovante já analisado.");
  }

  if (input.decision === "REJEITADO") {
    await receiptRef.update({
      status: "REJEITADO",
      observation: input.observation ?? null,
      reviewedBy: actor.uid,
      reviewedAt: FieldValue.serverTimestamp(),
    });
    return { status: "REJEITADO" };
  }

  const result = await applyConfirmedPayment({
    provider: "EXTERNAL_RECEIPT",
    eventId: input.receiptId,
    personId: String(receipt.personId),
    paidAt: localDate(),
    amountCents: Number(receipt.amountCents),
    method: "COMPROVANTE",
    cycleId: String(receipt.cycleId),
  }, actor.uid);
  await receiptRef.update({
    status: "APROVADO",
    observation: input.observation ?? null,
    reviewedBy: actor.uid,
    reviewedAt: FieldValue.serverTimestamp(),
  });
  return { status: "APROVADO", ...result };
});
