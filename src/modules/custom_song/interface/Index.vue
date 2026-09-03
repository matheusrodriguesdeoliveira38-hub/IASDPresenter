<template>
  <v-slide-y-reverse-transition>
    <div v-if="module?.show" class="module-full-page custom-song-page d-flex flex-column">
      <header class="custom-song-header">
        <div class="song-brand">
          <MenuToggleButton class="menu-toggle" @toggle-sidebar="toggleSidebar" />
          <div class="module-icon-box song-brand-icon">
            <v-icon :icon="module.icon" size="22" />
          </div>
          <div>
            <h2>{{ t("title") }}</h2>
            <p>{{ editingMusicId ? "Editando musica salva" : "Nova apresentacao musical" }}</p>
          </div>
        </div>

        <div class="song-actions">
          <div class="workspace-tabs" role="tablist" aria-label="Ferramentas do criador">
            <button
              v-for="tab in workspaceTabs"
              :key="tab.id"
              type="button"
              class="workspace-tab"
              :class="{ active: workspaceMode === tab.id }"
              :aria-selected="workspaceMode === tab.id"
              role="tab"
              @click="workspaceMode = tab.id"
            >
              <v-icon :icon="tab.icon" size="15" />
              <span>{{ tab.label }}</span>
            </button>
          </div>

          <v-btn
            v-if="editingMusicId"
            variant="tonal"
            class="song-secondary-action text-none"
            prepend-icon="mdi-plus"
            :disabled="saving"
            @click="resetForm"
          >
            Nova
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            class="song-save-action text-none"
            prepend-icon="mdi-content-save-outline"
            :disabled="!canSave"
            :loading="saving"
            @click="saveSong"
          >
            {{ editingMusicId ? "Salvar" : "Finalizar" }}
          </v-btn>
        </div>
      </header>

      <div class="custom-song-layout">
        <aside class="custom-song-sidebar">
          <section class="custom-song-panel editor-panel">
            <div class="panel-title">
              <v-icon :icon="activePanelIcon" size="17" />
              <span>{{ activePanelTitle }}</span>
              <v-spacer />
              <span v-if="workspaceMode === 'edit'" class="slide-position-badge">
                Slide {{ previewIndex + 1 }}
              </span>
            </div>

            <div v-if="workspaceMode === 'edit'" class="editor-fields">
              <template v-if="previewIndex === 0">
                <label class="field-caption" for="song-title">Texto principal</label>
                <v-textarea
                  id="song-title"
                  v-model="form.name"
                  placeholder="//      G  D
Titulo da musica"
                  variant="outlined"
                  rows="4"
                  density="compact"
                  hide-details="auto"
                  no-resize
                />
                <p class="field-help">Linhas iniciadas com // aparecem somente no retorno.</p>
              </template>

              <template v-else-if="selectedLyricSlide">
                <label class="field-caption" for="slide-lyric">Letra e cifras</label>
                <v-textarea
                  id="slide-lyric"
                  v-model="selectedLyricSlide.text"
                  placeholder="//       Bb    C
