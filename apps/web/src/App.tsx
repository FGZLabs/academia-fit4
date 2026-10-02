import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { useEffect, useState, type FormEvent } from "react";
import { AccountPanel } from "./AccountPanel";
import { auth, firebaseConfigured } from "./firebase";
import { PeoplePanel } from "./PeoplePanel";
import {
  friendlyAuthError,
  loadSessionProfile,
  registerAdultStudent,
  requestPasswordReset,
  watchPeople,
  type SessionProfile,
} from "./services";
import { StudentPortal } from "./StudentPortal";

type LoginMode = "LOGIN" | "RECOVER" | "REGISTER";
type AdminPage = "home" | "people" | "finance" | "attendance" | "calendar" | "account";

function uppercaseInput(event: FormEvent<HTMLInputElement>) {
  event.currentTarget.value = event.currentTarget.value.toLocaleUpperCase("pt-BR");
}

function Login() {
  const portalRequested = new URLSearchParams(window.location.search).get("portal") === "aluno";
  const [audience, setAudience] = useState<"ADMIN" | "STUDENT">(portalRequested ? "STUDENT" : "ADMIN");
  const [mode, setMode] = useState<LoginMode>("LOGIN");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth) return setMessage("Firebase ainda não foi configurado.");
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      await signInWithEmailAndPassword(auth, String(data.get("email")), String(data.get("password")));
    } catch (error) {
      setMessage(friendlyAuthError(error));
    } finally {
      setBusy(false);
    }
  }

  async function recover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await requestPasswordReset(String(data.get("email")));
      setMessage("Enviamos o link de recuperação. Confira também a caixa de spam.");
    } catch (error) {
      setMessage(friendlyAuthError(error));
    } finally {
      setBusy(false);
    }
  }

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password"));
    if (password !== String(data.get("confirmation"))) return setMessage("As senhas não conferem.");
    setBusy(true);
    setMessage("");
    try {
      await registerAdultStudent({
        fullName: String(data.get("fullName")),
        birthDate: String(data.get("birthDate")),
        email: String(data.get("email")),
        password,
      });
    } catch (error) {
      setMessage(friendlyAuthError(error));
    } finally {
      setBusy(false);
    }
  }

  function selectAudience(next: "ADMIN" | "STUDENT") {
    setAudience(next);
    setMode("LOGIN");
    setMessage("");
    const url = next === "STUDENT" ? "/?portal=aluno" : "/";
    window.history.replaceState({}, "", url);
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div className="brand"><div className="brand-mark">F4</div><div><strong>Academia Fit 4</strong><span>Gestão e Portal do Aluno</span></div></div>
        <div className="auth-copy"><span className="eyebrow light">AMBIENTE SEGURO</span><h1>Treino, gestão e evolução em um só lugar.</h1><p>Acesse o painel da academia ou acompanhe sua jornada pelo Portal do Aluno.</p></div>
        <small>V2 Firebase • Ambiente de desenvolvimento</small>
      </section>
      <section className="auth-form-panel">
        <div className="auth-switch" role="tablist">
          <button className={audience === "ADMIN" ? "active" : ""} onClick={() => selectAudience("ADMIN")}>Equipe</button>
          <button className={audience === "STUDENT" ? "active" : ""} onClick={() => selectAudience("STUDENT")}>Portal do Aluno</button>
        </div>

        {mode === "LOGIN" && (
          <form className="auth-form" onSubmit={login}>
            <div><span className="eyebrow">{audience === "ADMIN" ? "ACESSO DA EQUIPE" : "ÁREA DO ALUNO"}</span><h2>Entrar</h2><p>Use seu e-mail e senha cadastrados.</p></div>
            <label className="field required"><span>E-mail</span><input name="email" type="email" autoComplete="email" required /></label>
            <label className="field required"><span>Senha</span><input name="password" type="password" autoComplete="current-password" required /></label>
            {message && <div className="form-message" role="status">{message}</div>}
            <button className="primary auth-submit" disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button>
            <button type="button" className="text-button" onClick={() => { setMode("RECOVER"); setMessage(""); }}>Esqueci minha senha</button>
            {audience === "STUDENT" && <button type="button" className="secondary auth-secondary" onClick={() => { setMode("REGISTER"); setMessage(""); }}>Primeiro acesso / criar cadastro</button>}
          </form>
        )}

        {mode === "RECOVER" && (
          <form className="auth-form" onSubmit={recover}>
            <div><span className="eyebrow">RECUPERAÇÃO</span><h2>Redefinir senha</h2><p>Você receberá um link seguro por e-mail.</p></div>
            <label className="field required"><span>E-mail</span><input name="email" type="email" autoComplete="email" required /></label>
            {message && <div className="form-message" role="status">{message}</div>}
            <button className="primary auth-submit" disabled={busy}>{busy ? "Enviando…" : "Enviar link"}</button>
            <button type="button" className="text-button" onClick={() => { setMode("LOGIN"); setMessage(""); }}>Voltar para entrar</button>
          </form>
        )}

        {mode === "REGISTER" && (
          <form className="auth-form" onSubmit={register}>
            <div><span className="eyebrow">PRIMEIRO ACESSO</span><h2>Cadastro inicial</h2><p>Disponível para alunos com 18 anos ou mais. Menores devem ser cadastrados pelo responsável ou recepção.</p></div>
            <label className="field required"><span>Nome completo</span><input className="uppercase-input" name="fullName" autoComplete="name" minLength={3} required onInput={uppercaseInput} /></label>
            <label className="field required"><span>Data de nascimento</span><input className="date-input" name="birthDate" type="date" required onClick={(event) => event.currentTarget.showPicker?.()} /></label>
            <label className="field required"><span>E-mail</span><input name="email" type="email" autoComplete="email" required /></label>
            <div className="form-grid">
              <label className="field required"><span>Senha</span><input name="password" type="password" minLength={8} autoComplete="new-password" required /></label>
              <label className="field required"><span>Confirmar senha</span><input name="confirmation" type="password" minLength={8} autoComplete="new-password" required /></label>
            </div>
            {message && <div className="form-message" role="status">{message}</div>}
            <button className="primary auth-submit" disabled={busy}>{busy ? "Criando…" : "Criar acesso"}</button>
            <button type="button" className="text-button" onClick={() => { setMode("LOGIN"); setMessage(""); }}>Já tenho cadastro</button>
          </form>
        )}
      </section>
    </main>
  );
}

