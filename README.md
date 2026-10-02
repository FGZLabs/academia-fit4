# Extremo Norte - Liberdade

Sistema de cadastro, frequência, comunicação e gestão da Extremo Norte - Liberdade.

## Versões

- `main`, branch e tag `Ajustes-V1`: baseline estático publicado.
- `V2-Firebase`: evolução operacional, multiusuário e orientada a backend.

O protótipo original permanece nos arquivos da raiz para referência. A V2 está organizada como um workspace:

```text
apps/web/          PWA administrativa e Portal do Aluno
functions/         Cloud Functions de 2ª geração
packages/domain/   Regras de negócio puras e testadas
docs/              Decisões de arquitetura
```

## Desenvolvimento da V2

Requisitos: Node.js 22, pnpm e Firebase CLI.

```bash
pnpm install
pnpm test
pnpm build
cp .firebaserc.example .firebaserc
cp apps/web/.env.example apps/web/.env.local
pnpm emulators
```

Use somente projetos Firebase de desenvolvimento e dados fictícios nesta fase. Nenhuma credencial privada deve ser incluída no repositório.

## Ambiente de desenvolvimento publicado

- Projeto Firebase: `academia-fit4-dev` (identificador técnico original, imutável)
- PWA: https://acesso-extremo-dev.web.app
- Firestore: `southamerica-east1` (São Paulo), modo Native, proteção contra exclusão habilitada
- Publicado no plano Spark: Hosting, regras e índices do Firestore
- Preparado localmente: Functions, Storage, Auth, App Check e emuladores

### Acessos

- Aluno e professor: https://acesso-extremo-dev.web.app
- Cadastro inicial do aluno: botão **Fazer meu cadastro inicial** na tela de aluno
- Administrador: link discreto **Acesso administrativo** no rodapé da tela de login

O ambiente atual separa os acessos de aluno, professor e administrador. Inclui cadastro autônomo com aceite dos termos, fluxo obrigatório de responsável para menores, edição de dados pessoais, solicitação de faixa, frequência e justificativas, mensagens, anotações e registro de pagamentos externos. Enquanto o projeto permanecer no plano Spark, o núcleo usa transações protegidas do Firestore; integrações críticas de WhatsApp, webhook, calendário e leitor facial permanecem para a próxima etapa.

Cloud Functions e Cloud Storage exigem o plano Blaze para novos projetos. Até a aprovação explícita de faturamento, use `pnpm deploy:spark`; `pnpm deploy` fica reservado para o ambiente completo.

## Segurança

- Escritas críticas passam por Cloud Functions.
- CPF é validado matematicamente e reservado em transação no backend.
- Firestore e Storage negam acesso por padrão.
- Pagamentos e presenças utilizam chaves idempotentes.
- Foto de perfil não é biometria e nenhum template facial Topdata é armazenado.
- Integrações externas usam adapters e secrets de backend.

Consulte [docs/ARCHITECTURE_V2.md](docs/ARCHITECTURE_V2.md) para o desenho completo.

