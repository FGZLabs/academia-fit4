import { addDays, compareIsoDates } from "./dates.js";

export const MEMBERSHIP_PERIOD_DAYS = 30;

export function renewMembershipValidity(
  currentValidity: string | null | undefined,
  paymentDate: string,
): string {
  const base = currentValidity && compareIsoDates(currentValidity, paymentDate) > 0
    ? currentValidity
    : paymentDate;
  return addDays(base, MEMBERSHIP_PERIOD_DAYS);
}

export function paymentEventKey(provider: string, eventId: string): string {
  const cleanProvider = provider.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  const cleanEvent = eventId.trim().replace(/[^A-Za-z0-9_-]/g, "_");
  if (!cleanProvider || !cleanEvent) throw new Error("Provider e evento são obrigatórios.");
  return `${cleanProvider}_${cleanEvent}`;
}
