import { signOut, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { AccountPanel } from "./AccountPanel";
import { auth } from "./firebase";
import { friendlyAuthError, loadStudentPortal, type SessionProfile, type StudentPortalData } from "./services";

function displayDate(value: unknown): string {
  if (typeof value !== "string" || !value) return "Não informado";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export function StudentPortal({ user, session }: { user: User; session: SessionProfile }) {
  const [active, setActive] = useState<"home" | "payments" | "attendance" | "account">("home");
  const [data, setData] = useState<StudentPortalData | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!session.personId) return;
    void loadStudentPortal(session.personId).then(setData).catch((error) => setMessage(friendlyAuthError(error)));
  }, [session.personId]);

  if (!session.personId) {
    return <div className="empty-state card"><h2>Conta sem cadastro vinculado</h2><p>Solicite à recepção que associe esta conta a uma pessoa.</p></div>;
  }

  const person = data?.person;
  const profile = data?.profile;
  const enrollment = data?.enrollment;

  return (
    <div className="student-shell">
      <header className="student-header">
        <div className="brand"><div className="brand-mark">F4</div><div><strong>Portal do Aluno</strong><span>Academia Fit 4</span></div></div>
        <nav className="student-nav" aria-label="Navegação do aluno">
          <button className={active === "home" ? "active" : ""} onClick={() => setActive("home")}>Início</button>
          <button className={active === "attendance" ? "active" : ""} onClick={() => setActive("attendance")}>Frequência</button>
          <button className={active === "payments" ? "active" : ""} onClick={() => setActive("payments")}>Financeiro</button>
          <button className={active === "account" ? "active" : ""} onClick={() => setActive("account")}>Minha conta</button>
        </nav>
        <button className="secondary student-logout" onClick={() => auth && void signOut(auth)}>Sair</button>
      </header>
      <main className="student-main">
        {message && <div className="form-message error">{message}</div>}
        {!data && !message && <div className="loading-inline">Carregando seu portal…</div>}
        {active === "home" && data && (
          <div className="page-stack">
            <section className="student-hero card">
              <div className="avatar-placeholder">{String(person?.fullName || session.displayName).slice(0, 1).toUpperCase()}</div>
              <div><span className="eyebrow">BEM-VINDO</span><h1>{String(person?.fullName || session.displayName)}</h1><p>{String(profile?.currentBelt || "Graduação pendente")} • Nascimento {displayDate(person?.birthDate)}</p></div>
              <span className={`status-pill ${enrollment?.status === "ATIVA" ? "online" : "setup"}`}>{String(enrollment?.status || "PENDENTE")}</span>
            </section>
            <section className="portal-grid">
              <article className="metric-card"><span>Validade atual</span><strong>{displayDate(enrollment?.validUntil)}</strong><small>Próximo vencimento financeiro</small></article>
              <article className="metric-card"><span>Frequência</span><strong>—</strong><small>Será calculada após os primeiros treinos</small></article>
              <article className="metric-card"><span>Facial Topdata</span><strong>{String(profile?.facialStatus || "PENDENTE")}</strong><small>Cadastro realizado presencialmente</small></article>
              <article className="metric-card"><span>Cadastro</span><strong>{String(profile?.onboardingStatus || "ATIVO")}</strong><small>A recepção pode complementar seus dados</small></article>
            </section>
            <section className="card notice-card"><h3>Próximos passos</h3><p>PIX, comprovantes, calendário e histórico aparecerão aqui quando forem configurados pela academia.</p></section>
          </div>
        )}
        {active === "attendance" && <section className="card module-page"><h2>Frequência</h2><div className="empty-state"><strong>Nenhuma presença registrada</strong><p>As presenças válidas e treinos extras serão exibidos neste calendário.</p></div></section>}
        {active === "payments" && <section className="card module-page"><h2>Financeiro</h2><div className="empty-state"><strong>Nenhuma cobrança disponível</strong><p>Quando houver uma mensalidade, você verá o PIX, vencimento e histórico nesta área.</p></div></section>}
        {active === "account" && <AccountPanel user={user} />}
      </main>
    </div>
  );
}
