const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const STORE = 'academia_fit4_v1';

const BELTS = ['Branca','Cinza','Amarela','Laranja','Verde','Azul','Roxa','Marrom','Preta'];
const PROFESSORS = ['Marcelo Matos','Tácio Marcos'];
const ROLE_VIEWS = {
  admin: ['dashboard','alunos','planos','mensalidades','pagamentos','acessos','presencas','notificacoes','aluno','config'],
  recepcao: ['dashboard','alunos','mensalidades','pagamentos','acessos','presencas','notificacoes'],
  aluno: ['aluno']
};

const todayISO = () => new Date().toISOString().slice(0,10);
const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
const money = v => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const dateBR = s => s ? new Date(`${s}T12:00:00`).toLocaleDateString('pt-BR') : '—';
const uid = () => Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-4);
const initials = n => (n || '?').trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
const daysDiff = (a,b) => Math.round((new Date(a+'T12:00:00') - new Date(b+'T12:00:00')) / 86400000);
const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function seed(){
  const m = monthKey();
  const y = Number(m.slice(0,4)), mo = Number(m.slice(5));
  const mkDate = day => `${y}-${String(mo).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  return {
    settings:{
      gymName:'Academia Fit 4', tolerance:2, fit4Ip:'192.168.0.120', f4Ip:'192.168.0.121', accessMode:'simulado',
      whatsappMode:'simulado', whatsappEnabled:true
    },
    session:{role:'admin'},
    plans:[
      {id:'p1',name:'Mensal',price:120,days:30,status:'Ativo'},
      {id:'p2',name:'Trimestral',price:320,days:90,status:'Ativo'},
      {id:'p3',name:'Semestral',price:590,days:180,status:'Ativo'}
    ],
    students:[
      {id:'s1',name:'Ana Souza',cpf:'123.456.789-10',phone:'(95) 99111-1111',birthDate:'1998-05-12',belt:'Azul',lastGraduation:'2026-03-18',professor:'Marcelo Matos',planId:'p1',dueDay:10,topdataId:'1001',status:'Ativo',created:mkDate(2)},
      {id:'s2',name:'Carlos Lima',cpf:'234.567.890-11',phone:'(95) 99222-2222',birthDate:'1993-11-21',belt:'Branca',lastGraduation:'2025-12-05',professor:'Tácio Marcos',planId:'p1',dueDay:14,topdataId:'1002',status:'Ativo',created:mkDate(3)},
      {id:'s3',name:'Marina Alves',cpf:'345.678.901-22',phone:'(95) 99333-3333',birthDate:'2001-02-03',belt:'Roxa',lastGraduation:'2026-06-10',professor:'Marcelo Matos',planId:'p2',dueDay:20,topdataId:'1003',status:'Ativo',created:mkDate(4)}
    ],
    invoices:[
      {id:'i1',studentId:'s1',month:m,due:mkDate(10),amount:120,status:'Pago',paidAt:mkDate(9),method:'PIX'},
      {id:'i2',studentId:'s2',month:m,due:mkDate(14),amount:120,status:'Pendente',paidAt:null,method:null},
      {id:'i3',studentId:'s3',month:m,due:mkDate(20),amount:320,status:'Pendente',paidAt:null,method:null}
    ],
    payments:[{id:'pay1',invoiceId:'i1',studentId:'s1',date:mkDate(9),amount:120,method:'PIX',ref:'PIX-DEMO-001'}],
    accessLogs:[],
    presence:[],
    notificationLog:[]
  };
}

function load(){
  try { return JSON.parse(localStorage.getItem(STORE)) || seed(); }
  catch { return seed(); }
}

function migrateDb(raw){
  const base = seed();
  const out = raw && typeof raw === 'object' ? raw : base;
  out.settings = {...base.settings,...(out.settings||{})};
  out.session = {...base.session,...(out.session||{})};
  out.plans = Array.isArray(out.plans) ? out.plans : base.plans;
  out.students = Array.isArray(out.students) ? out.students : base.students;
  out.invoices = Array.isArray(out.invoices) ? out.invoices : [];
  out.payments = Array.isArray(out.payments) ? out.payments : [];
  out.accessLogs = Array.isArray(out.accessLogs) ? out.accessLogs : [];
  out.presence = Array.isArray(out.presence) ? out.presence : [];
  out.notificationLog = Array.isArray(out.notificationLog) ? out.notificationLog : [];
  out.students.forEach((s,idx)=>{
    s.birthDate = s.birthDate || '';
    s.belt = BELTS.includes(s.belt) ? s.belt : 'Branca';
    s.lastGraduation = s.lastGraduation || '';
    s.professor = PROFESSORS.includes(s.professor) ? s.professor : PROFESSORS[idx % PROFESSORS.length];
  });
  if(!ROLE_VIEWS[out.session.role]) out.session.role = 'admin';
  return out;
}

let db = migrateDb(load());
let portalSession = {authenticated:false,studentId:null};
let calendarState = {studentId:null,month:monthKey()};

function save(){ localStorage.setItem(STORE,JSON.stringify(db)); updateBrand(); }
function reset(){ db = seed(); portalSession={authenticated:false,studentId:null}; save(); renderAll(); applyRoleAccess(); toast('Dados de demonstração restaurados.'); }
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2200); }
function planById(id){ return db.plans.find(x=>x.id===id); }
function studentById(id){ return db.students.find(x=>x.id===id); }
function invoiceFor(studentId,m=monthKey()){ return db.invoices.find(x=>x.studentId===studentId && x.month===m); }
function lastPayment(studentId){ return [...db.payments].filter(p=>p.studentId===studentId).sort((a,b)=>b.date.localeCompare(a.date))[0] || null; }

function currentStatus(student){
  if(!student || student.status!=='Ativo') return {ok:false,label:'Bloqueado',reason:'Cadastro inativo'};
  const inv=invoiceFor(student.id);
  if(!inv) return {ok:false,label:'Sem mensalidade',reason:'Mensalidade do mês não encontrada'};
  if(inv.status==='Pago') return {ok:true,label:'Liberado',reason:'Mensalidade regular'};
  const late=daysDiff(todayISO(),inv.due);
  if(late<=0) return {ok:true,label:'Liberado',reason:`Mensalidade com vencimento em ${dateBR(inv.due)}`};
  if(late<=db.settings.tolerance) return {ok:true,label:'Tolerância',reason:`Dentro da tolerância de ${db.settings.tolerance} dia(s)`};
  return {ok:false,label:'Vencido',reason:`Mensalidade vencida há ${late} dia(s)`};
}

function ensureInvoices(){
  const m=monthKey(), y=Number(m.slice(0,4)), mo=Number(m.slice(5));
  db.students.filter(s=>s.status==='Ativo').forEach(s=>{
    if(!invoiceFor(s.id,m)){
      const p=planById(s.planId); if(!p) return;
      const maxDay=new Date(y,mo,0).getDate(), day=Math.min(s.dueDay||10,maxDay);
      db.invoices.push({id:uid(),studentId:s.id,month:m,due:`${y}-${String(mo).padStart(2,'0')}-${String(day).padStart(2,'0')}`,amount:p.price,status:'Pendente',paidAt:null,method:null});
    }
  });
  save();
}

function addDays(dateStr,days){
  if(!dateStr) return '';
  const d=new Date(`${dateStr}T12:00:00`); d.setDate(d.getDate()+Number(days||30)); return d.toISOString().slice(0,10);
}
function nextDueDate(invoice){
  const s=studentById(invoice.studentId), p=planById(s?.planId);
  return addDays(invoice.due,p?.days||30);
}

const viewMeta={
  dashboard:['Dashboard','Visão geral da operação'], alunos:['Alunos','Cadastros, graduação, professor e ID Topdata'], planos:['Planos','Valores e modalidades'],
  mensalidades:['Mensalidades','Cobranças e próximos vencimentos'], pagamentos:['Pagamentos','Recebimentos e PIX simulado'], acessos:['Controle de acesso','Simulação Fit 4 + Facial F4'],
  presencas:['Presenças','Registro mensal e calendário de frequência'], notificacoes:['Notificações','Agenda automática de vencimento no WhatsApp'], aluno:['Portal do aluno','Acesso por leitura facial F4'], config:['Configurações','Parâmetros da academia e Topdata']
};

function roleLabel(role){ return role==='admin'?'Administrador':role==='recepcao'?'Recepção':'Aluno'; }
function allowedViews(){ return ROLE_VIEWS[db.session.role] || ROLE_VIEWS.admin; }
function applyRoleAccess(){
  $$('.nav-btn').forEach(b=>{ b.hidden=!allowedViews().includes(b.dataset.view); });
  const rs=$('#roleSelect'); if(rs) rs.value=db.session.role;
  const rb=$('#roleBadge'); if(rb) rb.textContent=roleLabel(db.session.role);
  const quick=$('#quickStudentBtn'); if(quick) quick.hidden=!allowedViews().includes('alunos');
}
function changeRole(role){
  if(!ROLE_VIEWS[role]) return;
  db.session.role=role; portalSession={authenticated:false,studentId:null}; save(); applyRoleAccess();
  setView(role==='aluno'?'aluno':'dashboard');
  toast(`Perfil alterado para ${roleLabel(role)}.`);
}

function setView(v){
  if(!allowedViews().includes(v)) v=allowedViews()[0];
  $$('.view').forEach(x=>x.classList.remove('active')); $('#view-'+v)?.classList.add('active');
  $$('.nav-btn').forEach(x=>x.classList.toggle('active',x.dataset.view===v));
  $('#pageTitle').textContent=viewMeta[v][0]; $('#pageSubtitle').textContent=viewMeta[v][1];
  $('#sidebar').classList.remove('open'); render(v);
}

function updateBrand(){ const n=db.settings.gymName||'Academia Fit 4'; $('#brandName').textContent=n; document.title=`${n} — Gestão e Acesso`; }
function render(which){
  ensureInvoices();
  const fn={dashboard:renderDashboard,alunos:renderStudents,planos:renderPlans,mensalidades:renderInvoices,pagamentos:renderPayments,acessos:renderAccess,presencas:renderPresence,notificacoes:renderNotifications,aluno:renderStudentArea,config:renderConfig}[which];
  fn&&fn();
}
function renderAll(){ Object.keys(viewMeta).forEach(render); updateBrand(); }

function metric(label,value,foot){ return `<div class="card metric"><div class="label">${label}</div><div class="value">${value}</div><div class="foot">${foot}</div></div>`; }
function invoicePill(i){ const late=daysDiff(todayISO(),i.due); if(i.status==='Pago')return '<span class="pill ok">PAGO</span>'; if(late>db.settings.tolerance)return '<span class="pill bad">VENCIDO</span>'; if(late>0)return '<span class="pill warn">TOLERÂNCIA</span>'; return '<span class="pill neutral">PENDENTE</span>'; }

function renderDashboard(){
  const active=db.students.filter(s=>s.status==='Ativo').length;
  const overdue=db.students.filter(s=>!currentStatus(s).ok).length;
  const m=monthKey();
  const revenue=db.payments.filter(p=>p.date.startsWith(m)).reduce((a,b)=>a+Number(b.amount),0);
  const todayAccess=db.presence.filter(p=>p.date===todayISO()).length;
  const due=db.invoices.filter(i=>i.month===m&&i.status!=='Pago').sort((a,b)=>a.due.localeCompare(b.due));
  const recent=[...db.accessLogs].sort((a,b)=>b.ts.localeCompare(a.ts)).slice(0,6);
  $('#view-dashboard').innerHTML=`
    <div class="grid cards">
      ${metric('Alunos ativos',active,'Cadastros com status ativo')}
      ${metric('Atenção / bloqueados',overdue,'Mensalidade ou cadastro')}
      ${metric('Recebido no mês',money(revenue),'Pagamentos registrados')}
      ${metric('Acessos hoje',todayAccess,'Passagens liberadas')}
    </div>
    <div style="height:18px"></div>
    <div class="grid two">
      <div class="card"><div class="section-head"><h3>Próximos vencimentos</h3><span class="spacer"></span><button class="btn small" onclick="setView('mensalidades')">Ver mensalidades</button></div>
      ${due.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Aluno</th><th>Vencimento</th><th>Valor</th><th>Situação</th></tr></thead><tbody>${due.slice(0,8).map(i=>`<tr><td>${esc(studentById(i.studentId)?.name||'—')}</td><td>${dateBR(i.due)}</td><td class="money">${money(i.amount)}</td><td>${invoicePill(i)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Nenhuma mensalidade pendente.</div>'}</div>
      <div class="card"><div class="section-head"><h3>Últimas leituras</h3></div>${recent.length?`<div class="list">${recent.map(a=>`<div class="list-item"><div class="meta"><strong>${esc(a.studentName)}</strong><small>${new Date(a.ts).toLocaleString('pt-BR')} · ${esc(a.reason)}</small></div><span class="pill ${a.allowed?'ok':'bad'}">${a.allowed?'LIBERADO':'NEGADO'}</span></div>`).join('')}</div>`:'<div class="empty">Nenhuma leitura simulada ainda.</div>'}</div>
    </div>`;
}

function renderStudents(){
  $('#view-alunos').innerHTML=`<div class="card">
    <div class="section-head"><h3>Alunos cadastrados</h3><span class="spacer"></span><button class="btn primary" onclick="openStudentModal()">+ Novo aluno</button></div>
    <div class="filters"><div class="field"><input id="studentSearch" placeholder="Buscar por nome, CPF, professor ou ID Topdata" oninput="filterStudents()"></div></div>
    <div class="table-wrap"><table class="table"><thead><tr><th>Aluno</th><th>Plano</th><th>Graduação atual</th><th>Professor responsável</th><th>ID Topdata</th><th>Acesso</th><th></th></tr></thead><tbody id="studentsTbody">${studentRows(db.students)}</tbody></table></div>
  </div>`;
}
function studentRows(list){
  return list.map(s=>{const st=currentStatus(s);return `<tr><td><strong>${esc(s.name)}</strong><div class="muted">${esc(s.phone||'')}</div></td><td>${esc(planById(s.planId)?.name||'—')}</td><td><span class="belt-chip">${esc(s.belt||'Branca')}</span></td><td>${esc(s.professor||'—')}</td><td>${esc(s.topdataId||'—')}</td><td><span class="pill ${st.ok?'ok':'bad'}">${st.label.toUpperCase()}</span></td><td><button class="btn small" onclick="openStudentModal('${s.id}')">Editar</button></td></tr>`}).join('') || '<tr><td colspan="7" class="empty">Nenhum aluno.</td></tr>';
}
function filterStudents(){ const q=$('#studentSearch').value.toLowerCase(); $('#studentsTbody').innerHTML=studentRows(db.students.filter(s=>`${s.name} ${s.cpf} ${s.topdataId} ${s.professor} ${s.belt}`.toLowerCase().includes(q))); }

function renderPlans(){
  $('#view-planos').innerHTML=`<div class="card"><div class="section-head"><h3>Planos</h3><span class="spacer"></span><button class="btn primary" onclick="openPlanModal()">+ Novo plano</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Plano</th><th>Valor</th><th>Duração</th><th>Status</th><th></th></tr></thead><tbody>${db.plans.map(p=>`<tr><td><strong>${esc(p.name)}</strong></td><td class="money">${money(p.price)}</td><td>${p.days} dias</td><td><span class="pill ${p.status==='Ativo'?'ok':'neutral'}">${p.status.toUpperCase()}</span></td><td><button class="btn small" onclick="openPlanModal('${p.id}')">Editar</button></td></tr>`).join('')}</tbody></table></div></div>`;
}

function renderInvoices(){
  const m=monthKey(); const rows=db.invoices.filter(i=>i.month===m).sort((a,b)=>a.due.localeCompare(b.due));
  $('#view-mensalidades').innerHTML=`<div class="card"><div class="section-head"><h3>Mensalidades de ${new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</h3><span class="spacer"></span><button class="btn" onclick="ensureInvoices();renderInvoices();toast('Mensalidades atualizadas.')">Gerar/atualizar</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Aluno</th><th>Vencimento atual</th><th>Próximo vencimento</th><th>Valor</th><th>Status</th><th>Ação</th></tr></thead><tbody>${rows.map(i=>`<tr><td>${esc(studentById(i.studentId)?.name||'—')}</td><td>${dateBR(i.due)}</td><td><strong>${dateBR(nextDueDate(i))}</strong></td><td class="money">${money(i.amount)}</td><td>${invoicePill(i)}</td><td>${i.status==='Pago'?'<span class="muted">Pago em '+dateBR(i.paidAt)+'</span>':`<button class="btn small primary" onclick="payInvoice('${i.id}','PIX')">Registrar PIX</button>`}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">Nenhuma mensalidade.</td></tr>'}</tbody></table></div></div>`;
}

function renderPayments(){
  const rows=[...db.payments].sort((a,b)=>b.date.localeCompare(a.date));
  $('#view-pagamentos').innerHTML=`<div class="grid two"><div class="card"><div class="section-head"><h3>Pagamentos registrados</h3></div><div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Aluno</th><th>Forma</th><th>Valor</th><th>Referência</th></tr></thead><tbody>${rows.map(p=>`<tr><td>${dateBR(p.date)}</td><td>${esc(studentById(p.studentId)?.name||'—')}</td><td>${esc(p.method)}</td><td class="money">${money(p.amount)}</td><td>${esc(p.ref)}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">Nenhum pagamento.</td></tr>'}</tbody></table></div></div>
  <div class="card"><div class="section-head"><h3>PIX no smartphone — demonstração</h3></div><p class="muted">Na Ajustes-V1 o pagamento continua simulado. A estrutura valida o fluxo antes da conexão com um gateway.</p><div class="divider"></div><div class="code">1. Aluno autentica por face\n2. Portal mostra mensalidade\n3. Gerar PIX\n4. Gateway confirma via webhook\n5. Mensalidade = PAGA\n6. Fit 4 recebe autorização</div></div></div>`;
}
function payInvoice(id,method='PIX'){ const i=db.invoices.find(x=>x.id===id); if(!i||i.status==='Pago')return; i.status='Pago'; i.paidAt=todayISO(); i.method=method; db.payments.push({id:uid(),invoiceId:i.id,studentId:i.studentId,date:todayISO(),amount:i.amount,method,ref:`${method}-DEMO-${Math.random().toString(36).slice(2,8).toUpperCase()}`}); save(); processWhatsAppAutomation(); renderAll(); toast('Pagamento registrado e acesso atualizado.'); }

function renderAccess(){
  const opts=db.students.map(s=>`<option value="${s.id}">${esc(s.name)} · ID ${esc(s.topdataId||'—')}</option>`).join('');
  $('#view-acessos').innerHTML=`<div class="grid two"><div class="card"><div class="section-head"><h3>Simulador de leitura F4</h3></div><div class="access-box"><div class="field"><label>Aluno reconhecido</label><select id="accessStudent">${opts}</select></div><button class="btn primary" onclick="simulateAccess()">Simular reconhecimento facial</button><div class="inline-note">Modo atual: <strong>simulado</strong>. O ID Topdata usado aqui é o mesmo identificador previsto para autenticar o aluno no portal.</div><div id="accessResult"></div></div></div>
  <div class="card"><div class="section-head"><h3>Parâmetros de decisão</h3></div><div class="kpi-list"><div class="kpi-row"><span>Cadastro do aluno</span><strong>Ativo</strong></div><div class="kpi-row"><span>Mensalidade</span><strong>Pago / tolerância</strong></div><div class="kpi-row"><span>Tolerância</span><strong>${db.settings.tolerance} dia(s)</strong></div><div class="kpi-row"><span>Fit 4</span><strong>${esc(db.settings.fit4Ip)}</strong></div><div class="kpi-row"><span>Facial F4</span><strong>${esc(db.settings.f4Ip)}</strong></div></div></div></div>`;
}
function simulateAccess(){
  const s=studentById($('#accessStudent').value); if(!s)return; const st=currentStatus(s),ts=new Date().toISOString();
  db.accessLogs.push({id:uid(),studentId:s.id,studentName:s.name,topdataId:s.topdataId,allowed:st.ok,reason:st.reason,ts});
  if(st.ok) db.presence.push({id:uid(),studentId:s.id,date:todayISO(),time:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),direction:'Entrada',source:'Fit 4 (simulado)'});
  save();
  $('#accessResult').innerHTML=`<div class="access-result ${st.ok?'ok':'bad'}"><h2>${st.ok?'ACESSO LIBERADO':'ACESSO NEGADO'}</h2><p><strong>${esc(s.name)}</strong> · ID Topdata ${esc(s.topdataId||'—')}<br>${esc(st.reason)}</p></div>`;
  renderDashboard(); renderPresence(); toast(st.ok?'Giro autorizado e presença registrada.':'Acesso bloqueado.');
}

function renderPresence(){
  const m=monthKey(); const rows=[...db.presence].filter(p=>p.date.startsWith(m)).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
  const counts={}; rows.forEach(p=>counts[p.studentId]=(counts[p.studentId]||0)+1); const top=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5);
  $('#view-presencas').innerHTML=`<div class="grid two"><div class="card"><div class="section-head"><h3>Registros do mês</h3><span class="spacer"></span><button class="btn" onclick="openFrequencyCalendar()">Visualizar frequência</button><button class="btn" onclick="exportPresenceCSV()">Exportar CSV</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Hora</th><th>Aluno</th><th>Sentido</th><th>Origem</th></tr></thead><tbody>${rows.map(p=>`<tr><td>${dateBR(p.date)}</td><td>${esc(p.time)}</td><td>${esc(studentById(p.studentId)?.name||'—')}</td><td>${esc(p.direction)}</td><td>${esc(p.source)}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">Nenhuma presença registrada.</td></tr>'}</tbody></table></div></div><div class="card"><div class="section-head"><h3>Frequência no mês</h3></div>${top.length?`<div class="list">${top.map(([id,c])=>`<div class="list-item"><div class="meta"><strong>${esc(studentById(id)?.name||'—')}</strong><small>${c} acesso(s)</small></div><div style="width:42%"><div class="bar"><span style="width:${Math.min(100,c/Math.max(...top.map(x=>x[1]))*100)}%"></span></div></div></div>`).join('')}</div>`:'<div class="empty">Sem dados para ranking.</div>'}</div></div>`;
}
function exportPresenceCSV(){ const rows=[['Data','Hora','Aluno','Direcao','Origem'],...db.presence.map(p=>[p.date,p.time,studentById(p.studentId)?.name||'',p.direction,p.source])]; const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(';')).join('\n'); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv'})); a.download=`presencas-${monthKey()}.csv`; a.click(); URL.revokeObjectURL(a.href); }

function openFrequencyCalendar(studentId){
  calendarState.studentId=studentId||calendarState.studentId||db.students[0]?.id||null; calendarState.month=calendarState.month||monthKey();
  openModal('Visualizar frequência','P = Presente. F = Falta/sem registro de entrada em um dia já transcorrido.',`<div id="frequencyCalendar"></div>`); drawFrequencyCalendar();
}
function shiftCalendarMonth(delta){ const [y,m]=calendarState.month.split('-').map(Number); const d=new Date(y,m-1+delta,1); calendarState.month=monthKey(d); drawFrequencyCalendar(); }
function changeCalendarStudent(id){ calendarState.studentId=id; drawFrequencyCalendar(); }
function drawFrequencyCalendar(){
  const host=$('#frequencyCalendar'); if(!host)return;
  const s=studentById(calendarState.studentId)||db.students[0]; if(!s){host.innerHTML='<div class="empty">Nenhum aluno cadastrado.</div>';return;}
  calendarState.studentId=s.id;
  const [y,m]=calendarState.month.split('-').map(Number), first=new Date(y,m-1,1), days=new Date(y,m,0).getDate(), offset=first.getDay();
  const label=first.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  const presenceDates=new Set(db.presence.filter(p=>p.studentId===s.id&&p.date.startsWith(calendarState.month)).map(p=>p.date));
  const today=todayISO(); let cells='';
  for(let i=0;i<offset;i++) cells+='<div class="calendar-day empty-day"></div>';
  let pCount=0,fCount=0;
  for(let day=1;day<=days;day++){
    const ds=`${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const present=presenceDates.has(ds), pastOrToday=ds<=today;
    let mark='',cls=''; if(present){mark='P';cls='present';pCount++;} else if(pastOrToday){mark='F';cls='absent';fCount++;}
    cells+=`<button class="calendar-day ${cls}" onclick="showCalendarDay('${ds}')"><span class="day-number">${day}</span>${mark?`<strong>${mark}</strong>`:''}</button>`;
  }
  host.innerHTML=`<div class="calendar-toolbar"><div class="field"><label>Aluno</label><select onchange="changeCalendarStudent(this.value)">${db.students.map(x=>`<option value="${x.id}" ${x.id===s.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></div><div class="month-nav"><button class="btn small" onclick="shiftCalendarMonth(-1)">‹</button><strong>${label}</strong><button class="btn small" onclick="shiftCalendarMonth(1)">›</button></div></div>
    <div class="calendar-summary"><span class="pill ok">${pCount} presente(s)</span><span class="pill bad">${fCount} falta(s)</span><span class="muted">F nesta V1 significa dia transcorrido sem registro de entrada.</span></div>
    <div class="calendar-weekdays">${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(x=>`<span>${x}</span>`).join('')}</div><div class="calendar-grid">${cells}</div><div id="calendarDayDetail" class="inline-note">Clique em um dia para ver os registros.</div>`;
}
function showCalendarDay(date){ const s=studentById(calendarState.studentId); const rows=db.presence.filter(p=>p.studentId===s?.id&&p.date===date); const el=$('#calendarDayDetail'); if(!el)return; el.innerHTML=rows.length?`<strong>${dateBR(date)} · Presente</strong><br>${rows.map(r=>`${esc(r.time)} — ${esc(r.direction)} (${esc(r.source)})`).join('<br>')}`:`<strong>${dateBR(date)} · Sem presença registrada</strong>`; }

function notificationItems(){
  const t=todayISO();
  return db.invoices.filter(i=>i.status!=='Pago').map(i=>{
    const s=studentById(i.studentId), d=daysDiff(i.due,t); let type,msg,key;
    if(d===1){ type='1 dia antes'; key='D-1'; msg=`Olá, ${s?.name||''}! Sua mensalidade vence amanhã, ${dateBR(i.due)}, no valor de ${money(i.amount)}. Se já realizou o pagamento, desconsidere esta mensagem.`; }
    else if(d===0){ type='Vence hoje'; key='D0'; msg=`Olá, ${s?.name||''}! Sua mensalidade vence hoje (${dateBR(i.due)}), no valor de ${money(i.amount)}. Regularize pelo portal para manter seu acesso normalmente.`; }
    else if(d===-1){ type='1 dia após'; key='D+1'; msg=`Olá, ${s?.name||''}! Sua mensalidade venceu ontem (${dateBR(i.due)}) e ainda consta como pendente. O valor é ${money(i.amount)}. Você pode regularizar pelo portal do aluno.`; }
    else if(d===-2){ type='2 dias após'; key='D+2'; msg=`Olá, ${s?.name||''}! Sua mensalidade está vencida há 2 dias. Para evitar bloqueio de acesso após o período de tolerância, regularize o valor de ${money(i.amount)} pelo portal do aluno.`; }
    else return null;
    return {invoice:i,student:s,type,msg,key};
  }).filter(Boolean);
}
function notificationLogKey(x){ return `${x.invoice.id}|${x.key}|${todayISO()}`; }
function processWhatsAppAutomation(){
  if(!db.settings.whatsappEnabled) return;
  let changed=false;
  notificationItems().forEach(x=>{
    if(!x.student?.phone) return;
    const k=notificationLogKey(x); if(db.notificationLog.some(n=>n.key===k)) return;
    db.notificationLog.push({id:uid(),key:k,studentId:x.student.id,invoiceId:x.invoice.id,scheduledAt:new Date().toISOString(),type:x.type,message:x.msg,phone:x.student.phone,status:db.settings.whatsappMode==='simulado'?'SIMULADO — aguardando API':'AGENDADO'}); changed=true;
  });
  if(changed) save();
}
function whatsappUrl(phone,msg){ const digits=String(phone||'').replace(/\D/g,''); const n=digits.startsWith('55')?digits:`55${digits}`; return `https://wa.me/${n}?text=${encodeURIComponent(msg)}`; }
function openWhatsApp(phone,msg){ window.open(whatsappUrl(phone,msg),'_blank','noopener'); }
function renderNotifications(){
  processWhatsAppAutomation(); const items=notificationItems(); const recent=[...db.notificationLog].sort((a,b)=>b.scheduledAt.localeCompare(a.scheduledAt)).slice(0,12);
  $('#view-notificacoes').innerHTML=`<div class="grid two"><div class="card"><div class="section-head"><h3>Agenda automática de hoje</h3><span class="spacer"></span><span class="pill neutral">${items.length} evento(s)</span></div><div class="inline-note"><strong>Agenda definida:</strong> 1 dia antes, no vencimento, 1 dia depois e 2 dias depois — cada etapa possui uma mensagem própria. Nesta versão está em <strong>modo simulado</strong>: o navegador prepara e registra a rotina, mas o envio automático real exige backend + WhatsApp Business API/provedor.</div><div class="divider"></div>${items.length?`<div class="list">${items.map(x=>`<div class="list-item"><div class="meta"><strong>${esc(x.student?.name||'—')} · ${esc(x.type)}</strong><small>${esc(x.msg)}</small></div><div class="actions"><button class="btn small" onclick="openWhatsApp('${esc(x.student?.phone||'')}','${esc(x.msg).replaceAll('&#39;','\\&#39;')}')">Testar no WhatsApp</button></div></div>`).join('')}</div>`:'<div class="empty">Nenhum disparo previsto para hoje.</div>'}</div>
  <div class="card"><div class="section-head"><h3>Histórico da automação</h3></div>${recent.length?`<div class="list">${recent.map(n=>`<div class="list-item"><div class="meta"><strong>${esc(studentById(n.studentId)?.name||'—')} · ${esc(n.type)}</strong><small>${new Date(n.scheduledAt).toLocaleString('pt-BR')} · ${esc(n.phone)}</small></div><span class="pill warn">${esc(n.status)}</span></div>`).join('')}</div>`:'<div class="empty">Nenhuma rotina registrada ainda.</div>'}</div></div>`;
}
async function copyText(t){ try{ await navigator.clipboard.writeText(t); toast('Mensagem copiada.'); }catch{ toast('Não foi possível copiar automaticamente.'); } }

function renderStudentArea(){
  if(!portalSession.authenticated){
    const opts=db.students.map(s=>`<option value="${s.id}">${esc(s.name)} · ID ${esc(s.topdataId||'—')}</option>`).join('');
    $('#view-aluno').innerHTML=`<div class="portal-login"><div class="card portal-login-card"><div class="face-icon">◉</div><h2>Portal do aluno</h2><p class="muted">O acesso do aluno é vinculado à mesma identificação facial/ID Topdata utilizada no leitor F4 da catraca.</p><div class="field"><label>Simular rosto reconhecido</label><select id="portalStudentSelect">${opts}</select></div><button class="btn primary portal-btn" onclick="simulatePortalFaceLogin()">Simular leitura facial F4</button><div class="inline-note">Na Ajustes-V1 a leitura é simulada para teste. Na integração real, o portal receberá o identificador do F4 sem liberar acesso por senha.</div></div></div>`;
    return;
  }
  drawStudentArea();
}
function simulatePortalFaceLogin(){ const id=$('#portalStudentSelect')?.value; const s=studentById(id); if(!s)return; if(!s.topdataId){toast('Aluno sem ID Topdata cadastrado.');return;} portalSession={authenticated:true,studentId:s.id}; drawStudentArea(); toast('Leitura facial simulada: acesso ao portal liberado.'); }
function logoutStudentPortal(){ portalSession={authenticated:false,studentId:null}; renderStudentArea(); }
function drawStudentArea(){
  const s=studentById(portalSession.studentId); if(!s){portalSession={authenticated:false,studentId:null};renderStudentArea();return;}
  const inv=invoiceFor(s.id),st=currentStatus(s),freq=db.presence.filter(p=>p.studentId===s.id&&p.date.startsWith(monthKey())).length,pay=lastPayment(s.id);
  const portalDue=inv?(inv.status==='Pago'?nextDueDate(inv):inv.due):'';
  $('#view-aluno').innerHTML=`<div class="student-card portal-card"><div class="section-head"><span class="pill ok">FACE VALIDADA · ID ${esc(s.topdataId)}</span><span class="spacer"></span><button class="btn small" onclick="logoutStudentPortal()">Sair</button></div><div class="student-hero"><div class="avatar">${initials(s.name)}</div><div><h2>${esc(s.name)}</h2><p>${esc(planById(s.planId)?.name||'Sem plano')} · ${esc(st.label)}</p></div></div>
    <div class="portal-data-grid">
      <div class="info-box"><span>Data de nascimento</span><strong>${dateBR(s.birthDate)}</strong></div>
      <div class="info-box"><span>Faixa atual</span><strong>${esc(s.belt||'—')}</strong></div>
      <div class="info-box"><span>Última graduação</span><strong>${dateBR(s.lastGraduation)}</strong></div>
      <div class="info-box"><span>Professor</span><strong>${esc(s.professor||'—')}</strong></div>
      <div class="info-box"><span>Frequência no mês</span><strong>${freq} presença(s)</strong></div>
      <div class="info-box"><span>Próximo vencimento</span><strong>${portalDue?dateBR(portalDue):'—'}</strong></div>
      <div class="info-box"><span>Último valor pago</span><strong>${pay?money(pay.amount):'—'}</strong></div>
      <div class="info-box"><span>Dia do último pagamento</span><strong>${pay?dateBR(pay.date):'—'}</strong></div>
    </div>
    <div class="portal-actions"><button class="btn" onclick="openFrequencyCalendar('${s.id}')">Visualizar frequência</button>${inv&&inv.status!=='Pago'?`<button class="btn primary" onclick="payInvoice('${inv.id}','PIX')">Simular pagamento via PIX</button>`:'<span class="pill ok">MENSALIDADE REGULAR</span>'}</div></div>`;
}

function renderConfig(){
  $('#view-config').innerHTML=`<div class="grid two"><div class="card"><div class="section-head"><h3>Configurações gerais</h3></div><form id="settingsForm" onsubmit="saveSettings(event)"><div class="form-grid"><div class="field wide"><label>Nome da academia</label><input name="gymName" value="${esc(db.settings.gymName)}"></div><div class="field"><label>Tolerância após vencimento</label><input name="tolerance" type="number" min="0" value="${db.settings.tolerance}"></div><div class="field"><label>Modo de acesso</label><select name="accessMode"><option value="simulado" ${db.settings.accessMode==='simulado'?'selected':''}>Simulado</option><option value="gateway" ${db.settings.accessMode==='gateway'?'selected':''}>Gateway Topdata (futuro)</option></select></div><div class="field"><label>IP Fit 4</label><input name="fit4Ip" value="${esc(db.settings.fit4Ip)}"></div><div class="field"><label>IP Facial F4</label><input name="f4Ip" value="${esc(db.settings.f4Ip)}"></div><div class="field"><label>Automação WhatsApp</label><select name="whatsappEnabled"><option value="1" ${db.settings.whatsappEnabled?'selected':''}>Ativa</option><option value="0" ${!db.settings.whatsappEnabled?'selected':''}>Desativada</option></select></div></div><div class="divider"></div><button class="btn primary">Salvar configurações</button></form></div><div class="card"><div class="section-head"><h3>Níveis de acesso</h3></div><div class="kpi-list"><div class="kpi-row"><span>Administrador</span><strong>Acesso completo</strong></div><div class="kpi-row"><span>Recepção</span><strong>Operação / alunos / financeiro</strong></div><div class="kpi-row"><span>Aluno</span><strong>Somente seu portal após face</strong></div></div><div class="divider"></div><div class="inline-note">O seletor de perfil no topo é apenas para validação da V1. A autenticação definitiva de administrador/recepção será adicionada junto do backend.</div></div></div><div style="height:18px"></div><div class="grid two"><div class="card"><div class="section-head"><h3>Integração Topdata — próximo estágio</h3></div><div class="code">Fit 4 (TCP/IP)\n   ↓\nGateway Windows (.NET + EasyInner.dll)\n   ↓ HTTPS/WebSocket seguro\nSistema Web\n   ↓\nBanco de dados / pagamentos / relatórios</div></div><div class="card"><div class="section-head"><h3>WhatsApp — próximo estágio</h3></div><div class="code">Rotina diária no backend\n   ↓\nD-1 / D0 / D+1 / D+2\n   ↓\nWhatsApp Business API / provedor\n   ↓\nLog de entrega e erro</div></div></div><div style="height:18px"></div><div class="danger-zone"><strong>Ambiente de testes</strong><p class="muted">Os dados ainda ficam no navegador deste dispositivo (localStorage). Para testes reais entre PC + smartphone e automações contínuas, a próxima etapa é conectar o backend em nuvem.</p><button class="btn danger" onclick="reset()">Restaurar dados de demonstração</button></div>`;
}
function saveSettings(e){ e.preventDefault(); const f=new FormData(e.target); db.settings.gymName=f.get('gymName').trim()||'Academia Fit 4'; db.settings.tolerance=Number(f.get('tolerance')||0); db.settings.accessMode=f.get('accessMode'); db.settings.fit4Ip=f.get('fit4Ip').trim(); db.settings.f4Ip=f.get('f4Ip').trim(); db.settings.whatsappEnabled=f.get('whatsappEnabled')==='1'; save(); processWhatsAppAutomation(); renderAll(); toast('Configurações salvas.'); }

function formatCPF(value){
  const d=String(value||'').replace(/\D/g,'').slice(0,11);
  if(d.length<=3)return d; if(d.length<=6)return `${d.slice(0,3)}.${d.slice(3)}`; if(d.length<=9)return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`; return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}
function formatPhone(value){
  const d=String(value||'').replace(/\D/g,'').slice(0,11);
  if(!d)return ''; if(d.length<=2)return `(${d}`; if(d.length<=7)return `(${d.slice(0,2)}) ${d.slice(2)}`; return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}
function maskCPFInput(el){ el.value=formatCPF(el.value); }
function maskPhoneInput(el){ el.value=formatPhone(el.value); }

function openModal(title,hint,html){ $('#modalTitle').textContent=title; $('#modalHint').textContent=hint||''; $('#modalBody').innerHTML=html; $('#modalBackdrop').classList.add('open'); }
function closeModal(){ $('#modalBackdrop').classList.remove('open'); }
function openStudentModal(id){
  const s=id?studentById(id):null;
  openModal(s?'Editar aluno':'Novo aluno','Cadastro usado pela gestão, portal do aluno e controle de acesso.',`<form onsubmit="saveStudent(event,'${id||''}')"><div class="form-grid">
    <div class="field wide"><label>Nome completo</label><input name="name" required value="${esc(s?.name||'')}"></div>
    <div class="field"><label>CPF</label><input name="cpf" inputmode="numeric" maxlength="14" oninput="maskCPFInput(this)" placeholder="000.000.000-00" value="${esc(formatCPF(s?.cpf||''))}"></div>
    <div class="field"><label>Telefone / WhatsApp</label><input name="phone" inputmode="tel" maxlength="15" oninput="maskPhoneInput(this)" placeholder="(00) 00000-0000" value="${esc(formatPhone(s?.phone||''))}"></div>
    <div class="field"><label>Data de nascimento</label><input name="birthDate" type="date" value="${esc(s?.birthDate||'')}"></div>
    <div class="field"><label>Graduação atual</label><select name="belt" required>${BELTS.map(b=>`<option value="${b}" ${(s?.belt||'Branca')===b?'selected':''}>${b}</option>`).join('')}</select></div>
    <div class="field"><label>Data da última graduação</label><input name="lastGraduation" type="date" value="${esc(s?.lastGraduation||'')}"></div>
    <div class="field"><label>Professor responsável</label><select name="professor" required>${PROFESSORS.map(p=>`<option value="${p}" ${(s?.professor||PROFESSORS[0])===p?'selected':''}>${p}</option>`).join('')}</select></div>
    <div class="field"><label>Plano</label><select name="planId">${db.plans.filter(p=>p.status==='Ativo').map(p=>`<option value="${p.id}" ${s?.planId===p.id?'selected':''}>${esc(p.name)} · ${money(p.price)}</option>`).join('')}</select></div>
    <div class="field"><label>Dia do vencimento</label><input name="dueDay" type="number" min="1" max="31" value="${s?.dueDay||10}"></div>
    <div class="field"><label>ID Topdata / Facial F4</label><input name="topdataId" value="${esc(s?.topdataId||'')}" placeholder="Ex.: 1042"></div>
    <div class="field"><label>Status</label><select name="status"><option ${s?.status!=='Inativo'?'selected':''}>Ativo</option><option ${s?.status==='Inativo'?'selected':''}>Inativo</option></select></div>
  </div><div class="divider"></div><button class="btn primary">Salvar aluno</button></form>`);
}
function saveStudent(e,id){
  e.preventDefault(); const f=new FormData(e.target); const data={name:f.get('name').trim(),cpf:formatCPF(f.get('cpf')),phone:formatPhone(f.get('phone')),birthDate:f.get('birthDate')||'',belt:f.get('belt'),lastGraduation:f.get('lastGraduation')||'',professor:f.get('professor'),planId:f.get('planId'),dueDay:Number(f.get('dueDay')||10),topdataId:f.get('topdataId').trim(),status:f.get('status')};
  if(id) Object.assign(studentById(id),data); else db.students.push({id:uid(),...data,created:todayISO()});
  save(); ensureInvoices(); closeModal(); renderAll(); toast('Aluno salvo.');
}
function openPlanModal(id){ const p=id?planById(id):null; openModal(p?'Editar plano':'Novo plano','Defina valor e duração comercial.',`<form onsubmit="savePlan(event,'${id||''}')"><div class="form-grid"><div class="field wide"><label>Nome</label><input name="name" required value="${esc(p?.name||'')}"></div><div class="field"><label>Valor</label><input name="price" type="number" step="0.01" min="0" required value="${p?.price||''}"></div><div class="field"><label>Duração (dias)</label><input name="days" type="number" min="1" required value="${p?.days||30}"></div><div class="field"><label>Status</label><select name="status"><option ${p?.status!=='Inativo'?'selected':''}>Ativo</option><option ${p?.status==='Inativo'?'selected':''}>Inativo</option></select></div></div><div class="divider"></div><button class="btn primary">Salvar plano</button></form>`); }
function savePlan(e,id){ e.preventDefault(); const f=new FormData(e.target),data={name:f.get('name').trim(),price:Number(f.get('price')),days:Number(f.get('days')),status:f.get('status')}; if(id)Object.assign(planById(id),data); else db.plans.push({id:uid(),...data}); save(); closeModal(); renderAll(); toast('Plano salvo.'); }

$$('.nav-btn').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
$('#menuBtn').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
$('#modalClose').addEventListener('click',closeModal);
$('#modalBackdrop').addEventListener('click',e=>{if(e.target.id==='modalBackdrop')closeModal();});
$('#quickStudentBtn').addEventListener('click',()=>openStudentModal());

updateBrand(); ensureInvoices(); processWhatsAppAutomation(); renderAll(); applyRoleAccess(); setView(db.session.role==='aluno'?'aluno':'dashboard');
setInterval(processWhatsAppAutomation,60*60*1000);

Object.assign(window,{setView,openStudentModal,openPlanModal,saveStudent,savePlan,filterStudents,payInvoice,ensureInvoices,simulateAccess,exportPresenceCSV,copyText,openWhatsApp,renderInvoices,saveSettings,reset,maskCPFInput,maskPhoneInput,openFrequencyCalendar,shiftCalendarMonth,changeCalendarStudent,showCalendarDay,simulatePortalFaceLogin,logoutStudentPortal,changeRole});
