# IASDPresenter

Aplicacao desktop para gerenciamento e apresentacao de musicas, hinos, letras, midias, liturgias e recursos de apoio para cultos e programacoes da IASD.

O IASDPresenter e construido com Electron, Vue 3 e Vuetify, com foco em uso local, projecao em multiplas telas, biblioteca offline, controle remoto na rede local e atualizacoes automaticas via GitHub Releases.

## Destaques

- Apresentacao de musicas, hinos, letras personalizadas e midias.
- Biblioteca local com sincronizacao de dados, capas e arquivos essenciais.
- Projecao em tela estendida, com opcoes para tela principal e monitor de retorno.
- Player interno para audio, video e midias externas.
- Suporte a apresentacoes, PDFs e arquivos multimidia.
- Modulos para Biblia, hinarios, coletaneas, liturgia, relogio, contador, sorteios e animacoes.
- Controle remoto local via navegador, usando o endereco da rede.
- Saida web 1080p para OBS Browser Source e vMix Web Input, sem hardware ou plugins extras.
- Tema claro/escuro e cor principal personalizavel pelo app.
- Logo e identidade visual IASDPresenter.
- Autoatualizacao com `electron-updater` a partir do repositorio oficial.

## Tecnologias

- **Vue.js 3** - Interface principal.
- **Vuetify 3** - Componentes visuais.
- **Electron 42** - Aplicativo desktop nativo.
- **Vite** - Build e servidor de desenvolvimento.
- **Vuex** - Estado global da aplicacao.
- **Vue Router** - Roteamento SPA.
- **Vue I18n** - Internacionalizacao PT-BR e ES.
- **electron-builder** - Geracao de instaladores.
- **electron-updater** - Atualizacoes automaticas.
- **IndexedDB/localStorage** - Persistencia local.

## Repositorio

```bash
git clone https://github.com/matheusrodriguesdeoliveira38-hub/IASDPresenter.git
cd IASDPresenter
```

As atualizacoes do aplicativo sao publicadas pelo GitHub Releases deste repositorio:

```text
matheusrodriguesdeoliveira38-hub/IASDPresenter
```

## Instalacao

```bash
npm install
```

## Scripts

| Comando | Descricao |
| --- | --- |
| `npm run dev` | Inicia o servidor Vite na porta 5173. |
| `npm run host` | Inicia o Vite exposto na rede local. |
| `npm run build` | Gera o build web de producao. |
| `npm run lint` | Executa ESLint com auto-fix. |
| `npm run electron:dev` | Inicia Vite e Electron em modo desenvolvimento. |
| `npm run electron:build` | Gera o build Vite e o instalador Electron. |
| `npm run git:tag` | Cria/publica tag da versao atual. |
| `npm run git:publish` | Fluxo auxiliar de publicacao entre branches. |

## Estrutura do Projeto

```text
IASDPresenter/
|-- electron/              # Processo principal, preload e integracoes nativas
|-- node/                  # Servidor local de arquivos
|-- public/                # Icones, favicon e assets estaticos
|-- src/
|   |-- assets/            # Estilos, fontes e imagens
|   |-- components/        # Componentes reutilizaveis
|   |-- helpers/           # Storage, Database, Media, Theme, Window, etc.
|   |-- layout/            # Sidebar, titlebar, loading, menus e containers
|   |-- modules/           # Modulos funcionais do aplicativo
|   |-- plugins/           # Vuetify, i18n, helpers globais
|   |-- router/            # Rotas
|   |-- store/             # Vuex
|   |-- views/             # Janelas principal e popup
|-- dist/                  # Build web gerado
|-- dist-electron/         # Instaladores gerados pelo electron-builder
|-- dist-mobile/           # Estrutura mobile/Cordova
```

## Modulos

O IASDPresenter usa uma arquitetura modular. Cada modulo fica em `src/modules/<id>/` e pode ter manifest, interface, traducoes e logica propria.

Modulos principais:

- `core/home` - Tela inicial.
- `core/config` - Configuracoes gerais, tema, cor principal, midia e projecao.
- `core/sync` - Sincronizacao da biblioteca local.
- `core/update` - Interface de atualizacoes.
- `core/bible` - Biblia.
- `core/hymnal` e `core/hymnal_1996` - Hinarios.
- `core/collections` - Coletaneas.
- `core/musics` - Musicas.
- `core/media` - Player e apresentacao de midias.
- `core/external_media` - Midias externas.
- `liturgy` - Roteiro/liturgia.
- `presentation` - Apresentacoes.
- `custom_song` - Letras personalizadas.
- `clock` - Relogio.
- `counter` - Contador.
- `random` - Sorteios.
- `animation` - Animacoes.

Estrutura base de um modulo:

```text
src/modules/<id>/
|-- manifest.json          # Metadados do modulo
|-- index.ts               # Registro do modulo
|-- interface/
|   |-- Index.vue          # Interface principal
|-- lang/
|   |-- pt.json            # Traducao PT-BR
|   |-- es.json            # Traducao ES
```

