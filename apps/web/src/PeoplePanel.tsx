import { useEffect, useMemo, useState } from "react";
import { PersonForm } from "./PersonForm";
import { watchPeople, type PersonRow } from "./services";

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export function PeoplePanel() {
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => watchPeople(setPeople, setMessage), []);
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    if (!term) return people;
    return people.filter((person) => `${person.fullName} ${person.cpfFormatted || ""} ${person.email || ""}`.toLocaleLowerCase("pt-BR").includes(term));
  }, [people, query]);

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div><span className="eyebrow">GESTÃO DE PESSOAS</span><h2>Alunos e responsáveis</h2><p>{people.length} pessoa(s) cadastrada(s)</p></div>
        <button className="primary page-action" onClick={() => setShowForm((value) => !value)}>{showForm ? "Fechar cadastro" : "+ Novo aluno"}</button>
      </div>
      {showForm && <PersonForm enabled onCreated={() => setShowForm(false)} />}
      <div className="card table-card">
        <div className="table-toolbar">
          <label className="search-field"><span>Buscar pessoa</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome, CPF ou e-mail" /></label>
          <span className="table-count">{filtered.length} resultado(s)</span>
        </div>
        {message && <div className="form-message error">{message}</div>}
        <div className="responsive-table">
          <table>
            <thead><tr><th>Pessoa</th><th>Papéis</th><th>Situação</th><th>CPF</th></tr></thead>
            <tbody>
              {filtered.map((person) => (
                <tr key={person.personId}>
                  <td><div className="person-cell"><span className="mini-avatar">{initials(person.fullName)}</span><div><strong>{person.fullName}</strong><small>{person.email || person.personId}</small></div></div></td>
                  <td>{person.roles?.join(" + ") || "—"}</td>
                  <td><span className={`status-pill ${person.status === "ATIVA" ? "online" : "setup"}`}>{person.status || "—"}</span></td>
                  <td>{person.cpfFormatted || "Sem CPF"}</td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={4}><div className="empty-state"><strong>Nenhuma pessoa encontrada</strong><p>Use “Novo aluno” para iniciar o primeiro cadastro.</p></div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
