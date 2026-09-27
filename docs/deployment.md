# Deploy de produção

## Topologia suportada

```text
GitHub ──► Vercel (Next.js, API e webhook HTTPS)
                    │
                    ├──► PostgreSQL gerenciado
                    └──► Redis TLS ◄── Worker BullMQ persistente
                                           │
                                           └──► Meta Cloud API
```

A Vercel hospeda a interface, autenticação, Route Handlers e webhook. O `npm run worker` precisa de um serviço persistente separado: Vercel Functions são invocadas por requisição e podem reduzir a zero, enquanto BullMQ precisa manter um consumidor conectado à fila. O repositório inclui `Dockerfile.worker` e `render.yaml` para criar esse processo em um background worker.

## 1. Serviços necessários

- PostgreSQL gerenciado. Use uma URL com pooler em `DATABASE_URL` para o runtime serverless e, quando o provedor oferecer, a URL direta em `DIRECT_URL` para migrations.
- Redis compatível com BullMQ e acessível por TLS, normalmente uma URL `rediss://...`.
- Vercel para a aplicação Next.js.
- Um serviço persistente para o worker. O Blueprint incluído está pronto para Render; Railway, Fly.io ou outro host de processo contínuo também funcionam.

O banco e o Redis devem ficar, sempre que possível, na mesma região do worker e próximos da região das Functions.

## 2. Gerar os segredos

No PowerShell, gere valores novos e guarde-os em um gerenciador de segredos:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
node -e "require('bcryptjs').hash('TROQUE-POR-UMA-SENHA-FORTE',12).then(console.log)"
```

Use o primeiro resultado em `AUTH_SECRET`, o segundo em `SETTINGS_ENCRYPTION_KEY` e o terceiro em `OWNER_PASSWORD_HASH`. Gere separadamente outro valor aleatório para `META_WEBHOOK_VERIFY_TOKEN`.

## 3. Variáveis na Vercel

Cadastre em **Project Settings > Environment Variables**, no ambiente Production:

```text
DATABASE_URL
REDIS_URL
APP_URL
AUTH_SECRET
OWNER_EMAIL
OWNER_PASSWORD_HASH
SETTINGS_ENCRYPTION_KEY
META_CLIENT_MODE=live
META_API_VERSION=v25.0
DEFAULT_COUNTRY_CODE=55
WORKER_CONCURRENCY=5
WORKER_MAX_PER_SECOND=5
LOG_LEVEL=info
```

`APP_URL` deve ser a origem HTTPS exata, sem caminho, por exemplo `https://bigspd.vercel.app`. Alterações em variáveis só entram em um novo deployment; faça redeploy após ajustá-las.

WABA ID, Phone Number ID, access token, App Secret e Webhook Verify Token são cadastrados na interface depois do deploy e ficam cifrados no PostgreSQL. Se preferir configuração por ambiente, continuam disponíveis `META_ACCESS_TOKEN`, `META_WABA_ID`, `META_PHONE_NUMBER_ID`, `META_WEBHOOK_APP_SECRET` e `META_WEBHOOK_VERIFY_TOKEN`.

## 4. Migrations e primeiro deploy

Antes de publicar a aplicação, aplique a migration uma única vez contra o banco de produção:

```powershell
$env:DATABASE_URL="<url-pooler>"
$env:DIRECT_URL="<url-direta>"
$env:OWNER_EMAIL="<email-do-proprietario>"
$env:OWNER_PASSWORD_HASH="<hash-bcrypt>"
npm ci
npm run db:deploy
npm run db:seed
```

O workflow manual `.github/workflows/migrate.yml` executa migration e seed. Em **GitHub > Settings > Environments > production**, cadastre `DATABASE_URL`, `DIRECT_URL`, `OWNER_EMAIL` e `OWNER_PASSWORD_HASH`; depois execute **Actions > Initialize production database > Run workflow**. O seed cria ou atualiza somente o proprietário e não cria dados mock porque o workflow fixa `META_CLIENT_MODE=live`.

Deploy pela integração Git da Vercel:

1. Importe `Pedroadsdurso/BIGspd` no painel da Vercel.
2. Framework preset: Next.js; root directory: `.`.
3. Cadastre as variáveis acima.
4. Clique em **Deploy**.

Ou pela CLI autenticada:

```powershell
npx vercel link
npx vercel --prod
```

## 5. Subir o worker

No Render, crie um **Blueprint** apontando para este repositório. O `render.yaml` cria `bigspd-worker` a partir de `Dockerfile.worker`. Preencha as variáveis marcadas como secret; use os mesmos valores da Vercel.

Depois do deploy, o log deve registrar o worker iniciado. Uma campanha preparada deve criar jobs no Redis e os jobs devem sair de `QUEUED` para `SENT`/`DELIVERED` ou um erro persistido.

## 6. Checklist de aceitação

```text
[ ] Migration aplicada sem erro
[ ] Login do proprietário funciona
[ ] Configurações > WhatsApp testa a conexão real
[ ] Templates aprovados sincronizam
[ ] GET de verificação do webhook retorna 200
[ ] POST Meta assinado é aceito; assinatura inválida retorna 401
[ ] Worker está online e ligado ao mesmo PostgreSQL/Redis
[ ] Importação deixa consentimento ausente como UNKNOWN
[ ] Campanha enfileira somente contatos elegíveis
[ ] Status da Meta atualiza a mensagem e aparece no dashboard
```

Execute `npm run deploy:check` em um ambiente com todas as variáveis de produção para validar segredos obrigatórios, lint, tipos, testes e build sem exibir os valores.
