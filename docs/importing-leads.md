# Importação de contatos

CSV e TXT são aceitos com vírgula, ponto e vírgula, pipe ou TAB. O parser trata campos entre aspas, detecta separador e permite mapeamento manual. Arquivos sem cabeçalho recebem nomes provisórios.

## Wizard

1. Upload.
2. Detecção de linhas, colunas e separador.
3. Mapeamento para campos padrão, consentimento ou campo personalizado.
4. Prévia.
5. Validação e escolha opcional de lista.
6. Resultado com importados, duplicados, inválidos e existentes.

O limite HTTP inicial é 10 MB. Para arquivos maiores, mova o processamento para um worker mantendo o mesmo serviço de domínio.

## Telefones e consentimento

Caracteres de formatação são removidos. Números locais recebem o país padrão somente quando ausente. Valores impossíveis ficam no relatório como `INVALID_PHONE` e não entram na fila.

A coluna de consentimento é opcional. Sem ela, o contato recebe `UNKNOWN`. Valores explícitos reconhecidos são importados e auditados. Não existe ação para converter arbitrariamente um lote em consentido.

Campos adicionais são persistidos em `custom_fields` JSONB para personalização e segmentação.
