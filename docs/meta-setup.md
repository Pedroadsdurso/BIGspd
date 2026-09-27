# Configuração da WABA e do modo live

Esta aplicação envia mensagens somente pela WhatsApp Cloud API oficial. O modo `live` não é um bypass: o número precisa estar registrado em uma WhatsApp Business Account (WABA), os templates precisam estar aprovados e campanhas de marketing só enfileiram contatos com consentimento `OPTED_IN`.

## 1. Preparar o ativo na Meta

1. Acesse [Meta for Developers](https://developers.facebook.com/apps/) e crie um aplicativo do tipo **Business**, ou selecione um aplicativo Business existente.
2. Adicione o produto **WhatsApp** ao aplicativo.
3. Em **WhatsApp > API Setup**, selecione ou crie a conta empresarial e a WABA.
4. Adicione o número que será usado pela API e conclua a verificação solicitada pela Meta.
5. Anote estes identificadores, sem confundi-los:
   - **WhatsApp Business Account ID (WABA ID)**: identifica a conta empresarial.
   - **Phone Number ID**: identifica o número dentro da Cloud API; não é o telefone em formato `+55...`.
6. Em **WhatsApp Manager > Message templates**, crie e aguarde a aprovação dos templates usados em campanhas.

Um número registrado na Cloud API deve seguir o fluxo de registro/migração oferecido pela Meta. Não presuma que um número atualmente usado no aplicativo WhatsApp pessoal possa ser conectado sem essa etapa.

## 2. Criar um token apropriado para produção

O token temporário exibido em **API Setup** serve para teste e expira. Para produção:

1. Abra **Business Settings > Users > System users**.
2. Crie ou selecione um system user administrador.
3. Atribua ao system user o aplicativo e a WABA/número usados por este projeto.
4. Gere um token para o aplicativo com as permissões exigidas pela Cloud API, normalmente `whatsapp_business_messaging` e `whatsapp_business_management`.
5. Guarde o token como segredo. Ele pode ser cadastrado depois em **Configurações > WhatsApp**; a aplicação o cifra com AES-256-GCM antes de gravá-lo no PostgreSQL.

Confirme o fluxo e as permissões na [documentação oficial da WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api/) porque nomes de telas e requisitos da Meta podem mudar.

## 3. Variáveis de ambiente live

Defina na Vercel e no worker:

```dotenv
META_CLIENT_MODE=live
META_API_VERSION=v25.0
META_WEBHOOK_VERIFY_TOKEN=<valor-aleatorio-longo>
META_WEBHOOK_APP_SECRET=<app-secret-do-aplicativo-meta>
```

`META_WEBHOOK_VERIFY_TOKEN` é uma string criada por você. Use exatamente o mesmo valor no painel da Meta. `META_WEBHOOK_APP_SECRET` é o App Secret da Meta e valida `X-Hub-Signature-256` em cada POST recebido.

Os valores abaixo são opcionais no ambiente porque podem ser cadastrados pela tela protegida da aplicação:

```dotenv
META_ACCESS_TOKEN=<token-do-system-user>
META_WABA_ID=<waba-id>
META_PHONE_NUMBER_ID=<phone-number-id>
META_APP_ID=<app-id>
META_APP_SECRET=<app-secret>
```

Se o token for salvo pela interface, mantenha `SETTINGS_ENCRYPTION_KEY` estável. Trocar essa chave torna os tokens já cifrados ilegíveis.

## 4. Publicar e registrar o webhook

1. Faça o primeiro deploy na Vercel e defina `APP_URL=https://seu-dominio.vercel.app`.
2. No produto WhatsApp do aplicativo Meta, configure o callback:

   ```text
   https://seu-dominio.vercel.app/api/webhooks/whatsapp
   ```

3. Informe o mesmo `META_WEBHOOK_VERIFY_TOKEN` usado na Vercel.
4. Assine o campo `messages` para a WABA.
5. A Meta fará um GET de verificação; a aplicação só devolve o challenge quando o token confere.
6. Nos POSTs, a aplicação valida a assinatura do corpo bruto antes de persistir qualquer evento.

Use a [referência oficial de webhooks](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/) para conferir o painel atual.

## 5. Conectar dentro da ferramenta

1. Entre em `/login` com `OWNER_EMAIL` e a senha que originou `OWNER_PASSWORD_HASH`.
2. Abra **Configurações > WhatsApp**.
3. Informe WABA ID, Phone Number ID, token do system user e versão da API.
4. Salve e execute **Testar conexão**.
5. Abra **Templates** e execute a sincronização.
6. Importe contatos e registre o consentimento real. Importação, por si só, mantém o contato como `UNKNOWN`.
7. Crie a campanha usando um template aprovado. Contatos sem opt-in, suprimidos, inválidos ou com opt-out não entram na fila.

## Diagnóstico rápido

- **401/Invalid OAuth access token**: token expirado, revogado ou pertencente a outro aplicativo/business.
- **Unsupported post request / object not found**: WABA ID ou Phone Number ID incorreto, ou ativo não atribuído ao system user.
- **Webhook não verifica**: URL pública, HTTPS ou verify token divergente.
- **Webhook retorna 401 no POST**: App Secret divergente.
- **Campanha fica aguardando**: o worker persistente ou o Redis não está disponível.
- **Nenhum contato elegível**: confirme consentimento, suppression, validade do telefone e template aprovado.
