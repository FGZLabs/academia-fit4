const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function assertIsoDate(value: string): void {
  if (!ISO_DATE.test(value)) throw new Error(`Data inválida: ${value}`);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`Data inválida: ${value}`);
  }
}

export function compareIsoDates(a: string, b: string): number {
  assertIsoDate(a);
  assertIsoDate(b);
  return a.localeCompare(b);
}

export function addDays(date: string, amount: number): string {
  assertIsoDate(date);
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + amount);
  return parsed.toISOString().slice(0, 10);
}

export function ageOn(birthDate: string, referenceDate: string): number {
  assertIsoDate(birthDate);
  assertIsoDate(referenceDate);
  if (birthDate > referenceDate) throw new Error("Nascimento não pode estar no futuro.");

  const [birthYear, birthMonth, birthDay] = birthDate.split("-").map(Number);
  const [year, month, day] = referenceDate.split("-").map(Number);
  let age = year! - birthYear!;
  if (month! < birthMonth! || (month === birthMonth && day! < birthDay!)) age -= 1;
  return age;
}

export function weekday(date: string): number {
  assertIsoDate(date);
  return new Date(`${date}T00:00:00.000Z`).getUTCDay();
}