Exemplo de `manifest.json`:

```json
{
  "active": true,
  "id": "meu-modulo",
  "name": "Meu Modulo",
  "version": "1.0.0",
  "description": "Descricao do modulo",
  "author": "iasdpresenter",
  "category": "utilities",
  "icon": "mdi-icon-name",
  "showInMainMenu": false,
  "minAppVersion": "1.0.0",
  "dependencies": [],
  "permissions": []
}
```

Categorias usadas: `musics`, `utilities`, `system`, `media`, `bible`.

## Estado e Persistencia

- **Vuex / `$appdata`** - Estado global temporario da aplicacao.
- **UserData / `$userdata`** - Preferencias do usuario, como idioma, tema, monitores e cor principal.
- **localStorage / `$storage`** - Persistencia local via wrapper.
- **IndexedDB / `$database`** - Dados estruturados da biblioteca.
- **Electron IPC** - Comunicacao entre renderer e main process.
- **Filesystem local** - Armazenamento de arquivos baixados, capas e banco local.

## Aparencia

O aplicativo usa a identidade **IASDPresenter**, com:

- icone triangular do app;
- logo horizontal na sidebar;
- tema claro e escuro;
- cor principal personalizavel em `Configuracoes > Aparencia`.

A cor principal altera os destaques do sistema, incluindo botoes, abas, icones `primary`, selecoes, gradientes e variaveis CSS globais.

## Saida web para OBS e vMix

Com o servidor de rede e a modalidade `Ativar saida web` ligados, o IASDPresenter publica em `http://IP-DO-COMPUTADOR:1975/output` a fonte escolhida entre `Projecao` e `Retorno`. As URLs disponiveis aparecem em `Configuracoes > Rede > Saida web para OBS e vMix` e podem ser copiadas diretamente. A modalidade pode ser desativada sem interromper o controle remoto.

No OBS, adicione uma fonte `Browser Source`; no vMix, use `Web Input`. Cole a URL e configure a fonte com 1920 x 1080. O fluxo so captura quadros enquanto houver um cliente conectado.

## Desenvolvimento Electron

Em desenvolvimento, o Electron abre o app pelo servidor Vite:

```bash
npm run electron:dev
```

Para gerar instalador:

```bash
npm run electron:build
```

Plataformas configuradas:

- Windows: NSIS
- macOS: DMG/ZIP
- Linux: AppImage

### Linux (x64)

A versao Linux e distribuida como `IASDPresenter-VERSAO-linux-x64.AppImage`.
Baixe o arquivo na pagina de Releases, abra um terminal na pasta do download e execute
(substituindo `VERSAO` pelo numero baixado):

```bash
chmod +x IASDPresenter-VERSAO-linux-x64.AppImage
./IASDPresenter-VERSAO-linux-x64.AppImage
```

Use uma sessao grafica de usuario comum. O AppImage deve ficar em uma pasta com
permissao de escrita para permitir atualizacoes. A publicacao inclui `latest-linux.yml`,
utilizado pelo atualizador para localizar a versao Linux.

Para importar PPT/PPTX, instale o LibreOffice Impress pelo gerenciador de pacotes da
distribuicao. PDFs nao precisam do LibreOffice. O aplicativo procura `soffice` ou
`libreoffice` no `PATH`; tambem e possivel definir `LIBREOFFICE_PATH` com o caminho
completo do executavel. A conversao via Microsoft PowerPoint e exclusiva do Windows.

Para desenvolver e gerar o AppImage **em Linux x64**, use Node.js 22 e as ferramentas
de compilacao C/C++ e Python exigidas pelas dependencias nativas:

```bash
npm ci
npm run test:runtime
npm run test:helpers
npm run electron:build:linux
```

O resultado fica em `dist-electron/`. O workflow de release compila em Ubuntu 22.04
e Windows, executa os testes e publica os arquivos de ambas as plataformas na tag.
As dependencias nativas, incluindo SQLite, sao recompiladas para o Electron de cada sistema.

Antes de distribuir uma release Linux, valide em uma maquina Linux com interface grafica:
abertura do aplicativo, biblioteca offline, audio/video, importacao PPT/PDF, projecao
e retorno em monitores separados, controle remoto e atualizacao entre duas versoes.
O posicionamento de janelas e os atalhos globais tambem precisam ser conferidos na
sessao grafica utilizada (X11 ou Wayland).

## Publicacao e Atualizacoes

O app usa `electron-builder` com publicacao no GitHub:

```json
{
  "provider": "github",
  "owner": "matheusrodriguesdeoliveira38-hub",
  "repo": "IASDPresenter"
}
```

Fluxo comum para publicar uma nova versao:

```bash
git add .
git commit -m "Descricao da alteracao"
git push
npm version patch
git push
git push origin vX.Y.Z
```

Ao enviar uma tag `v*`, o workflow do GitHub Actions gera a release e publica os arquivos usados pelo atualizador.

## Licenca

Projeto privado - IASDPresenter.
