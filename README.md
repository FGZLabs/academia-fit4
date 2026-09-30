# Academia Fit 4 — Ajustes-V1

Baseline do protótipo estático de gestão da Academia Fit 4, preservado antes da evolução para a arquitetura **V2-Firebase**.

## Executar localmente

Sirva a pasta por HTTP e abra a URL informada pelo servidor. Exemplo:

```bash
python -m http.server 8080
```

Depois acesse `http://localhost:8080`.

## Estado desta versão

- HTML, CSS e JavaScript sem framework ou etapa de build.
- Dados de demonstração persistidos no `localStorage` do navegador.
- PWA básica com manifesto e service worker.
- Simuladores locais para controle de acesso Topdata, Portal do Aluno, PIX e notificações.
- Nenhuma integração externa ou credencial real incluída.

## Limitações conhecidas

Esta versão é somente um protótipo demonstrativo. Não deve ser usada com dados pessoais reais ou em produção. Autenticação, autorização, validações críticas, persistência multiusuário, pagamentos, WhatsApp e integração Topdata ainda não possuem backend real.

## Próxima etapa

A V2-Firebase será definida e implementada somente após aprovação da arquitetura proposta. O baseline desta pasta deve permanecer identificado no Git como `Ajustes-V1`.

