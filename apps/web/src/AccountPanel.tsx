import type { User } from "firebase/auth";
import { useState, type FormEvent } from "react";
import { changePassword, friendlyAuthError, requestPasswordReset } from "./services";

export function AccountPanel({ user }: { user: User }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const currentPassword = String(data.get("currentPassword") || "");
    const newPassword = String(data.get("newPassword") || "");
    const confirmation = String(data.get("confirmation") || "");
    if (newPassword !== confirmation) return setMessage("A confirmação não corresponde à nova senha.");
    setBusy(true);
    setMessage("");
    try {
      await changePassword(user, currentPassword, newPassword);
      form.reset();
      setMessage("Senha alterada com sucesso.");
    } catch (error) {
      setMessage(friendlyAuthError(error));
    } finally {
      setBusy(false);
    }
  }

  async function sendRecovery() {
    if (!user.email) return;
    setBusy(true);
    try {
      await requestPasswordReset(user.email);
      setMessage(`E-mail de recuperação enviado para ${user.email}.`);
    } catch (error) {
      setMessage(friendlyAuthError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div><span className="eyebrow">SEGURANÇA</span><h2>Minha conta</h2></div>
        <span className="account-email">{user.email}</span>
      </div>
      <form className="card settings-card" onSubmit={submit}>
        <h3>Trocar senha</h3>
        <p>Confirme sua senha atual para proteger alterações na conta.</p>
        <div className="form-grid">
          <label className="field wide required"><span>Senha atual</span><input name="currentPassword" type="password" autoComplete="current-password" required /></label>
          <label className="field required"><span>Nova senha</span><input name="newPassword" type="password" minLength={8} autoComplete="new-password" required /></label>
          <label className="field required"><span>Confirmar nova senha</span><input name="confirmation" type="password" minLength={8} autoComplete="new-password" required /></label>
        </div>
        {message && <div className="form-message" role="status">{message}</div>}
        <div className="button-row">
          <button className="primary action" disabled={busy}>{busy ? "Aguarde…" : "Alterar senha"}</button>
          <button type="button" className="secondary action" disabled={busy} onClick={() => void sendRecovery()}>Enviar link de recuperação</button>
        </div>
      </form>
    </section>
  );
}
