import { ageOn, weekday } from "./dates.js";
import type { AttendanceKind } from "./types.js";

export function requiredWeekdaysForAge(age: number): number[] {
  if (age < 0) throw new Error("Idade inválida.");
  return age <= 14 ? [1, 3, 5] : [1, 2, 3, 4, 5];
}

export interface AttendanceContext {
  birthDate: string;
  date: string;
  academyClosed?: boolean;
  holiday?: boolean;
  optionalEvent?: boolean;
  openMat?: boolean;
}

export function classifyAttendanceDay(context: AttendanceContext): AttendanceKind {
  if (context.openMat || context.optionalEvent) return "EXTRA";
  if (context.academyClosed || context.holiday) return "NONE";
  const day = weekday(context.date);
  if (day === 0 || day === 6) return "NONE";
  const age = ageOn(context.birthDate, context.date);
  return requiredWeekdaysForAge(age).includes(day) ? "SCHEDULED" : "EXTRA";
}

export function dailyAttendanceId(personId: string, date: string): string {
  if (!personId.trim()) throw new Error("personId é obrigatório.");
  return `${personId}_${date}`;
}

export function frequencyPercentage(
  scheduledAttendances: number,
  scheduledTrainings: number,
): number {
  if (scheduledAttendances < 0 || scheduledTrainings < 0) {
    throw new Error("Frequência não aceita valores negativos.");
  }
  if (scheduledTrainings === 0) return 0;
  return Math.min(100, (scheduledAttendances / scheduledTrainings) * 100);
}
