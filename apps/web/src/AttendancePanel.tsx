import { classifyAttendanceDay } from "@academia/domain";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { saveAbsenceJustification, watchAbsenceJustifications, watchDailyAttendance, type AbsenceJustification, type DailyAttendanceRow } from "./services";

const weekdayLabels = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function AttendancePanel({ personId, birthDate, studentName, canJustify }: {
  personId: string;
  birthDate: string;
  studentName: string;
  canJustify: boolean;
}) {
  const now = new Date();
  const [attendance, setAttendance] = useState<DailyAttendanceRow[]>([]);
  const [justifications, setJustifications] = useState<AbsenceJustification[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewText, setViewText] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const days = useMemo(() => Array.from({ length: now.getDate() }, (_, index) => index + 1), [now]);
  const attendanceByDate = new Map(attendance.map((item) => [item.date, item]));
  const justificationByDate = new Map(justifications.map((item) => [item.date, item]));

  useEffect(() => {
    const stopAttendance = watchDailyAttendance(personId, setAttendance, setMessage);
    const stopJustifications = watchAbsenceJustifications(personId, setJustifications, setMessage);
    return () => { stopAttendance(); stopJustifications(); };
  }, [personId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDate) return;
    const data = new FormData(event.currentTarget);
    try {
      await saveAbsenceJustification(personId, selectedDate, String(data.get("text") || ""));
      setSelectedDate(null);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível salvar."); }
  }

  return (
    <section className="card attendance-card">
      <div className="page-heading"><div><span className="eyebrow">FREQUÊNCIA</span><h2>{studentName}</h2><p>{now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</p></div><div className="attendance-legend"><span><i className="dot present" /> Presente</span><span><i className="dot absent" /> Falta</span><span><i className="dot extra" /> Extra</span></div></div>
      {message && <div className="form-message error">{message}</div>}
      <div className="attendance-calendar">
        {days.map((day) => {
          const date = isoDate(now.getFullYear(), now.getMonth(), day);
          const weekday = new Date(`${date}T12:00:00`).getDay();
          const classification = classifyAttendanceDay({ birthDate, date });
          const record = attendanceByDate.get(date);
          const justification = justificationByDate.get(date);
          const status = record ? (classification === "EXTRA" ? "EXTRA" : "P") : classification === "SCHEDULED" ? "F" : "—";
          return <div className={`attendance-day status-${status.toLowerCase()}`} key={date}><span>{weekdayLabels[weekday]}</span><strong>{day}</strong><em>{status}</em>{status === "F" && canJustify && <button title="Adicionar justificativa" onClick={() => setSelectedDate(date)}>✎</button>}{status === "F" && justification && !canJustify && <button title="Ver justificativa" onClick={() => setViewText(justification.text)}>▤</button>}</div>;
        })}
      </div>
      <p className="attendance-note">Dias não previstos, fins de semana e treinos extras não geram falta automática.</p>
      {selectedDate && <div className="modal-backdrop"><form className="modal-card compact-modal" onSubmit={save}><div className="modal-header"><div><span className="eyebrow">JUSTIFICATIVA</span><h2>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString("pt-BR")}</h2></div><button type="button" className="modal-close" onClick={() => setSelectedDate(null)}>×</button></div><label className="field required"><span>Informe por que não irá treinar</span><textarea className="uppercase-input" name="text" rows={5} defaultValue={justificationByDate.get(selectedDate)?.text || ""} required /></label><button className="primary action">Salvar justificativa</button></form></div>}
      {viewText && <div className="modal-backdrop"><section className="modal-card compact-modal"><div className="modal-header"><div><span className="eyebrow">JUSTIFICATIVA DO ALUNO</span><h2>Motivo informado</h2></div><button className="modal-close" onClick={() => setViewText(null)}>×</button></div><p className="justification-text">{viewText}</p></section></div>}
    </section>
  );
}
