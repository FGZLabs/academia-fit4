# Academia Fit 4

Sistema de gestão, financeiro e controle de acesso da Academia Fit 4.

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

- Projeto: `academia-fit4-dev`
- PWA: https://academia-fit4-dev.web.app
- Firestore: `southamerica-east1` (São Paulo), modo Native, proteção contra exclusão habilitada
- Publicado no plano Spark: Hosting, regras e índices do Firestore
- Preparado localmente: Functions, Storage, Auth, App Check e emuladores

Cloud Functions e Cloud Storage exigem o plano Blaze para novos projetos. Até a aprovação explícita de faturamento, use `pnpm deploy:spark`; `pnpm deploy` fica reservado para o ambiente completo.

## Segurança

- Escritas críticas passam por Cloud Functions.
- CPF é validado matematicamente e reservado em transação no backend.
- Firestore e Storage negam acesso por padrão.
- Pagamentos e presenças utilizam chaves idempotentes.
- Foto de perfil não é biometria e nenhum template facial Topdata é armazenado.
- Integrações externas usam adapters e secrets de backend.

Consulte [docs/ARCHITECTURE_V2.md](docs/ARCHITECTURE_V2.md) para o desenho completo.

