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

## Segurança

- Escritas críticas passam por Cloud Functions.
- CPF é validado matematicamente e reservado em transação no backend.
- Firestore e Storage negam acesso por padrão.
- Pagamentos e presenças utilizam chaves idempotentes.
- Foto de perfil não é biometria e nenhum template facial Topdata é armazenado.
- Integrações externas usam adapters e secrets de backend.

Consulte [docs/ARCHITECTURE_V2.md](docs/ARCHITECTURE_V2.md) para o desenho completo.

