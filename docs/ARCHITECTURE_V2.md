# Arquitetura V2-Firebase

## Princípios

1. `Pessoa` é a identidade central; aluno, responsável, professor e usuário são papéis.
2. O cliente nunca decide CPF único, validade financeira, aprovação ou autorização de acesso.
3. Acesso à catraca e presença diária são eventos distintos.
4. Integrações externas ficam atrás de interfaces substituíveis.
5. Foto de perfil nunca é tratada como template biométrico.
6. Dados financeiros, frequência e auditoria usam exclusão lógica e histórico imutável.

## Componentes

- **Web/PWA:** React, TypeScript, Firebase Auth e chamadas a Functions.
- **Backend:** Cloud Functions de 2ª geração em Node.js 22.
- **Dados:** Firestore; documentos privados no Cloud Storage.
- **Agenda:** Cloud Scheduler e tarefas idempotentes no fuso `America/Boa_Vista`.
- **Topdata:** gateway Windows separado, com adapter para o simulador e futuro SDK EasyInner.
- **Pagamentos:** `PaymentProvider` com webhook validado e idempotente.
- **WhatsApp:** `WhatsAppProvider` oficial, sem automação de WhatsApp Web.

## Identidade e autorização

Firebase Authentication identifica o usuário. Claims amplas (`admin`, `reception`, `teacher` e `personId`) são emitidas somente pelo backend. Firestore Rules validam leitura por papel/propriedade. Escritas críticas são negadas ao cliente e executadas exclusivamente pelas Functions.

## CPF único

O CPF é normalizado e validado antes de qualquer escrita. A Function cria um índice determinístico em `cpfIndex` na mesma transação que cria a pessoa. Duas requisições simultâneas disputam o mesmo documento e somente uma conclui. A coleção é invisível aos clientes.

## Financeiro

Cada confirmação carrega uma chave de idempotência. A transação consulta `paymentEvents/{provider_eventId}`, registra o pagamento e aplica:

```text
nova validade = maior(validade atual, data do pagamento) + 30 dias
```

Upload de comprovante cria apenas `AGUARDANDO_APROVACAO`. A mesma rotina financeira só é chamada após a aprovação administrativa.

## Acesso e presença

Toda leitura gera um `accessEvent`. Quando autorizada, o backend tenta criar `dailyAttendance/{personId_YYYY-MM-DD}`. Leituras posteriores no mesmo dia permanecem no log de acesso, mas não criam outra presença.

O tipo da presença é calculado por idade, dia da semana e calendário:

- `SCHEDULED`: treino previsto;
- `EXTRA`: dia não previsto ou OpenMat facultativo;
- `NONE`: academia fechada ou evento sem presença.

Faltas serão materializadas somente para dias previstos já encerrados, nunca em fim de semana, feriado, recesso, OpenMat facultativo ou academia fechada.

## Integrações

Adapters de desenvolvimento não realizam comunicação externa. Secrets dos providers serão cadastrados no Secret Manager apenas quando uma integração for escolhida. O gateway Topdata manterá cache local assinado de autorizações e fila de eventos para sincronização após quedas de internet.
