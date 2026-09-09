# Revisão de bugs e memória — 07/09/2026

Revisão estática direcionada ao armazenamento, reprodução, apresentações e runtime Electron, acompanhada de compilação, lint e testes. Não equivale a uma garantia de ausência de bugs nem a um perfil de memória do aplicativo em execução.

## Correções aplicadas

| Problema | Correção | Efeito esperado |
| --- | --- | --- |
| `Storage.removeAll` enumerava sessionStorage, mas removia do localStorage | Propagar o tipo de armazenamento para `remove` | Limpa o destino correto e preserva os dados locais |
| Falha de quota no cache fazia `Database.get` retornar null mesmo após ler dados locais válidos | Leitura e gravação do cache toleram indisponibilidade | Abertura de dados não depende de espaço no cache |
| Cache `db:*` acumulava bancos durante a sessão | Limite de 2.097.152 caracteres de valores serializados, com descarte de entradas e sem armazenar um banco individual maior que o limite | Reduz retenção de dados no armazenamento de sessão; pode aumentar releituras do disco/rede |
| Encerramento de áudio criava os dois elementos e só pausava o ativo | Pausar apenas os elementos existentes, remover src e chamar load em ambos | Libera fontes e buffers de mídia, sem criar players ao encerrar |
| Atualização de áudio tentava escrever em `buffered`, propriedade somente leitura | Removida a atribuição e protegido cálculo com duração inválida | Evita exceções repetidas e valores NaN/Infinity no buffer |
| Verificação de tempos criava dois arrays e eventos criavam funções com bind | Usar some diretamente e chamar os métodos existentes | Menos alocações temporárias durante a reprodução |

O limite do cache controla caracteres serializados, não a RAM total do processo. Entradas antigas são reduzidas quando um novo banco elegível é gravado. As chaves `db:*` foram preservadas para manter as invalidações feitas pelos editores de músicas.

## Achados pendentes resolvidos

Todos os oito achados da revisão foram tratados:

1. **Ciclo de vida dos PDFs:** PresentationPdf centraliza o worker, cancela tarefas de renderização, destrói o carregamento/documento ao substituir ou desmontar a tela e libera canvases e recursos de páginas após o uso. Funciona tanto na tela de operação quanto na projeção.
2. **Carregamentos concorrentes:** tokens invalidam respostas antigas de músicas, conversões e leituras de apresentações. Fechar a música ou desmontar a apresentação invalida o trabalho pendente. A sincronização de monitores também verifica se o pedido continua vigente.
3. **Fades concorrentes:** AudioFade mantém uma transição por elemento. Reutilização, pausa, ajuste de volume e encerramento cancelam a anterior e resolvem sua promessa. O áudio de saída libera a fonte ao terminar o fade.
4. **Miniaturas:** cache limitado a até nove páginas próximas à seleção em ambos os modos, com descarte das imagens fora da janela. Canvas limitado a 2.560 pixels na maior dimensão e liberado após a conversão; evita alocações enormes para páginas de dimensões incomuns.
5. **Alertas:** fila de diálogos com resposta individual, acionada pelo botão do diálogo. Removidos os intervalos de polling e preservada a ordem mesmo quando um callback cria outro alerta.
6. **Tipos Vue:** typecheck agora executa vue-tsc incluindo todos os arquivos Vue. Corrigidos os erros revelados nos templates e scripts; adicionadas declarações dos helpers globais, tipos de registros dinâmicos e estados iniciais compatíveis com os dados usados pelas telas.
7. **Duplicação:** conversão de bytes PDF extraída para um único utilitário. Removida também a cópia antiga da tela de configurações (mantendo uma entrada de compatibilidade que referencia a tela atual) e a sincronização duplicada dos monitores em Media.open.
8. **Arquivos estáticos:** streamStaticFile usa stream com backpressure e encerra a leitura ao desconectar o cliente. Mantém cabeçalhos e resposta 404 para caminhos indisponíveis.

## Validação executada

- npm run test:runtime: 14 testes aprovados, incluindo entrega por HTTP e desconexão durante streaming.
- npm run test:helpers: 14 testes aprovados, incluindo quota de cache, alertas reentrantes, fades cancelados, carregamentos fora de ordem, descarte de PDF/canvas e limite de miniaturas ao percorrer 100 páginas.
- npm run build: aprovado com vue-tsc e build Vite.
- Lint completo com --quiet: zero erros. Avisos de estilo preexistentes não foram tratados por autofix global.

Os testes de renderização usam objetos controlados para reproduzir corridas de forma determinística. Não substituem uma sessão visual com múltiplos monitores e arquivos reais. O limite de miniaturas pode exigir nova renderização ao voltar para páginas distantes; essa é a troca deliberada para reduzir retenção de memória.

## Como verificar o ganho real

Comparar a mesma versão-base e a versão corrigida usando a mesma biblioteca: abrir o app, reproduzir e trocar músicas repetidamente, encerrar a reprodução e registrar memória dos processos principal, renderizadores e GPU. Repetir com PDFs grandes e troca de apresentações para avaliar o descarte dos recursos. Comparar valores após repouso, além do pico, pois o coletor de lixo pode adiar a devolução de memória. Não foi atribuído um percentual de economia sem essa medição.