A Ele a gloria"
                  variant="outlined"
                  rows="4"
                  density="compact"
                  hide-details="auto"
                  no-resize
                />
                <div class="slide-meta-row">
                  <v-text-field
                    v-model="selectedLyricSlide.aux"
                    label="Marcador"
                    placeholder="Verso, Coro..."
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                  <v-text-field
                    v-model="selectedLyricSlide.time"
                    label="Inicio"
                    placeholder="00:00"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </div>
                <v-textarea
                  v-model="selectedLyricSlide.notes"
                  label="Notas para o retorno"
                  placeholder="Lembrete, entrada do vocal..."
                  variant="outlined"
                  rows="2"
                  density="compact"
                  hide-details="auto"
                  no-resize
                />
              </template>
            </div>

            <div v-else-if="workspaceMode === 'file'" class="editor-fields file-fields">
              <v-text-field
                v-model="form.artist"
                label="Artista ou descricao"
                variant="outlined"
                density="compact"
                hide-details="auto"
              />
              <v-text-field
                v-model="form.duration"
                label="Duracao"
                placeholder="00:00"
                variant="outlined"
                density="compact"
                hide-details="auto"
              />
              <div class="audio-picker">
                <v-icon color="primary" size="20">mdi-music-box-outline</v-icon>
                <div class="audio-file">
                  <strong>Arquivo MP3</strong>
                  <p>{{ form.audioPath ? fileName(form.audioPath) : "Nenhum arquivo selecionado" }}</p>
                </div>
                <v-btn variant="text" color="primary" icon size="small" @click="chooseAudio">
                  <v-icon>mdi-folder-music-outline</v-icon>
                  <v-tooltip activator="parent" location="bottom">Selecionar MP3</v-tooltip>
                </v-btn>
                <v-btn
                  v-if="form.audioPath"
                  variant="text"
                  color="error"
                  icon
                  size="small"
                  @click="form.audioPath = ''"
                >
                  <v-icon>mdi-close</v-icon>
                  <v-tooltip activator="parent" location="bottom">Remover MP3</v-tooltip>
                </v-btn>
              </div>
              <v-btn
                variant="tonal"
                color="primary"
                class="text-none justify-start"
                prepend-icon="mdi-file-upload-outline"
                block
                @click="importLyricsTxt"
              >
                Importar letra em TXT
              </v-btn>
            </div>

            <div v-else class="timing-recorder">
              <audio
                ref="timingAudio"
                :src="audioPreviewSource"
                preload="metadata"
                @loadedmetadata="onAudioMetadata"
                @timeupdate="onAudioTimeUpdate"
                @ended="isTimingPlaying = false"
              />
              <div class="timing-recorder-head">
                <div>
                  <strong>Sincronizar slides</strong>
                  <p>{{ audioPreviewSource ? "Reproduza o MP3 e marque cada entrada." : "Adicione um MP3 na aba Arquivo." }}</p>
                </div>
                <v-btn
                  icon
                  size="small"
                  color="primary"
                  variant="tonal"
                  :disabled="!audioPreviewSource"
                  @click="toggleTimingAudio"
                >
                  <v-icon>{{ isTimingPlaying ? "mdi-pause" : "mdi-play" }}</v-icon>
                </v-btn>
              </div>
              <v-slider
                v-model="timingCurrentTime"
                :max="timingDuration || 1"
                :disabled="!audioPreviewSource"
                color="primary"
                hide-details
                density="compact"
                step="0.1"
                @update:model-value="seekTimingAudio"
              />
              <div class="timing-clock">
                {{ formatSeconds(timingCurrentTime) }} / {{ formatSeconds(timingDuration) }}
              </div>
              <v-btn
                variant="flat"
                color="primary"
                class="text-none"
                prepend-icon="mdi-timer-check-outline"
                :disabled="!canRecordSelectedSlideTime"
                block
                @click="recordSelectedSlideTime"
              >
                Gravar neste slide
              </v-btn>
            </div>
          </section>

          <section v-if="workspaceMode !== 'file'" class="custom-song-panel slides-panel">
            <div class="panel-title">
              <v-icon size="17">mdi-view-carousel-outline</v-icon>
              <span>Lista de slides</span>
              <v-spacer />
              <span class="slides-count">{{ projectionPreviewSlides.length }} slides</span>
              <v-btn icon size="x-small" variant="tonal" color="primary" @click="addSlide">
                <v-icon size="16">mdi-plus</v-icon>
                <v-tooltip activator="parent" location="bottom">Adicionar slide</v-tooltip>
              </v-btn>
            </div>

            <div class="slide-list">
              <button
                v-for="(slide, index) in projectionPreviewSlides"
                :key="slide.uid"
                type="button"
                class="slide-list-item"
                :class="{ active: previewIndex === index }"
                @click="previewIndex = index"
              >
                <span class="slide-number">{{ index + 1 }}</span>
                <span class="slide-copy">
                  <strong>{{ previewSlideTitle(slide, index) }}</strong>
                  <small>{{ index === 0 ? "Slide de titulo" : (form.slides[index - 1]?.aux || "Sem texto auxiliar") }}</small>
                </span>
                <span v-if="index > 0" class="slide-row-actions">
                  <v-icon
                    size="15"
                    :class="{ disabled: index === 1 }"
                    @click.stop="moveSlide(index - 1, -1)"
                  >mdi-arrow-up</v-icon>
                  <v-icon
                    size="15"
                    :class="{ disabled: index === form.slides.length }"
                    @click.stop="moveSlide(index - 1, 1)"
                  >mdi-arrow-down</v-icon>
                  <v-icon
                    size="15"
                    :class="{ disabled: form.slides.length === 1 }"
                    @click.stop="removeSlide(index - 1)"
                  >mdi-delete-outline</v-icon>
                </span>
              </button>
            </div>

            <button type="button" class="add-slide-button" @click="addSlide">
              <v-icon size="17">mdi-plus</v-icon>
              Adicionar slide
            </button>
          </section>

          <section v-else class="custom-song-panel saved-panel file-songs-panel">
            <div class="panel-title">
              <v-icon size="17">mdi-playlist-music-outline</v-icon>
              <span>Musicas criadas</span>
              <v-spacer />
              <span class="slides-count">{{ customSongs.length }}</span>
              <v-btn icon size="x-small" variant="tonal" color="primary" :loading="loadingSongs" @click="loadCustomSongs">
                <v-icon size="16">mdi-refresh</v-icon>
                <v-tooltip activator="parent" location="bottom">Atualizar lista</v-tooltip>
              </v-btn>
            </div>

            <v-list v-if="customSongs.length" density="compact" class="created-songs-list file-created-songs pa-0">
              <v-list-item
                v-for="song in customSongs"
                :key="song.id_music"
                class="saved-song-item"
                :active="editingMusicId === song.id_music"
                @click="editSong(song.id_music)"
              >
                <template #prepend>
                  <span class="saved-song-icon"><v-icon size="16">mdi-music-note</v-icon></span>
                </template>
                <v-list-item-title class="text-truncate">{{ song.name }}</v-list-item-title>
                <v-list-item-subtitle>
                  {{ song.duration || "00:00" }}
                </v-list-item-subtitle>
                <template #append>
                  <div class="saved-song-actions">
                    <v-btn
                      icon
                      size="x-small"
                      variant="text"
                      color="primary"
                      aria-label="Editar musica"
                      @click.stop="editSong(song.id_music)"
                    >
                      <v-icon size="17">mdi-pencil-outline</v-icon>
                      <v-tooltip activator="parent" location="bottom">Editar música</v-tooltip>
                    </v-btn>
                    <v-btn
                      icon
                      size="x-small"
                      variant="text"
                      color="error"
                      aria-label="Excluir musica"
                      :loading="deletingMusicId === song.id_music"
                      :disabled="deletingMusicId !== null && deletingMusicId !== song.id_music"
                      @click.stop="confirmDeleteSong(song)"
                    >
                      <v-icon size="17">mdi-delete-outline</v-icon>
                      <v-tooltip activator="parent" location="bottom">Excluir música</v-tooltip>
                    </v-btn>
                  </div>
                </template>
              </v-list-item>
            </v-list>

            <div v-else class="empty-created-songs">
              <span class="empty-created-icon"><v-icon size="24">mdi-music-note-plus</v-icon></span>
              <strong>Nenhuma musica criada</strong>
              <p>Finalize sua primeira musica para encontra-la aqui.</p>
            </div>
          </section>
        </aside>

        <main class="custom-song-workspace">
          <section ref="previewFrame" class="preview-stage">
            <div class="preview-slide">
              <LSlide
                v-if="activeProjectionPreview"
                :slide_number="previewIndex"
                :cover="activeProjectionPreview.cover"
                :text="activeProjectionPreview.lyric"
                :aux_text="activeProjectionPreview.aux_lyric"
                :image="activeProjectionPreview.url_image || null"
                :image_position="activeProjectionPreview.image_position"
              />
            </div>

            <div class="preview-controls">
              <button type="button" :disabled="previewIndex === 0" @click="previewIndex = 0">
                <v-icon size="17">mdi-skip-previous</v-icon>
              </button>
              <button type="button" :disabled="previewIndex === 0" @click="previewIndex--">
                <v-icon size="18">mdi-chevron-left</v-icon>
              </button>
              <span><strong>{{ previewIndex + 1 }}</strong> / {{ projectionPreviewSlides.length }}</span>
              <button
                type="button"
                :disabled="previewIndex === projectionPreviewSlides.length - 1"
                @click="previewIndex++"
              >
                <v-icon size="18">mdi-chevron-right</v-icon>
              </button>
              <button
                type="button"
                :disabled="previewIndex === projectionPreviewSlides.length - 1"
                @click="previewIndex = projectionPreviewSlides.length - 1"
              >
                <v-icon size="17">mdi-skip-next</v-icon>
              </button>
              <button type="button" @click="togglePreviewFullscreen">
                <v-icon size="17">mdi-fullscreen</v-icon>
              </button>
            </div>
          </section>

          <footer class="workspace-status">
            <div>
              <span class="status-dot" />
              <strong>{{ lyricText(form.name) || "Titulo da musica" }}</strong>
            </div>
            <span>{{ form.artist || "Sem artista" }}</span>
            <span>{{ form.duration || "00:00" }}</span>
          </footer>
        </main>
      </div>
    </div>
  </v-slide-y-reverse-transition>
</template>

<script lang="ts">
import LSlide from "@/components/Slide.vue";
import MenuToggleButton from "@/components/MenuToggleButton.vue";
import manifest from "../manifest.json";

const CUSTOM_ALBUM_ID = 900001;
const CUSTOM_CATEGORY_FALLBACK_ID = "cds";
const CUSTOM_CATEGORY_NAME = "CDs Oficiais/Ano";
const CUSTOM_ALBUM_NAME = "Personalizadas";
const CUSTOM_STORAGE_KEY = "custom_song_draft";