function AdminHome({ navigate }: { navigate: (page: AdminPage) => void }) {
  const [peopleCount, setPeopleCount] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => watchPeople((people) => setPeopleCount(people.length), setError), []);
  return (
    <section className="page-stack">
      <div className="page-heading"><div><span className="eyebrow">VISÃO GERAL</span><h2>Operação da academia</h2><p>Indicadores atualizados a partir do Firebase.</p></div></div>
      {error && <div className="form-message error">{error}</div>}
      <div className="dashboard-grid">
        <button className="dashboard-card" onClick={() => navigate("people")}><span>Pessoas cadastradas</span><strong>{peopleCount}</strong><small>Ver alunos e responsáveis →</small></button>
        <button className="dashboard-card" onClick={() => navigate("finance")}><span>Pagamentos pendentes</span><strong>0</strong><small>Abrir financeiro →</small></button>
        <button className="dashboard-card" onClick={() => navigate("attendance")}><span>Presentes hoje</span><strong>0</strong><small>Consultar frequência →</small></button>
        <button className="dashboard-card" onClick={() => navigate("calendar")}><span>Eventos próximos</span><strong>0</strong><small>Abrir calendário →</small></button>
      </div>
      <div className="card getting-started"><div><span className="eyebrow">COMECE POR AQUI</span><h3>Cadastre os primeiros alunos</h3><p>O novo fluxo grava pessoas, perfis, matrículas e auditoria diretamente no Firestore com controle de administrador.</p></div><button className="primary page-action" onClick={() => navigate("people")}>Abrir Pessoas</button></div>
      <div className="card portal-link-card"><div><h3>Portal do Aluno</h3><p>Compartilhe este endereço para login, recuperação de senha e cadastro inicial de maiores de 18 anos.</p></div><code>{window.location.origin}/?portal=aluno</code></div>
    </section>
  );
}

