import { addDays } from "./dates.js";

export interface NotificationScheduleItem {
  key: "D-3" | "D-1" | "D0" | "D+1";
  date: string;
  time: string;
}

export function billingNotificationSchedule(
  dueDate: string,
  dMinus3Time = "10:00",
  dMinus1Time = "10:00",
): NotificationScheduleItem[] {
  return [
    { key: "D-3", date: addDays(dueDate, -3), time: dMinus3Time },
    { key: "D-1", date: addDays(dueDate, -1), time: dMinus1Time },
    { key: "D0", date: dueDate, time: "16:00" },
    { key: "D+1", date: addDays(dueDate, 1), time: "12:00" },
  ];
}
