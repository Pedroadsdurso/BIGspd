# Campanhas

Uma campanha referencia lista, template sincronizado, idioma e mapeamento das variáveis. Apenas templates `APPROVED` podem ser usados.

Antes da fila, `isEligibleForCampaign` verifica telefone, opt-out, suppression, consentimento aplicável e variáveis obrigatórias. Reprovados ficam como `SKIPPED` com a razão registrada e nunca são enviados ao Redis.

Cada job contém `recipientId`, `campaignId` e chave de idempotência. O worker recarrega o banco, verifica a campanha e envia pelo `MetaWhatsAppClient`. Concorrência e taxa usam `WORKER_CONCURRENCY` e `WORKER_MAX_PER_SECOND`.

Retry máximo: três tentativas com backoff exponencial. `429` e `5xx` são temporários; erros permanentes terminam em `FAILED`.

Datas são armazenadas em UTC. BullMQ aplica delay até `scheduled_at`. Pausar impede novos envios; retomar reinsere pendentes. Cancelar não tenta recolher mensagens aceitas pela Meta.

O retorno da API cria `SENT` com o `wamid`. Entrega, leitura e falha são atualizadas por webhook.