function ModulePlaceholder({ title, description }: { title: string; description: string }) {
  return <section className="card module-page"><span className="eyebrow">MÓDULO</span><h2>{title}</h2><div className="empty-state"><strong>Estrutura preparada</strong><p>{description}</p></div></section>;
}

function AdminApp({ user, session }: { user: User; session: SessionProfile }) {
  const [page, setPage] = useState<AdminPage>("home");
  const nav: Array<[AdminPage, string]> = [
    ["home", "Visão geral"], ["people", "Pessoas"], ["finance", "Financeiro"],
    ["attendance", "Frequência"], ["calendar", "Calendário"], ["account", "Minha conta"],
  ];
  return (
    <div className="app-shell-v2">
      <aside className="sidebar-v2">
        <div className="brand"><div className="brand-mark">F4</div><div><strong>Academia Fit 4</strong><span>Painel administrativo</span></div></div>
        <nav>{nav.map(([key, label]) => <button key={key} className={page === key ? "active" : ""} onClick={() => setPage(key)}>{label}</button>)}</nav>
        <div className="sidebar-note"><strong>{session.kind === "ADMIN" ? "Administrador" : "Recepção"}</strong><span>{user.email}</span></div>
      </aside>
      <main className="main-v2">
        <header className="topbar-v2">
          <div><span className="eyebrow">AMBIENTE OPERACIONAL</span><h1>{nav.find(([key]) => key === page)?.[1]}</h1></div>
          <div className="top-actions-v2"><span className="status-pill online">Firebase conectado</span><button className="secondary" onClick={() => auth && void signOut(auth)}>Sair</button></div>
        </header>
        <div className="mobile-admin-nav">{nav.map(([key, label]) => <button key={key} className={page === key ? "active" : ""} onClick={() => setPage(key)}>{label}</button>)}</div>
        <section className="content-v2">
          {page === "home" && <AdminHome navigate={setPage} />}
          {page === "people" && <PeoplePanel />}
          {page === "finance" && <ModulePlaceholder title="Financeiro" description="Planos, ciclos de 30 dias, pagamentos e comprovantes serão ativados depois dos primeiros cadastros e da configuração do gateway PIX." />}
          {page === "attendance" && <ModulePlaceholder title="Frequência" description="A presença diária e os acessos da catraca aparecerão aqui quando houver alunos e eventos de entrada." />}
          {page === "calendar" && <ModulePlaceholder title="Calendário da academia" description="Feriados, recessos, OpenMat e eventos especiais serão gerenciados nesta área." />}
          {page === "account" && <AccountPanel user={user} />}
        </section>
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<SessionProfile | null>(null);
  const [authReady, setAuthReady] = useState(!firebaseConfigured);
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setSession(null);
      setSessionError("");
      if (!nextUser) {
        setAuthReady(true);
        return;
      }
      void loadSessionProfile(nextUser)
        .then(setSession)
        .catch((error) => setSessionError(friendlyAuthError(error)))
        .finally(() => setAuthReady(true));
    });
  }, []);

  if (!authReady || (user && !session && !sessionError)) return <div className="loading">Carregando ambiente seguro…</div>;
  if (!firebaseConfigured || !user) return <Login />;
  if (sessionError) return <div className="empty-state card"><h2>Não foi possível carregar a conta</h2><p>{sessionError}</p><button className="secondary" onClick={() => auth && void signOut(auth)}>Sair</button></div>;
  if (!session) return null;
  if (session.kind === "STUDENT" || session.kind === "UNLINKED") {
    return <StudentPortal user={user} session={session} />;
  }
  return <AdminApp user={user} session={session} />;
}
