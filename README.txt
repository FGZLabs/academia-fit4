ACADEMIA FIT 4 — AJUSTES-V1
===========================

Versão de testes da gestão da academia com Topdata Fit 4 + leitor facial F4.
A aplicação continua usando localStorage; os dados ficam salvos no navegador/dispositivo usado.

AJUSTES IMPLEMENTADOS
- Mensalidades: nova coluna "Próximo vencimento".
- Cadastro de aluno: máscara automática de CPF XXX.XXX.XXX-XX.
- Cadastro de aluno: máscara automática de telefone (XX) XXXXX-XXXX.
- Cadastro de aluno: data de nascimento.
- Cadastro de aluno: graduação atual com as opções Branca, Cinza, Amarela, Laranja, Verde, Azul, Roxa, Marrom e Preta.
- Cadastro de aluno: data da última graduação.
- Cadastro de aluno: professor responsável (Marcelo Matos ou Tácio Marcos).
- Aba Alunos: removida a coluna Vencimento e adicionadas Graduação atual e Professor responsável.
- Presenças: botão "Visualizar frequência" com calendário interativo.
- Calendário: P verde para Presente e F vermelho para dia transcorrido sem registro de entrada.
- Notificações: quatro eventos específicos de WhatsApp: 1 dia antes, no dia do vencimento, 1 dia depois e 2 dias depois.
- Notificações: rotina automática simulada e histórico de processamento.
- Níveis de acesso demonstrativos: Administrador, Recepção e Aluno.
- Portal do aluno: exige leitura facial F4 simulada antes de exibir os dados.
- Portal do aluno: nome, nascimento, faixa atual, última graduação, professor, frequência, próximo vencimento, último valor pago e data do último pagamento.
- O portal usa o mesmo ID Topdata previsto para o F4 da catraca.

IMPORTANTE SOBRE WHATSAPP
A lógica de agenda está implementada, mas o envio automático real não pode ser feito somente por um site estático/localStorage. Para disparar mensagens mesmo com o navegador fechado será necessário um backend e integração com WhatsApp Business API ou provedor homologado. Nesta versão a rotina é registrada como simulada e há um botão para testar a mensagem no WhatsApp.

IMPORTANTE SOBRE LEITURA FACIAL
O portal já exige autenticação facial no fluxo, porém a leitura está simulada. A integração real será feita posteriormente através da arquitetura Topdata/Gateway Windows e do identificador do usuário no F4.

COMO TESTAR LOCALMENTE
Abra a pasta em um servidor HTTP simples. Exemplo:
python -m http.server 8080
Depois acesse http://localhost:8080

COMO SUBIR ONLINE
GitHub Pages:
1. Envie todos os arquivos desta pasta para a raiz do repositório.
2. Em Settings > Pages, publique a branch main.

Firebase Hosting:
1. firebase login
2. firebase init hosting
3. Use esta pasta como public directory ou copie os arquivos para public.
4. firebase deploy

PRÓXIMAS ETAPAS
- Firebase/Firestore ou outro backend para sincronizar PC e smartphone.
- Autenticação real de administrador e recepção.
- WhatsApp Business API/provedor para envio automático real.
- PIX real via gateway.
- Gateway Windows para Topdata Fit 4 usando EasyInner.dll.
- Integração real do F4 com portal e controle de acesso.
