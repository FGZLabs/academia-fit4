import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { useEffect, useState, type FormEvent } from "react";
import { auth, firebaseConfigured } from "./firebase";
import { PersonForm } from "./PersonForm";

const modules = [
  ["Pessoa + CPF", "Implementado", "Transação backend"],
  ["Responsáveis", "Implementado", "Vínculo sem duplicação"],
  ["Financeiro", "Implementado", "30 dias + idempotência"],
  ["Frequência", "Implementado", "Presença diária única"],
  ["PIX", "Adapter", "Aguardando gateway"],
  ["WhatsApp", "Adapter", "Aguardando provedor"],
  ["Topdata", "Simulador", "Aguardando SDK/hardware"],
];

function Login() {
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth) return setMessage("Firebase ainda não foi configurado.");
    const data = new FormData(event.currentTarget);
    try {
      await signInWithEmailAndPassword(auth, String(data.get("email")), String(data.get("password")));
    } catch {
      setMessage("Não foi possível autenticar. Verifique as credenciais e o ambiente.");
    }
  }
  return (
    <main className="login-page">
      <form className="card login-card" onSubmit={submit}>
        <div className="brand-mark">F4</div>
        <h1>Academia Fit 4</h1>
        <p>Ambiente administrativo V2</p>
        <label className="field"><span>E-mail</span><input name="email" type="email" required /></label>
        <label className="field"><span>Senha</span><input name="password" type="password" required /></label>
        {message && <div className="form-message">{message}</div>}
        <button className="primary action">Entrar</button>
      </form>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!firebaseConfigured);
  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
  }, []);

  if (!authReady) return <div className="loading">Carregando ambiente seguro…</div>;
  if (firebaseConfigured && !user) return <Login />;

  return (
    <div className="app-shell-v2">
      <aside className="sidebar-v2">
        <div className="brand"><div className="brand-mark">F4</div><div><strong>Academia Fit 4</strong><span>V2 Firebase</span></div></div>
        <nav>
          <button className="active">Visão geral</button>
          <button>Pessoas</button>
          <button>Financeiro</button>
          <button>Frequência</button>
          <button>Calendário</button>
          <button>Auditoria</button>
        </nav>
        <div className="sidebar-note">Integrações externas em modo adapter</div>
      </aside>
      <main className="main-v2">
        <header className="topbar-v2">
          <div><span className="eyebrow">FUNDAÇÃO OPERACIONAL</span><h1>V2-Firebase</h1></div>
          <div className="top-actions-v2">
            <span className={`status-pill ${firebaseConfigured ? "online" : "setup"}`}>{firebaseConfigured ? "Firebase configurado" : "Configuração pendente"}</span>
            {user && auth && <button className="secondary" onClick={() => { if (auth) void signOut(auth); }}>Sair</button>}
          </div>
        </header>
        <section className="content-v2">
          {!firebaseConfigured && (
            <div className="setup-banner">
              <strong>Modo de preparação</strong>
              <span>Preencha <code>apps/web/.env.local</code> e use os emuladores para habilitar autenticação e gravação.</span>
            </div>
          )}
          <div className="module-grid">
            {modules.map(([name, status, detail]) => (
              <article className="module-card" key={name}><span>{status}</span><strong>{name}</strong><small>{detail}</small></article>
            ))}
          </div>
          <PersonForm enabled={firebaseConfigured && Boolean(user)} />
        </section>
      </main>
    </div>
  );
}