export default {
  name: manifest.id,
  components: {
    LSlide,
    MenuToggleButton,
  },
  data: () => ({
    saving: false,
    loadingSongs: false,
    deletingMusicId: null,
    editingMusicId: null,
    customSongs: [],
    workspaceMode: "edit",
    workspaceTabs: [
      { id: "edit", label: "Editar", icon: "mdi-pencil-outline" },
      { id: "file", label: "Arquivo", icon: "mdi-folder-outline" },
      { id: "sync", label: "Sincronia", icon: "mdi-timer-music-outline" },
    ],
    previewIndex: 0,
    timingCurrentTime: 0,
    timingDuration: 0,
    isTimingPlaying: false,
    form: {
      name: "",
      artist: "",
      duration: "00:00",
      audioPath: "",
      slides: [],
    },
  }),
  computed: {
    module_id() {
      return manifest.id;
    },
    module() {
      return this.$modules.get(this.module_id);
    },
    canSave() {
      return this.lyricText(this.form.name) && this.form.slides.some((slide) => this.lyricText(slide.text));
    },
    activePreview() {
      return this.form.slides[this.previewIndex] || this.form.slides[0] || {};
    },
    projectionPreviewSlides() {
      const showTitle = this.$userdata.get("modules.config.slide_show_title") !== false;
      return [
        {
          uid: "title-preview",
          lyric: showTitle ? this.toSlideHtml(this.lyricText(this.form.name) || "Titulo da musica") : "",
          aux_lyric: "",
          cover: true,
          url_image: "",
          image_position: "center center",
        },
        ...this.form.slides.map((slide) => ({
          uid: slide.uid,
          lyric: this.toSlideHtml(this.lyricText(slide.text)),
          aux_lyric: this.toSlideHtml(slide.aux),
          cover: false,
          url_image: "",
          image_position: "center center",
        })),
      ];
    },
    activeProjectionPreview() {
      return this.projectionPreviewSlides[this.previewIndex] || this.projectionPreviewSlides[0] || null;
    },
    selectedLyricSlide() {
      return this.previewIndex > 0 ? this.form.slides[this.previewIndex - 1] || null : null;
    },
    activePanelTitle() {
      return {
        edit: "Editor de letra",
        file: "Arquivo da musica",
        sync: "Sincronizar slides",
      }[this.workspaceMode];
    },
    activePanelIcon() {
      return {
        edit: "mdi-format-text",
        file: "mdi-folder-music-outline",
        sync: "mdi-timer-music-outline",
      }[this.workspaceMode];
    },
    audioPreviewSource() {
      if (!this.form.audioPath) return "";
      if (String(this.form.audioPath).startsWith("/musics/")) {
        return this.$path.file(this.form.audioPath);
      }
      return this.$localFile.toLocalAppUrl(this.form.audioPath);
    },
    canRecordSelectedSlideTime() {
      return this.audioPreviewSource && this.previewIndex > 0 && this.form.slides[this.previewIndex - 1];
    },
  },
  watch: {
    audioPreviewSource() {
      this.isTimingPlaying = false;
      this.timingCurrentTime = 0;
      this.timingDuration = 0;
    },
    form: {
      handler(value) {
        this.$userdata.set(CUSTOM_STORAGE_KEY, value);
      },
      deep: true,
    },
  },
  mounted() {
    const draft = this.$userdata.get(CUSTOM_STORAGE_KEY);
    if (draft && Array.isArray(draft.slides)) {
      this.form = {
        name: draft.titleChords ? this.mergeInlineChords(draft.name, draft.titleChords) : draft.name || "",
        artist: draft.artist || "",
        duration: draft.duration || "00:00",
        audioPath: draft.audioPath || "",
        slides: draft.slides.length ? draft.slides : [this.createSlide()],
      };
    } else {
      this.form.slides = [this.createSlide()];
    }
    this.loadCustomSongs();
  },
  methods: {
    t(text) {
      return this.$t(`modules.${this.module_id}.${text}`);
    },
    toggleSidebar() {
      const mainEl = document.querySelector(".main-container");
      if (mainEl) mainEl.dispatchEvent(new CustomEvent("toggle-sidebar"));
    },
    createSlide() {
      return {
        uid: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        text: "",
        notes: "",
        aux: "",
        time: "00:00",
      };
    },
    addSlide() {
      this.form.slides.push(this.createSlide());
      this.previewIndex = this.projectionPreviewSlides.length - 1;
    },
    removeSlide(index) {
      this.form.slides.splice(index, 1);
      this.previewIndex = Math.min(this.previewIndex, this.projectionPreviewSlides.length - 1);
    },
    moveSlide(index, direction) {
      const target = index + direction;
      if (target < 0 || target >= this.form.slides.length) return;
      const [slide] = this.form.slides.splice(index, 1);
      this.form.slides.splice(target, 0, slide);
      this.previewIndex = target + 1;
    },
    async togglePreviewFullscreen() {
      const preview = this.$refs.previewFrame;
      if (!preview) return;
      if (document.fullscreenElement) {
        await document.exitFullscreen?.();
      } else {
        await preview.requestFullscreen?.();
      }
    },
    fileName(filePath) {
      return String(filePath).split(/[\\/]/).pop();
    },
    toSlideHtml(text) {
      return String(text || "").trim().replace(/[\r\n]+/g, "<br>");
    },
    lyricText(text) {
      return String(text || "")
        .split(/\r?\n/)
        .filter((line) => !/^\s*\/\//.test(line))
        .join("\n")
        .trim();
    },
    chordText(text) {
      return String(text || "")
        .split(/\r?\n/)
        .filter((line) => /^\s*\/\//.test(line))
        .map((line) => line.replace(/^(\s*)\/\/ ?/, "$1"))
        .join("\n")
        .trimEnd();
    },
    mergeInlineChords(text, chords) {
      const chordLines = String(chords || "")
        .split(/\r?\n/)
        .map((line) => `// ${  line}`)
        .join("\n");
      return [chordLines, text].filter(Boolean).join("\n");
    },
    previewSlideTitle(slide, index) {
      if (index === 0) return "Titulo";
      return String(slide.lyric || "").replace(/<br\s*\/?>/gi, " ") || "Slide vazio";
    },
    async chooseAudio() {
      if (!window.electronAPI?.openFileDialog) {
        this.$alert.error({ text: "Selecao de arquivo disponivel apenas no aplicativo desktop.", translate: false });
        return;
      }

      const filePath = await window.electronAPI.openFileDialog({
        title: "Selecionar MP3",
        filters: [{ name: "Audio MP3", extensions: ["mp3"] }],
      });
      if (filePath) this.form.audioPath = filePath;
    },
    async importLyricsTxt() {
      if (!window.electronAPI?.openFileDialog || !window.electronAPI?.readTextFile) {
        this.$alert.error({ text: "Importacao de TXT disponivel apenas no aplicativo desktop.", translate: false });
        return;
      }

      try {
        const filePath = await window.electronAPI.openFileDialog({
          title: "Importar letra de musica",
          filters: [{ name: "Arquivo de texto", extensions: ["txt"] }],
        });
        if (!filePath) return;

        const file = await window.electronAPI.readTextFile(filePath);
        if (!file?.ok) throw new Error(file?.error || "Nao foi possivel ler o arquivo selecionado.");

        const importedSlides = String(file.content || "")
          .replace(/^\uFEFF/, "")
          .trim()
          .split(/(?:\r?\n)[\t ]*(?:\r?\n)+/)
          .map((text) => text.trim())
          .filter(Boolean)
          .map((text) => ({ ...this.createSlide(), text }));

        if (!importedSlides.length) {
          this.$alert.error({ text: "O arquivo TXT nao possui uma letra valida.", translate: false });
          return;
        }

        const hasExistingLyrics = this.form.slides.some((slide) => slide.text.trim());
        this.form.slides = hasExistingLyrics
          ? [...this.form.slides, ...importedSlides]
          : importedSlides;
        this.previewIndex = hasExistingLyrics ? this.form.slides.length - importedSlides.length + 1 : 1;

        if (!this.form.name.trim()) {
          this.form.name = this.fileName(filePath).replace(/\.txt$/i, "");
        }

        this.$alert.info({
          text: `${importedSlides.length  } slide${  importedSlides.length === 1 ? "" : "s"  } importado${  importedSlides.length === 1 ? "" : "s"  }.`,
          translate: false,
        });
      } catch (error) {
        this.$alert.error({ text: "Nao foi possivel importar a letra do arquivo TXT.", error, translate: false });
      }
    },
    async toggleTimingAudio() {
      const audio = this.$refs.timingAudio;
      if (!audio || !this.audioPreviewSource) return;

      if (audio.paused) {
        try {
          await audio.play();
          this.isTimingPlaying = true;
        } catch (error) {
          this.$alert.error({ text: "Nao foi possivel reproduzir o MP3 selecionado.", error, translate: false });
        }
      } else {
        audio.pause();
        this.isTimingPlaying = false;
      }
    },
    seekTimingAudio(value) {
      const audio = this.$refs.timingAudio;
      if (!audio || Number.isNaN(Number(value))) return;
      audio.currentTime = Number(value);
      this.timingCurrentTime = Number(value);
    },
    onAudioMetadata(event) {
      this.timingDuration = event.target.duration || 0;
    },
    onAudioTimeUpdate(event) {
      this.timingCurrentTime = event.target.currentTime || 0;
      this.timingDuration = event.target.duration || this.timingDuration || 0;
    },
    recordSelectedSlideTime() {
      if (!this.canRecordSelectedSlideTime) return;
      this.recordSlideTime(this.previewIndex - 1);
    },
    recordSlideTime(index) {
      const slide = this.form.slides[index];
      if (!slide) return;
      slide.time = this.formatSeconds(this.timingCurrentTime);
      this.previewIndex = index + 1;
    },
    formatSeconds(value) {
      const totalSeconds = Math.max(0, Math.floor(Number(value) || 0));
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (hours > 0) {
        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
      }
      return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    },
    async saveSong() {
      if (!this.canSave || this.saving) return;
      this.saving = true;
      const wasEditing = !!this.editingMusicId;

      try {
        const locale = this.$i18n.locale || "pt";
        let urlMusic = this.form.audioPath && String(this.form.audioPath).startsWith("/musics/")
          ? this.form.audioPath
          : "";

        if (this.form.audioPath && !urlMusic) {
          if (!window.electronAPI?.saveCustomMusic) {
            throw new Error("Nao foi possivel copiar o arquivo MP3.");
          }
          urlMusic = await window.electronAPI.saveCustomMusic(this.form.audioPath);
          if (!urlMusic) throw new Error("Nao foi possivel salvar o MP3 selecionado.");
        }

        const album = await this.ensureAlbum(locale);
        const customState = this.$userdata.get("custom_songs_state") || {};
        const editingSummary = this.editingMusicId
          ? (album.musics || []).find((music) => music.id_music === this.editingMusicId)
          : null;
        const lastTrack = Math.max(
          Number(customState.track) || 0,
          ...(album.musics || []).map((music) => Number(music.track) || 0),
        );
        const lastMusicId = Math.max(
          Number(customState.nextMusicId) ? Number(customState.nextMusicId) - 1 : 900000,
          ...(album.musics || []).map((music) => Number(music.id_music) || 0),
        );
        const nextMusicId = this.editingMusicId || Math.max(lastMusicId + 1, 900001);
        const track = editingSummary?.track || lastTrack + 1;
        const baseAlbum = this.createAlbum(track);
        const { categories, categoryId } = await this.ensureCategories(locale, baseAlbum);
        album.categories = [categoryId];
        const musicSummary = this.createMusicSummary(nextMusicId, track, urlMusic);
        const musicData = this.createMusicData(musicSummary, categoryId);

        album.musics = [
          ...(album.musics || []).filter((music) => music.id_music !== nextMusicId),
          musicSummary,
        ].sort((a, b) => a.track - b.track);

        await window.electronAPI.saveLocalDb(`${locale}_categories`, this.toPlainObject(categories));
        await window.electronAPI.saveLocalDb(`${locale}_musics`, this.toPlainObject(await this.mergeMusicIndex(locale, musicSummary)));
        await window.electronAPI.saveLocalDb(`album_${CUSTOM_ALBUM_ID}`, this.toPlainObject(album));
        await window.electronAPI.saveLocalDb(`music_${nextMusicId}`, this.toPlainObject(musicData));

        sessionStorage.removeItem(`db:${locale}_categories`);
        sessionStorage.removeItem(`db:${locale}_musics`);
        sessionStorage.removeItem(`db:album_${CUSTOM_ALBUM_ID}`);
        sessionStorage.removeItem(`db:music_${nextMusicId}`);

        if (!wasEditing) {
          this.$userdata.set("custom_songs_state", {
            nextMusicId: nextMusicId + 1,
            track,
          });
        }

        this.resetForm();
        await this.loadCustomSongs();
        this.$alert.info({
          text: wasEditing
            ? "Musica atualizada em Albuns e Coletaneas > Personalizadas."
            : "Musica criada e salva em Albuns e Coletaneas > Personalizadas.",
          translate: false,
        });
      } catch (error) {
        this.$alert.error({
          text: "Nao foi possivel finalizar a musica.",
          error,
          translate: false,
        });
      } finally {
        this.saving = false;
      }
    },
    async loadCustomSongs() {
      this.loadingSongs = true;
      try {
        const album = window.electronAPI?.getLocalDb
          ? await window.electronAPI.getLocalDb(`album_${CUSTOM_ALBUM_ID}`)
          : null;
        this.customSongs = (album?.musics || []).slice().sort((a, b) => (a.track || 0) - (b.track || 0));
      } finally {
        this.loadingSongs = false;
      }
    },
    async editSong(idMusic) {
      if (!window.electronAPI?.getLocalDb) {
        this.$alert.error({ text: "Edicao disponivel apenas no aplicativo desktop.", translate: false });
        return;
      }

      const music = await window.electronAPI.getLocalDb(`music_${idMusic}`);
      if (!music) {
        this.$alert.error({ text: "Nao foi possivel carregar a musica selecionada.", translate: false });
        return;
      }

      const slides = Object.values(music.lyric || {})
        .filter((slide) => slide.show_slide !== 0)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((slide) => ({
          uid: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          text: slide.source_text || slide.lyric || "",
          notes: slide.notes || "",
          aux: slide.aux_lyric || "",
          time: slide.time || "00:00",
        }));

      this.editingMusicId = idMusic;
      this.previewIndex = 0;
      this.form = {
        name: music.title_source_text || this.mergeInlineChords(music.name, music.title_chords) || music.name || "",
        artist: music.artist || "",
        duration: music.duration || "00:00",
        audioPath: music.url_music || "",
        slides: slides.length ? slides : [this.createSlide()],
      };
    },
    confirmDeleteSong(song) {
      if (!song || this.deletingMusicId !== null) return;

      this.$alert.yesno({
        text: `Deseja excluir "${song.name}"? Esta musica sera removida da coletanea Personalizadas.`,
        translate: false,
      }, async (response) => {
        if (response === "yes") await this.deleteSong(song);
      });
    },
    async deleteSong(song) {
      if (!song || !window.electronAPI?.saveLocalDb) {
        this.$alert.error({ text: "Exclusao disponivel apenas no aplicativo desktop.", translate: false });
        return;
      }

      const idMusic = song.id_music;
      this.deletingMusicId = idMusic;

      try {
        const locale = this.$i18n.locale || "pt";
        const album = await this.ensureAlbum(locale);
        const musicData = window.electronAPI?.getLocalDb
          ? await window.electronAPI.getLocalDb(`music_${idMusic}`)
          : null;
        const musicIndex = await this.loadLocalDb(`${locale}_musics`, []);
        const nextAlbum = {
          ...album,
          musics: (album.musics || []).filter((music) => music.id_music !== idMusic),
        };
        const nextMusicIndex = Array.isArray(musicIndex)
          ? musicIndex.filter((music) => music.id_music !== idMusic)
          : [];

        await window.electronAPI.saveLocalDb(`${locale}_musics`, this.toPlainObject(nextMusicIndex));
        await window.electronAPI.saveLocalDb(`album_${CUSTOM_ALBUM_ID}`, this.toPlainObject(nextAlbum));

        if (musicData?.url_music && window.electronAPI?.deleteMedia) {
          const filename = String(musicData.url_music).replace(/^\/musics\//, "");
          if (filename) await window.electronAPI.deleteMedia("music", filename);
        }

        sessionStorage.removeItem(`db:${locale}_musics`);
        sessionStorage.removeItem(`db:album_${CUSTOM_ALBUM_ID}`);
        sessionStorage.removeItem(`db:music_${idMusic}`);

        if (this.editingMusicId === idMusic) this.resetForm();
        await this.loadCustomSongs();
        this.$alert.info({ text: "Musica excluida da coletanea Personalizadas.", translate: false });
      } catch (error) {
        this.$alert.error({
          text: "Nao foi possivel excluir a musica.",
          error: error?.message || String(error),
          translate: false,
        });
      } finally {
        this.deletingMusicId = null;
      }
    },
    createAlbum(track) {
      return {
        id_album: CUSTOM_ALBUM_ID,
        name: CUSTOM_ALBUM_NAME,
        subtitle: "Letras criadas no app",
        order: 1,
        track,
        color: "#0097d7",
        url_image: "",
      };
    },
    async ensureCategories(locale, album) {
      const categories = await this.$database.get(`${locale}_categories`) || [];
      const legacyCategoryIndex = categories.findIndex((item) => item.id_category === "custom");
      const legacyCategory = legacyCategoryIndex >= 0 ? categories[legacyCategoryIndex] : null;
      let category = categories.find((item) => item.name === CUSTOM_CATEGORY_NAME);

      if (!category) {
        category = {
          id_category: CUSTOM_CATEGORY_FALLBACK_ID,
          name: CUSTOM_CATEGORY_NAME,
          order: 1,
          albums: [],
        };
        categories.push(category);
      }

      if (legacyCategory?.albums?.length) {
        const legacyAlbum = legacyCategory.albums.find((item) => item.id_album === CUSTOM_ALBUM_ID);
        if (legacyAlbum) album = { ...legacyAlbum, ...album };
      }

      const albumIndex = category.albums.findIndex((item) => item.id_album === CUSTOM_ALBUM_ID);
      if (albumIndex >= 0) {
        category.albums.splice(albumIndex, 1, { ...category.albums[albumIndex], ...album });
      } else {
        category.albums.push(album);
      }

      if (legacyCategoryIndex >= 0) {
        categories.splice(legacyCategoryIndex, 1);
      }

      return { categories, categoryId: category.id_category };
    },
    async ensureAlbum(locale) {
      const localAlbum = window.electronAPI?.getLocalDb
        ? await window.electronAPI.getLocalDb(`album_${CUSTOM_ALBUM_ID}`)
        : null;

      return localAlbum || {
        id_album: CUSTOM_ALBUM_ID,
        name: CUSTOM_ALBUM_NAME,
        description: "Letras personalizadas criadas no app",
        categories: [CUSTOM_CATEGORY_NAME],
        color: "#0097d7",
        url_image: "",
        musics: [],
        locale,
      };
    },
    async mergeMusicIndex(locale, musicSummary) {
      const current = sessionStorage.getItem(`db:${locale}_musics`);
      let index = current ? JSON.parse(current) : await this.$database.get(`${locale}_musics`);
      if (!Array.isArray(index)) index = [];

      const existing = index.findIndex((item) => item.id_music === musicSummary.id_music);
      const indexedMusic = {
        ...musicSummary,
        albums_names: CUSTOM_ALBUM_NAME,
        lyric: this.form.slides.map((slide) => this.lyricText(slide.text)).join(" "),
      };

      if (existing >= 0) index.splice(existing, 1, indexedMusic);
      else index.push(indexedMusic);

      return index;
    },
    async loadLocalDb(file, fallback) {
      const cached = sessionStorage.getItem(`db:${file}`);
      if (cached) return JSON.parse(cached);

      if (window.electronAPI?.getLocalDb) {
        const local = await window.electronAPI.getLocalDb(file);
        if (local) return local;
      }

      return fallback;
    },
    createMusicSummary(idMusic, track, urlMusic) {
      return {
        id_music: idMusic,
        name: this.lyricText(this.form.name),
        duration: this.normalizeTime(this.form.duration),
        track,
        has_music: urlMusic ? 1 : 0,
        has_instrumental_music: 0,
        url_music: urlMusic,
        url_instrumental_music: "",
      };
    },
    createMusicData(summary, categoryId) {
      const albumRef = {
        id_album: CUSTOM_ALBUM_ID,
        name: CUSTOM_ALBUM_NAME,
        track: summary.track,
        order: summary.track,
        url_image: "",
      };

      return {
        ...summary,
        artist: this.form.artist.trim(),
        title_source_text: String(this.form.name || "").trim(),
        title_chords: this.chordText(this.form.name),
        albums: [albumRef],
        categories: [categoryId],
        url_image: "",
        image_position: "center center",
        instrumental_duration: "00:00",
        lyric: this.form.slides
          .filter((slide) => this.lyricText(slide.text))
          .map((slide, index) => ({
            id_lyric: index + 1,
            lyric: this.lyricText(slide.text),
            source_text: String(slide.text || "").trim(),
            notes: String(slide.notes || "").trim(),
            aux_lyric: slide.aux.trim(),
            order: index + 1,
            show_slide: 1,
            time: this.normalizeTime(slide.time),
            instrumental_time: this.normalizeTime(slide.time),
            url_image: "",
            image_position: "center center",
          })),
      };
    },
    normalizeTime(value) {
      const clean = String(value || "00:00").trim();
      if (/^\d{1,2}:\d{2}:\d{2}$/.test(clean)) return clean;
      if (/^\d{1,3}:\d{2}$/.test(clean)) return clean;
      return "00:00";
    },
    resetForm() {
      this.editingMusicId = null;
      this.previewIndex = 0;
      this.form = {
        name: "",
        artist: "",
        duration: "00:00",
        audioPath: "",
        slides: [this.createSlide()],
      };
      this.$userdata.set(CUSTOM_STORAGE_KEY, this.form);
    },
    toPlainObject(value) {
      return JSON.parse(JSON.stringify(value));
    },
  },
};
</script>

<style scoped>
.custom-song-header {
  padding: 20px 24px 0;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.section-title {
  color: var(--sidebar-text);
  font-size: 22px;
  font-weight: 600;
  line-height: 1;
}

.custom-song-layout {
  display: grid;
  grid-template-columns: minmax(260px, 330px) minmax(0, 1fr);
  gap: 20px;
  padding: 24px;
  min-height: 0;
  overflow: hidden;
  flex: 1;
}

.custom-song-sidebar,
.custom-song-workspace {
  min-height: 0;
  overflow: hidden;
}

.custom-song-sidebar {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.custom-song-workspace {
  display: grid;
  grid-template-rows: auto clamp(360px, 48vh, 520px);
  gap: 14px;
  align-content: start;
}

.custom-song-panel {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.05);
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.saved-panel {
  flex: 1;
  overflow: hidden;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--sidebar-text);
  font-size: 14px;
  font-weight: 700;
}

.audio-picker {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--main-bg);
}

.audio-file {
  min-width: 0;
  flex: 1;
}

.audio-picker p {
  margin: 2px 0 0;
  color: var(--sidebar-text-secondary);
  font-size: 12px;
  word-break: break-word;
}

.timing-recorder {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--main-bg);
  padding: 10px;
}

.timing-recorder audio {
  display: none;
}

.timing-recorder-head {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: space-between;
}

.timing-recorder-head strong {
  color: var(--sidebar-text);
  font-size: 13px;
}

.timing-recorder-head p {
  color: var(--sidebar-text-secondary);
  font-size: 12px;
  line-height: 1.25;
  margin: 2px 0 0;
}

.timing-recorder-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--sidebar-text-secondary);
  font-size: 12px;
  margin-top: 4px;
}

