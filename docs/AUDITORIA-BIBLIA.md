# Auditoria da Bíblia — 31/10/2026

Base examinada: `resources/database.db`. Verificação estrutural das 10 traduções incluídas no projeto; não examina o cache de uma instalação externa.

## Livros e capítulos

Todas as traduções possuem os 66 livros e os 1.189 capítulos esperados no cânon protestante. Nenhum capítulo ausente ou vazio foi encontrado; nenhuma referência duplicada foi encontrada. Daniel possui os 12 capítulos esperados nessas traduções. As edições católicas incluem os acréscimos de Daniel 13 e 14.

| Tradução | Livros | Capítulos | Registros de versículos |
| --- | ---: | ---: | ---: |
| ACRF | 66 | 1189 | 31106 |
| ARA | 66 | 1189 | 31103 |
| ARIB | 66 | 1189 | 31106 |
| NTLH | 66 | 1189 | 31103 |
| NVI | 66 | 1189 | 31105 |
| KJA | 66 | 1189 | 31105 |
| NVT | 66 | 1189 | 31104 |
| NAA | 66 | 1189 | 31105 |
| ARC | 66 | 1189 | 31105 |
| ACF | 66 | 1189 | 31103 |

## Achados

- Corrigido na NAA: o texto de 2 Samuel 22:51 foi movido de 2 Samuel 23:51 para a referência correta, sem alterar seu conteúdo. Conferência: https://www.bible.com/pt/bible/1840/2SA.22.51.NAA
- Corrigido na NVT: removido o registro adicional vazio de Salmos 95:95. Os versículos 1–11 foram preservados.
- NTLH: os 793 registros sem texto próprio foram individualmente conferidos com a edição SBB publicada no YouVersion (versão 211). Todos pertencem a agrupamentos explícitos de versículos; o texto correspondente já está integralmente presente na base. Foram conferidos 297 agrupamentos em 186 capítulos. Por exemplo, Gênesis 6:9–10 tem seu texto completo no registro 9. Conferência: https://www.bible.com/pt/bible/211/GEN.6.NTLH
- Após as correções, restam 25 diferenças de numeração por capítulo/tradução em relação à união dos números presentes na base (antes eram 45). Essa comparação inclui diferenças editoriais; não representa 25 trechos perdidos.
- Corrigido na ACF: o texto de 3 João 1:15 foi separado do registro 1:14, usando a marca explícita `(1:15)` existente no próprio texto. Nenhuma frase foi adicionada ou removida.

As mesmas correções são aplicadas na leitura de arquivos antigos e caches, tanto no aplicativo quanto no controle remoto. Isso evita exigir nova extração de toda a biblioteca. Não foi gerado um instalador; uma instalação já distribuída precisa receber a nova versão para executar esse tratamento.

## Limites

A existência de todos os capítulos não comprova a integridade de cada frase. A conferência específica da NTLH resolveu os 793 registros vazios: nenhum corresponde a texto perdido. Essa conclusão abrange os agrupamentos associados a esses registros, e não uma revisão integral de todos os demais versículos. As outras diferenças de numeração entre traduções continuam fora dessa conferência editorial. Somente os três erros confirmados acima exigiram correção da base.

## Conferência completa dos registros vazios da NTLH

Resultado: **793 de 793 confirmados**, sem divergências de palavras e sem falhas de consulta. Todos os números vazios aparecem explicitamente nos grupos de referências da edição publicada, e os textos dos respectivos grupos coincidem com os registros preenchidos do banco.

A comparação ignora diferenças de pontuação, espaços, maiúsculas e marcação HTML; preserva palavras, ordem, acentos e números. Notas e títulos de seções são excluídos. Cabeçalhos de colunas pertencentes às tabelas são incluídos, assim como já estão na base. Os 46 casos de tabelas, em Números 1, 13 e 34, 1 Crônicas 27 e Neemias 12, também coincidiram após a inclusão desses cabeçalhos na leitura da referência.

O arquivo [AUDITORIA-NTLH.json](AUDITORIA-NTLH.json) registra cada um dos 793 casos com livro, capítulo, versículo vazio, referência agrupada publicada, registro que contém seu texto, URL da fonte e hashes da comparação. Registra também os hashes das 186 páginas de referência e do banco examinado. Nenhum texto da NTLH foi alterado ou duplicado.

O aplicativo ainda armazena esses números como registros vazios; a conferência não altera a interface nem implementa a seleção de um número individual dentro de um texto agrupado.

## Validação das correções

150 testes passaram e um teste da biblioteca exportada foi ignorado por não haver exportação ChromeOS neste ambiente. A verificação de tipos e o build de produção passaram. Os testes confirmam a integridade SQLite, a preservação dos 1.189 capítulos em cada tradução, as referências corrigidas e o tratamento de caches antigos sem modificar os objetos originais. A reaplicação do script de correção não produz alterações adicionais.

## Reprodução

Execute `node scripts/audit-bible.cjs tmp/bible-audit.json` com Node 24. O comando abre a base apenas para leitura e retorna código 1 quando encontra registros que exigem revisão. A listagem detalhada fica no JSON indicado.

Para reaplicar as correções confirmadas, execute `node scripts/fix-bible.cjs`. O script usa uma transação e mantém uma cópia original em `tmp/database-before-bible-fixes.db`.

Para reproduzir a conferência editorial, execute `node scripts/audit-ntlh.cjs`. As páginas de referência ficam em `tmp/ntlh-reference/` e são reutilizadas nas execuções seguintes; uma nova consulta à fonte pode ser feita usando um diretório de cache vazio. O script abre o banco somente para leitura e gera `docs/AUDITORIA-NTLH.json`. O auditor estrutural geral continua sinalizando os 793 campos vazios; o relatório específico documenta por que esses campos não são omissões de conteúdo.
