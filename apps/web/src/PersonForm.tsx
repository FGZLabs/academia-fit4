import { ageOn, formatCpf, isValidCpf } from "@academia/domain";
import { useMemo, useState, type FormEvent } from "react";
import { createStudent, type CreateStudentPayload } from "./services";

const belts = ["Branca", "Cinza", "Amarela", "Laranja", "Verde", "Azul", "Roxa", "Marrom", "Preta"];

function todayLocal(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function PersonForm({ enabled, onCreated }: { enabled: boolean; onCreated?: () => void }) {
  const [birthDate, setBirthDate] = useState("");
  const [cpf, setCpf] = useState("");
  const [guardianMode, setGuardianMode] = useState<"EXISTING" | "NEW">("EXISTING");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const age = useMemo(() => {
    try { return birthDate ? ageOn(birthDate, todayLocal()) : null; }
    catch { return null; }
  }, [birthDate]);
  const minor = age !== null && age < 18;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setMessage("");
    const form = new FormData(formElement);
    if (age === null) return setMessage("Informe uma data de nascimento válida.");
    if (!minor && !isValidCpf(cpf)) return setMessage("CPF obrigatório e inválido para aluno adulto.");
    if (cpf && !isValidCpf(cpf)) return setMessage("CPF informado é inválido.");
    if (!enabled) return setMessage("Configure o Firebase para salvar o cadastro.");

    const payload: CreateStudentPayload = {
      person: {
        birthDate,
        fullName: String(form.get("fullName") ?? ""),
        ...(cpf ? { cpf } : {}),
        phone: String(form.get("phone") ?? ""),
        whatsapp: String(form.get("whatsapp") ?? ""),
        email: String(form.get("email") ?? ""),
      },
      student: {
        currentBelt: String(form.get("currentBelt") ?? "Branca"),
        lastGraduationDate: String(form.get("lastGraduationDate") ?? "") || undefined,
        professorPersonId: String(form.get("professorPersonId") ?? "") || undefined,
        planId: String(form.get("planId") ?? "") || undefined,
        notes: String(form.get("notes") ?? "") || undefined,
      },
    };

    if (minor) {
      payload.guardian = guardianMode === "EXISTING"
        ? {
          mode: "EXISTING",
          personId: String(form.get("guardianPersonId") ?? ""),
          relationship: String(form.get("relationship") ?? ""),
        }
        : {
          mode: "NEW",
          person: {
            fullName: String(form.get("guardianName") ?? ""),
            birthDate: String(form.get("guardianBirthDate") ?? ""),
            cpf: String(form.get("guardianCpf") ?? ""),
            phone: String(form.get("guardianPhone") ?? ""),
            whatsapp: String(form.get("guardianWhatsapp") ?? ""),
            email: String(form.get("guardianEmail") ?? ""),
            relationship: String(form.get("relationship") ?? ""),
          },
        };
    }

    setBusy(true);
    try {
      const result = await createStudent(payload);
      formElement.reset();
      setBirthDate("");
      setCpf("");
      setMessage(`Pessoa criada com sucesso: ${result.personId}`);
      onCreated?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card person-form" onSubmit={submit}>
      <div className="section-title">
        <div>
          <span className="eyebrow">ENTIDADE CENTRAL</span>
          <h2>Novo aluno</h2>
          <p>O cadastro começa pela data de nascimento e adapta os campos automaticamente.</p>
        </div>
        {age !== null && <span className="age-chip">{age} anos</span>}
      </div>

      <div className="form-grid">
        <label className="field required first-field">
          <span>Data de nascimento</span>
          <input name="birthDate" type="date" required value={birthDate} onChange={(event) => setBirthDate(event.target.value)} />
        </label>
        {birthDate && (
          <>
            <label className="field wide required">
              <span>Nome completo</span>
              <input name="fullName" required autoComplete="name" />
            </label>
            <label className={`field ${minor ? "" : "required"}`}>
              <span>CPF {minor && "(opcional para menor)"}</span>
              <input
                name="cpf"
                inputMode="numeric"
                value={cpf}
                onChange={(event) => setCpf(formatCpf(event.target.value))}
                required={!minor}
                placeholder="000.000.000-00"
              />
            </label>
            <label className="field"><span>Telefone</span><input name="phone" type="tel" /></label>
            <label className="field"><span>WhatsApp</span><input name="whatsapp" type="tel" /></label>
            <label className="field"><span>E-mail</span><input name="email" type="email" /></label>
            <label className="field required">
              <span>Graduação atual</span>
              <select name="currentBelt" required>{belts.map((belt) => <option key={belt}>{belt}</option>)}</select>
            </label>
            <label className="field"><span>Última graduação</span><input name="lastGraduationDate" type="date" /></label>
            <label className="field"><span>ID do professor</span><input name="professorPersonId" /></label>
            <label className="field"><span>ID do plano</span><input name="planId" /></label>
            <label className="field wide"><span>Observações</span><textarea name="notes" rows={3} /></label>
          </>
        )}
      </div>

      {minor && (
        <fieldset className="guardian-box">
          <legend>Responsável obrigatório</legend>
          <div className="mode-switch">
            <button type="button" className={guardianMode === "EXISTING" ? "active" : ""} onClick={() => setGuardianMode("EXISTING")}>Já cadastrado</button>
            <button type="button" className={guardianMode === "NEW" ? "active" : ""} onClick={() => setGuardianMode("NEW")}>Novo responsável</button>
          </div>
          <div className="form-grid">
            {guardianMode === "EXISTING" ? (
              <label className="field wide required"><span>personId do responsável</span><input name="guardianPersonId" required /></label>
            ) : (
              <>
                <label className="field wide required"><span>Nome do responsável</span><input name="guardianName" required /></label>
                <label className="field required"><span>Nascimento do responsável</span><input name="guardianBirthDate" type="date" required /></label>
                <label className="field required"><span>CPF do responsável</span><input name="guardianCpf" required /></label>
                <label className="field"><span>Telefone</span><input name="guardianPhone" /></label>
                <label className="field"><span>WhatsApp</span><input name="guardianWhatsapp" /></label>
                <label className="field wide"><span>E-mail</span><input name="guardianEmail" type="email" /></label>
              </>
            )}
            <label className="field required"><span>Parentesco</span><input name="relationship" required /></label>
          </div>
        </fieldset>
      )}

      {message && <div className="form-message" role="status">{message}</div>}
      <button className="primary action" disabled={busy || !birthDate}>{busy ? "Salvando…" : "Salvar pessoa"}</button>
    </form>
  );
}