.created-songs-list {
  flex: 1;
  overflow-y: auto;
  background: transparent;
}

.saved-song-item,
.preview-list-item {
  border-radius: 8px;
  margin-bottom: 4px;
}

.empty-state {
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  color: var(--sidebar-text-secondary);
  font-size: 13px;
  padding: 14px;
  text-align: center;
}

.preview-strip {
  display: grid;
  grid-template-columns: minmax(260px, 420px) minmax(0, 1fr);
  gap: 14px;
  min-height: 190px;
}

.preview-list {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  min-height: 0;
  overflow-y: auto;
  padding: 8px;
}

.slides-workarea {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  padding: 16px;
}

.slides-title {
  flex-shrink: 0;
}

.slides-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  min-height: 0;
  padding-right: 4px;
}

.slide-editor {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
  background: color-mix(in srgb, var(--card-bg) 92%, var(--main-bg));
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.slide-editor:focus-within {
  border-color: rgba(0, 151, 215, 0.55);
  box-shadow: 0 0 0 3px rgba(0, 151, 215, 0.08);
}

.slide-editor-head {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}

.slide-meta-row {
  display: grid;
  grid-template-columns: minmax(160px, 1fr) 120px;
  gap: 8px;
  margin-top: 8px;
}

.slide-marker-field,
.slide-time-field {
  min-width: 0;
}

.preview-slide {
  position: relative;
  aspect-ratio: 16 / 9;
  background: #000;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.preview-title {
  font-size: 15px;
  font-weight: 700;
  opacity: 0.72;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-lyric {
  white-space: pre-line;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
  overflow: hidden;
  overflow-wrap: anywhere;
}

@media (max-width: 1200px) {
  .custom-song-layout {
    grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
  }

  .preview-strip {
    grid-template-columns: 1fr;
    min-height: 0;
  }

  .preview-list {
    max-height: 150px;
  }
}

@media (max-width: 900px) {
  .custom-song-layout {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }

  .custom-song-sidebar,
  .custom-song-workspace {
    overflow: visible;
  }

  .custom-song-workspace {
    grid-template-rows: auto 460px;
  }

  .saved-panel {
    max-height: 320px;
  }
}

@media (max-width: 760px) {
  .custom-song-layout {
    padding: 14px;
  }

  .slide-meta-row {
    grid-template-columns: 1fr;
  }

  .custom-song-header {
    padding: 16px 14px 0;
  }
}

/* Presentation-first identity that inherits the active IASDPresenter theme. */
.custom-song-page {
  --song-bg: var(--main-bg);
  --song-panel: var(--card-bg);
  --song-panel-deep: color-mix(in srgb, var(--card-bg) 88%, var(--main-bg));
  --song-line: var(--border-color);
  --song-text: var(--sidebar-text);
  --song-muted: var(--sidebar-text-secondary);
  --song-accent: var(--accent-blue);
  --song-accent-soft: var(--sidebar-hover);
  background:
    radial-gradient(circle at 76% 18%, rgba(var(--accent-blue-rgb), 0.07), transparent 34%),
    var(--song-bg);
  color: var(--song-text);
  min-height: 0;
  overflow: hidden;
}

.custom-song-page,
.custom-song-page *,
.custom-song-page *::before,
.custom-song-page *::after {
  box-sizing: border-box;
}

.custom-song-header {
  align-items: center;
  display: flex;
  flex-wrap: nowrap;
  gap: 20px;
  justify-content: space-between;
  padding: 24px 28px 18px;
}

.song-brand,
.song-actions,
.workspace-tabs {
  align-items: center;
  display: flex;
}

.song-brand {
  gap: 12px;
  min-width: 0;
}

.menu-toggle {
  margin-right: 2px !important;
}

.song-brand-icon {
  align-items: center;
  background: linear-gradient(145deg, #02b9ee, #0878b5);
  border: 1px solid rgba(88, 218, 255, 0.42);
  border-radius: 10px;
  box-shadow: 0 7px 18px rgba(0, 169, 232, 0.3);
  color: white;
  display: flex;
  height: 38px;
  justify-content: center;
  width: 38px;
}

.song-brand h2 {
  color: var(--song-text);
  font-size: 24px;
  font-weight: 750;
  letter-spacing: -0.02em;
  line-height: 1.1;
  margin: 0;
  white-space: nowrap;
}

.song-brand p {
  color: var(--song-muted);
  font-size: 13px;
  margin: 4px 0 0;
}

.song-actions {
  gap: 9px;
  justify-content: flex-end;
}

.workspace-tabs {
  background: var(--song-panel);
  border: 1px solid var(--song-line);
  border-radius: 13px;
  box-shadow: var(--shadow);
  gap: 3px;
  padding: 3px;
}

.workspace-tab {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 9px;
  color: var(--song-muted);
  cursor: pointer;
  display: flex;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  gap: 5px;
  min-height: 34px;
  padding: 0 13px;
  transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.workspace-tab:hover {
  background: var(--song-accent-soft);
  color: var(--song-text);
}

.workspace-tab.active {
  background: linear-gradient(180deg, var(--accent-blue), var(--accent-blue-dark));
  box-shadow: 0 5px 12px rgba(var(--accent-blue-rgb), 0.24);
  color: white;
}

.song-save-action,
.song-secondary-action {
  border-radius: 8px !important;
  font-size: 12px !important;
  font-weight: 750 !important;
  letter-spacing: 0 !important;
}

.song-save-action {
  box-shadow: 0 7px 18px rgba(var(--accent-blue-rgb), 0.22);
}

.song-secondary-action {
  color: var(--song-text) !important;
}

.custom-song-layout {
  display: grid;
  flex: 1;
  gap: 20px;
  grid-template-columns: clamp(340px, 25vw, 380px) minmax(0, 1fr);
  min-height: 0;
  overflow: hidden;
  padding: 0 28px 28px;
  width: 100%;
  box-sizing: border-box;
}

.custom-song-sidebar {
  display: grid;
  gap: 12px;
  grid-template-rows: minmax(250px, auto) minmax(250px, 1fr);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  padding-right: 1px;
}

.custom-song-panel {
  background: var(--song-panel);
  border: 1px solid var(--song-line);
  border-radius: 14px;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  min-width: 0;
  padding: 16px;
  width: 100%;
  max-width: 100%;
}

.editor-panel {
  max-height: 420px;
  overflow: hidden;
}

.panel-title {
  color: var(--song-text);
  flex-shrink: 0;
  font-size: 14px;
  gap: 7px;
}

.panel-title > .v-icon {
  color: var(--song-accent);
}

.slide-position-badge,
.slides-count {
  background: var(--song-accent-soft);
  border-radius: 999px;
  color: var(--song-accent);
  font-size: 11px;
  font-weight: 750;
  padding: 3px 7px;
}

.editor-fields,
.file-fields {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 2px;
  width: 100%;
}

.field-caption {
  color: var(--song-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.field-help {
  color: var(--song-muted);
  font-size: 11px;
  line-height: 1.35;
  margin: -5px 2px 0;
}

.custom-song-page :deep(.v-field) {
  background: var(--song-panel-deep);
  border-radius: 8px;
  color: var(--song-text);
  font-size: 14px;
}

.custom-song-page :deep(.v-field__outline) {
  --v-field-border-opacity: 0.25;
  color: var(--song-muted);
}

.custom-song-page :deep(.v-field--focused .v-field__outline) {
  color: var(--song-accent);
}

.custom-song-page :deep(.v-label) {
  color: var(--song-muted);
  font-size: 12px;
}

.custom-song-page :deep(.v-field__input) {
  font-size: 14px;
  line-height: 1.4;
}

.custom-song-page :deep(textarea),
.custom-song-page :deep(input) {
  color: var(--song-text);
}

.slide-meta-row {
  display: grid;
  gap: 8px;
  grid-template-columns: minmax(0, 1fr) 86px;
  margin-top: 0;
}

.audio-picker {
  background: var(--song-panel-deep);
  border: 1px solid var(--song-line);
  border-radius: 8px;
  color: var(--song-text);
  padding: 8px;
}

.audio-file strong {
  font-size: 13px;
}

.audio-picker p {
  color: var(--song-muted);
  font-size: 11px;
  margin-top: 2px;
}

.saved-songs-heading {
  align-items: center;
  color: var(--song-muted);
  display: flex;
  font-size: 12px;
  font-weight: 700;
  justify-content: space-between;
  margin-top: 2px;
}

.created-songs-list {
  background: transparent !important;
  max-height: 115px;
  overflow-y: auto;
}

.file-created-songs {
  flex: 1;
  max-height: none;
  min-height: 0;
}

.file-songs-panel {
  overflow: hidden;
}

.saved-song-item {
  background: var(--song-panel-deep);
  border: 1px solid transparent;
  border-radius: 7px !important;
  color: var(--song-text);
  margin-bottom: 4px;
  min-height: 52px !important;
}

.saved-song-actions {
  align-items: center;
  display: flex;
  gap: 2px;
}

.saved-song-item :deep(.v-list-item-title) {
  font-size: 13px;
  font-weight: 650;
  line-height: 1.35;
}

.saved-song-item :deep(.v-list-item-subtitle) {
  font-size: 11px;
  line-height: 1.35;
}

.saved-song-item:hover,
.saved-song-item.v-list-item--active {
  background: var(--song-accent-soft) !important;
  border-color: rgba(var(--accent-blue-rgb), 0.32);
}

.saved-song-icon,
.empty-created-icon {
  align-items: center;
  background: var(--song-accent-soft);
  border-radius: 7px;
  color: var(--song-accent);
  display: flex;
  height: 28px;
  justify-content: center;
  width: 28px;
}

.empty-created-songs {
  align-items: center;
  border: 1px dashed var(--song-line);
  border-radius: 9px;
  color: var(--song-muted);
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  min-height: 130px;
  padding: 18px;
  text-align: center;
}

.empty-created-songs strong {
  color: var(--song-text);
  font-size: 13px;
  margin-top: 9px;
}

.empty-created-songs p {
  font-size: 11px;
  line-height: 1.4;
  margin: 4px 0 0;
}

.empty-state {
  border-color: var(--song-line);
  color: var(--song-muted);
  font-size: 10px;
  padding: 10px;
}

.timing-recorder {
  background: transparent;
  border: 0;
  color: var(--song-text);
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0;
}

.timing-recorder-head strong {
  color: var(--song-text);
  font-size: 14px;
}

.timing-recorder-head p {
  color: var(--song-muted);
  font-size: 12px;
}

.timing-clock {
  color: var(--song-text);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.slides-panel {
  padding-bottom: 12px;
}

.slide-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 7px;
  min-height: 0;
  min-width: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding-right: 2px;
}

.slide-list-item {
  align-items: center;
  background: var(--song-panel-deep);
  border: 1px solid transparent;
  border-radius: 8px;
  color: var(--song-text);
  cursor: pointer;
  display: flex;
  flex-shrink: 0;
  gap: 9px;
  min-height: 50px;
  padding: 8px 10px;
  text-align: left;
  transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
  max-width: 100%;
  width: 100%;
}

.slide-list-item:hover {
  background: var(--song-accent-soft);
}

.slide-list-item.active {
  background: var(--song-accent-soft);
  border-color: rgba(var(--accent-blue-rgb), 0.62);
  box-shadow: 0 0 0 1px rgba(var(--accent-blue-rgb), 0.08), inset 0 0 22px rgba(var(--accent-blue-rgb), 0.04);
}

.slide-number {
  align-items: center;
  background: var(--song-accent-soft);
  border-radius: 50%;
  color: var(--song-muted);
  display: flex;
  flex: 0 0 26px;
  font-size: 11px;
  font-weight: 800;
  height: 26px;
  justify-content: center;
}

.slide-list-item.active .slide-number {
  background: linear-gradient(145deg, var(--accent-blue), var(--accent-blue-dark));
  color: white;
}

.slide-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.slide-copy strong,
.slide-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slide-copy strong {
  color: var(--song-text);
  font-size: 12px;
  line-height: 1.3;
}

.slide-copy small {
  color: var(--song-muted);
  font-size: 10px;
  margin-top: 2px;
}

.slide-list-item.active .slide-copy strong {
  color: var(--song-accent);
}

.slide-row-actions {
  align-items: center;
  color: var(--song-muted);
  display: none;
  gap: 2px;
}

.slide-list-item:hover .slide-row-actions,
.slide-list-item:focus-visible .slide-row-actions {
  display: flex;
}

.slide-row-actions .v-icon {
  border-radius: 4px;
  padding: 2px;
}

.slide-row-actions .v-icon:hover {
  color: var(--song-accent);
}

.slide-row-actions .disabled {
  opacity: 0.22;
  pointer-events: none;
}

.add-slide-button {
  align-items: center;
  background: transparent;
  border: 1px dashed var(--song-line);
  border-radius: 8px;
  color: var(--song-accent);
  cursor: pointer;
  display: flex;
  flex-shrink: 0;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  gap: 5px;
  justify-content: center;
  min-height: 40px;
  transition: background 0.18s ease, border-color 0.18s ease;
  width: 100%;
}

.add-slide-button:hover {
  background: var(--song-accent-soft);
  border-color: rgba(var(--accent-blue-rgb), 0.55);
}

.custom-song-workspace {
  align-items: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 0;
  overflow: hidden;
  padding: clamp(6px, 2vw, 26px) clamp(4px, 2.2vw, 30px) 0;
}

.preview-stage {
  align-items: center;
  display: flex;
  justify-content: center;
  max-height: 100%;
  max-width: 1040px;
  min-height: 0;
  position: relative;
  width: 100%;
}

.preview-slide {
  aspect-ratio: 16 / 9;
  background: #1c315f;
  border: 1px solid rgba(67, 91, 151, 0.34);
  border-radius: 14px;
  box-shadow: 0 24px 55px rgba(0, 0, 0, 0.38), 0 7px 19px rgba(0, 0, 0, 0.26);
  overflow: hidden;
  position: relative;
  width: 100%;
}

.preview-slide::after {
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.015);
  content: "";
  inset: 0;
  pointer-events: none;
  position: absolute;
}

.preview-controls {
  align-items: center;
  backdrop-filter: blur(12px);
  background: rgba(12, 21, 47, 0.88);
  border: 1px solid rgba(103, 122, 172, 0.24);
  border-radius: 999px;
  bottom: 17px;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.3);
  display: flex;
  gap: 4px;
  left: 50%;
  padding: 5px 7px;
  position: absolute;
  transform: translateX(-50%);
  z-index: 2;
}

.preview-controls button {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 50%;
  color: #dce4f4;
  cursor: pointer;
  display: flex;
  height: 31px;
  justify-content: center;
  transition: background 0.18s ease, color 0.18s ease;
  width: 31px;
}

.preview-controls button:hover:not(:disabled) {
  background: rgba(58, 76, 121, 0.5);
  color: white;
}

.preview-controls button:disabled {
  color: #3d4865;
  cursor: default;
}

.preview-controls span {
  color: #9da9c4;
  font-size: 10px;
  min-width: 43px;
  text-align: center;
}

.preview-controls strong {
  color: white;
  font-weight: 800;
}

.preview-stage:fullscreen {
  background: #0c0c13;
  max-width: none;
  padding: 4vh 4vw;
}

.preview-stage:fullscreen .preview-slide {
  max-height: 92vh;
  width: auto;
}

.workspace-status {
  align-items: center;
  color: var(--song-muted);
  display: flex;
  font-size: 12px;
  gap: 16px;
  justify-content: flex-end;
  max-width: 1040px;
  padding: 11px 5px 0;
  width: 100%;
}

.workspace-status div {
  align-items: center;
  display: flex;
  gap: 7px;
  margin-right: auto;
  min-width: 0;
}

.workspace-status strong {
  color: var(--song-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-dot {
  background: #1bc67a;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(27, 198, 122, 0.55);
  flex: 0 0 6px;
  height: 6px;
  width: 6px;
}

@media (max-width: 1100px) {
  .custom-song-layout {
    grid-template-columns: 330px minmax(0, 1fr);
  }

  .workspace-tab {
    padding: 0 8px;
  }
}

@media (max-width: 860px) {
  .custom-song-page {
    overflow-y: auto;
  }

  .custom-song-header {
    align-items: flex-start;
    flex-direction: column;
    padding: 16px;
  }

  .song-actions {
    justify-content: space-between;
    width: 100%;
  }

  .custom-song-layout {
    grid-template-columns: 1fr;
    overflow: visible;
    padding: 0 16px 20px;
  }

  .custom-song-sidebar {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 360px;
    overflow: visible;
  }

  .custom-song-workspace {
    min-height: 420px;
    overflow: visible;
    padding: 8px 0 0;
  }
}

@media (max-width: 620px) {
  .song-actions {
    align-items: stretch;
    flex-wrap: wrap;
  }

  .workspace-tabs {
    order: 3;
    width: 100%;
  }

  .workspace-tab {
    flex: 1;
    justify-content: center;
  }

  .custom-song-sidebar {
    grid-template-columns: 1fr;
    grid-template-rows: 350px 390px;
  }

  .preview-controls {
    bottom: 9px;
  }

  .preview-controls button {
    height: 27px;
    width: 27px;
  }
}
</style>
