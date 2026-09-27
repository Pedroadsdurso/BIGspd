# WA Console

Plataforma single-tenant para contatos, listas, templates, campanhas e atendimento usando exclusivamente a **WhatsApp Cloud API oficial da Meta**.

## Fluxo implementado

```text
Importação CSV/TXT → PostgreSQL → elegibilidade → BullMQ/Redis → worker
                                                               ↓
                                                Meta WhatsApp Cloud API
                                                               ↓
Webhook assinado ← status e respostas ← WhatsApp do destinatário
```

Importar um contato não altera automaticamente o consentimento. Contatos sem informação explícita ficam com `ConsentStatus.UNKNOWN`; campanhas de marketing exigem `OPTED_IN`. Opt-out e suppression sempre bloqueiam a fila.

## Pré-requisitos

- Node.js 24+
- PostgreSQL 17+
- Redis 7+
- Docker Compose opcional
- Uma WABA e um número configurado na Meta para o modo real

## Instalação

1. Copie `.env.example` para `.env`.
2. Gere `AUTH_SECRET` com pelo menos 32 caracteres.
3. Gere `SETTINGS_ENCRYPTION_KEY` com 32 bytes codificados em base64.
4. Gere `OWNER_PASSWORD_HASH` com bcrypt, por exemplo: `node -e "require('bcryptjs').hash('SUA-SENHA',12).then(console.log)"`. No arquivo `.env`, escape cada `$` do hash como `\$` para impedir expansão pelo Next.js.
5. Inicie infraestrutura: `docker compose up -d`.
6. Execute `npm install`.
7. Execute `npm run db:generate`.
8. Execute `npm run db:deploy`.
9. Execute `npm run db:seed`.
10. Inicie a aplicação com `npm run dev`.
11. Em outro terminal, inicie o worker com `npm run worker:dev`.

Para validar sem credenciais reais, mantenha `META_CLIENT_MODE=mock`. A interface identifica explicitamente esse modo; ele não representa uma conexão real com a Meta.

## Verificação

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Estrutura

- `app/`: páginas e Route Handlers.
- `components/`: shell, componentes visuais e formulários.
- `lib/meta/`: único limite de integração com a Graph API.
- `lib/contacts/`: parsing, telefone e importação.
- `lib/campaigns/`: elegibilidade, personalização e preparação.
- `lib/queue/`: BullMQ e conexão Redis.
- `lib/webhooks/`: assinatura, parsing e processamento.
- `prisma/`: schema, migration e seed.
- `workers/`: processo persistente de envio.
- `docs/`: arquitetura e operação.

## Deploy

O frontend e os Route Handlers estão preparados para a Vercel por `vercel.json`. O worker BullMQ é empacotado por `Dockerfile.worker` e `render.yaml` para um processo persistente separado, com acesso ao mesmo PostgreSQL e Redis. Não execute processamento de campanhas dentro de uma requisição HTTP serverless.

Fluxo mínimo para produção:

1. Envie o repositório ao GitHub.
2. Crie PostgreSQL e Redis gerenciados.
3. Aplique `npm run db:deploy` e `npm run db:seed` com as variáveis de produção.
4. Importe o repositório na Vercel e cadastre as variáveis de `docs/deployment.md`.
5. Crie o background worker pelo Blueprint do Render ou host equivalente.
6. Configure a WABA e o webhook usando `docs/meta-setup.md`.
7. Entre na ferramenta, salve WABA ID, Phone Number ID e token, teste a conexão e sincronize templates.

Leia [deploy completo](docs/deployment.md), [configuração Meta](docs/meta-setup.md), [arquitetura](docs/architecture.md), [importação](docs/importing-leads.md) e [campanhas](docs/campaigns.md).
