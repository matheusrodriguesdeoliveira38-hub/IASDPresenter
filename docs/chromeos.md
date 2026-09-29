# ChromeOS Flex — versão PWA

A versão web inclui a biblioteca textual em português do banco que acompanha o
app Windows: músicas, letras, álbuns, os dois hinários e Bíblia. Não exige um
servidor externo de dados nem Linux no Chromebook.

## Testar no Windows

Use Node.js 24. Na pasta do projeto:

```powershell
npm run build:chromeos
npm run preview:chromeos
```

Abra http://localhost:4173 no Chrome e mantenha o terminal aberto. Se a versão
anterior já estava aberta, recarregue, aguarde **Atualização disponível** e
escolha **Atualizar agora** após fechar as projeções.

Teste os menus **Hinário Adventista**, **Hinário Adventista 1996**, **Coletâneas**
e **Bíblia**. Áudio e playback usam o servidor de mídias quando não estão salvos.

## Biblioteca offline

O build converte `resources/database.db` em 64 arquivos JSON versionados usando
as mesmas consultas do extrator desktop. O SQLite original não é alterado.
A saída fica em `dist-chromeos/library`. O build inclui 13.860 registros e cerca
de 57 MB de dados textuais; o download inicial do app completo é de cerca de 67 MB.

Aguarde **Biblioteca pronta offline** antes de desconectar. O service worker
salva toda a biblioteca textual, inclusive conteúdos ainda não consultados.
Em **ChromeOS**, use **Manter dados neste dispositivo** para solicitar
armazenamento persistente. O navegador pode recusar; limpar os dados do site
remove a biblioteca e as preferências. Atualizações aguardam sua confirmação.

Para testar, feche e reabra o app sem rede e escolha outro hino ou capítulo.
Na prévia local, também é possível encerrar o servidor com Ctrl+C após o aviso
de biblioteca pronta e recarregar a página para verificar o cache.

## ChromeOS Flex

A versão de teste usa GitHub Pages, com arquivos publicados na branch
`codex/chromeos-pages`. Endereço publicado:
https://matheusrodriguesdeoliveira38-hub.github.io/IASDPresenter/

Para preparar uma atualização destinada a esse endereço, no PowerShell:

```powershell
node scripts/export-web-library.cjs
npm run typecheck
$env:VITE_BASE_URL = '/IASDPresenter/'
npx vite build --mode chromeos --outDir dist-chromeos-pages
Remove-Item Env:VITE_BASE_URL
```

Publique somente os arquivos gerados de `dist-chromeos-pages` na branch de
publicação, incluindo `.nojekyll`. A branch contém o build, não o código-fonte.
A publicação desta prévia é manual; o workflow antigo que escreve em `dist`
não atualiza essa versão. Não é necessário alterar os instaladores desktop.

Hospede `dist-chromeos` em HTTPS. Abra esse endereço no Chromebook e instale pelo
menu do Chrome. A publicação não é automática. HTTP pelo IP de outro computador
não substitui HTTPS para instalação e funcionamento offline.

Use **Abrir projeção**, permita pop-ups, mova a janela para a tela externa e
use a tecla de tela cheia. Valide a projeção no equipamento antes de uso real.

## Áudio, vídeo e capas

O app usa por padrão `https://api.louvorja.com.br/file`, o mesmo serviço HTTPS
usado pela versão desktop, para áudio, playback, capas e imagens de letras.
Esses arquivos são carregados sob demanda; não fazem parte do download inicial.

Em **Mídias e downloads**, selecione coletâneas e clique em **Baixar selecionadas**.
**Selecionar todas** permite preparar a biblioteca completa. Ela pode ocupar
muitos gigabytes; o painel informa o espaço usado e a cota estimada do navegador.
Downloads concluídos são reutilizados ao retomar. Falhas, falta de espaço ou
limites do servidor interrompem a operação com um aviso. Reabra o app depois de
baixar e teste reprodução e avanço da faixa sem internet.

Use **Importar áudio ou vídeo** para salvar arquivos deste computador no
navegador e **Abrir** para reproduzi-los. Para vídeo, **Abrir projeção** abre a
janela de saída. MP3, MP4 e WebM dependem dos codecs disponíveis no navegador.
Os arquivos importados permanecem neste dispositivo e não são publicados.

Para usar outro servidor compatível, configure `.env.chromeos.local`:

```dotenv
VITE_URL_FILES=https://seu-servidor.example/arquivos
VITE_BASE_URL=/
```

O servidor deve oferecer os caminhos indicados pelo banco, permitir CORS e
responder com o tipo de conteúdo correto. Refaça o build após configurar.
`VITE_URL_DATABASE` não é necessário no build ChromeOS.

## Arquivos e conteúdo personalizado

- O criador de músicas salva letras, ordem e MP3 no armazenamento do navegador.
- Letras TXT podem ser importadas no criador de músicas.
- Apresentações PDF podem ser importadas, reabertas e projetadas offline.
- Liturgias podem ser exportadas e importadas como JSON. Esse JSON contém a
  programação e referências; ele não transporta os arquivos de mídia para outro dispositivo.
- Arquivos escolhidos para liturgias e itens agendados são copiados para o
  navegador, para continuar disponíveis após reiniciar o app.
- PowerPoint precisa ser exportado como PDF antes da importação. A PWA não
  inclui o conversor PowerPoint/LibreOffice usado no desktop.

Os arquivos e registros criados pelo usuário ficam em caches próprios, separados
da biblioteca distribuída e preservados nas atualizações. Limpar os dados do site
também apaga esse conteúdo. A gravação informa falhas de armazenamento.

## Limitações atuais

- A biblioteca incluída é em português; a seleção de idioma fica restrita a português.
- Controle remoto com servidor local, monitor virtual, FTP e automação de mesas
  ainda exigem o app desktop. A PWA comum não expõe sockets TCP/UDP.
- Uma versão IWA com Direct Sockets seria outro formato de distribuição e exige
  verificar suporte, instalação e políticas no ChromeOS do usuário; não está implementada.
- Instalação e projeção física no ChromeOS Flex precisam de teste no equipamento.

## Validação

```sh
npm run test:helpers
node --test tests/bundled-library.test.cjs
```

O teste da biblioteca exige executar o build/exportação antes e verifica os
arquivos reais, os vínculos de músicas e capítulos, e o leitor usado na PWA.
