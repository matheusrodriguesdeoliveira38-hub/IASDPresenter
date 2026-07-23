<template>
  <v-slide-y-reverse-transition>
    <div v-if="module?.show" class="module-full-page dashboard-home d-flex flex-column">
      <div class="search-header pb-0 flex-shrink-0 custom-song-header">
        <MenuToggleButton class="mr-4" @toggle-sidebar="toggleSidebar" />
        <div class="d-flex align-center mr-auto">
          <div class="module-icon-box d-flex align-center justify-center mr-4">
            <v-icon :icon="module.icon" size="24" />
          </div>
          <h2 class="section-title mb-0">
            {{ t("title") }}
          </h2>
        </div>
        <v-btn
          v-if="editingMusicId"
          variant="tonal"
          class="text-none font-weight-bold"
          prepend-icon="mdi-plus"
          :disabled="saving"
          @click="resetForm"
        >
          Nova musica
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          class="text-none font-weight-bold"
          prepend-icon="mdi-content-save"
          :disabled="!canSave"
          :loading="saving"
          @click="saveSong"
        >
          {{ editingMusicId ? "Salvar alteracoes" : "Finalizar" }}
        </v-btn>
      </div>

      <div class="content-main custom-song-layout">
        <aside class="custom-song-sidebar">
          <section class="custom-song-panel">
            <div class="panel-title">
              <v-icon color="primary">
                mdi-file-music-outline
              </v-icon>
              <span>Dados</span>
            </div>

            <v-text-field
              v-model="form.name"
              label="Titulo"
              variant="outlined"
              density="compact"
              hide-details="auto"
            />
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
              <v-icon color="primary" size="20">
                mdi-music-box-outline
              </v-icon>
              <div class="audio-file">
                <strong>MP3</strong>
                <p>{{ form.audioPath ? fileName(form.audioPath) : "Opcional" }}</p>
              </div>
              <v-btn
                variant="text"
                color="primary"
                icon
                size="small"
                @click="chooseAudio"
              >
                <v-icon>mdi-folder-music-outline</v-icon>
                <v-tooltip activator="parent" location="bottom" open-delay="300">
                  Selecionar MP3
                </v-tooltip>
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
                <v-tooltip activator="parent" location="bottom" open-delay="300">
                  Remover MP3
                </v-tooltip>
              </v-btn>
            </div>

            <div class="timing-recorder">
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
                  <p>{{ audioPreviewSource ? "Reproduza o MP3 e grave o tempo de entrada." : "Selecione um MP3 para marcar os tempos." }}</p>
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
                  <v-tooltip activator="parent" location="bottom" open-delay="300">
                    {{ isTimingPlaying ? "Pausar MP3" : "Tocar MP3" }}
                  </v-tooltip>
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
              <div class="timing-recorder-actions">
                <span>{{ formatSeconds(timingCurrentTime) }} / {{ formatSeconds(timingDuration) }}</span>
                <v-btn
                  size="small"
                  variant="tonal"
                  color="primary"
                  class="text-none"
                  prepend-icon="mdi-timer-check-outline"
                  :disabled="!canRecordSelectedSlideTime"
                  @click="recordSelectedSlideTime"
                >
                  Gravar no slide selecionado
                </v-btn>
              </div>
            </div>
          </section>

          <section class="custom-song-panel saved-panel">
            <div class="panel-title">
              <v-icon color="primary">
                mdi-playlist-edit
              </v-icon>
              <span>Criadas</span>
              <v-spacer />
              <v-btn
                icon
                size="small"
                variant="text"
                :loading="loadingSongs"
                @click="loadCustomSongs"
              >
                <v-icon>mdi-refresh</v-icon>
                <v-tooltip activator="parent" location="bottom" open-delay="300">
                  Atualizar lista
                </v-tooltip>
              </v-btn>
            </div>

            <v-list v-if="customSongs.length" density="compact" class="created-songs-list pa-0">
              <v-list-item
                v-for="song in customSongs"
                :key="song.id_music"
                class="saved-song-item"
                :active="editingMusicId === song.id_music"
                @click="editSong(song.id_music)"
              >
                <template #prepend>
                  <v-icon color="primary" size="18">
                    mdi-music-note
                  </v-icon>
                </template>
                <v-list-item-title class="text-truncate">
                  {{ song.name }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ song.duration || "00:00" }}
                </v-list-item-subtitle>
                <template #append>
                  <v-btn
                    icon
                    size="small"
                    variant="text"
                    color="primary"
                    :disabled="!audioPreviewSource"
                    @click="recordSlideTime(index)"
                  >
                    <v-icon>mdi-timer-marker-outline</v-icon>
                    <v-tooltip activator="parent" location="bottom" open-delay="300">
                      Gravar tempo atual
                    </v-tooltip>
                  </v-btn>
                  <v-btn
                    icon
                    size="small"
                    variant="text"
                    color="primary"
                    @click.stop="editSong(song.id_music)"
                  >
                    <v-icon>mdi-pencil-outline</v-icon>
                    <v-tooltip activator="parent" location="bottom" open-delay="300">
                      Editar musica
                    </v-tooltip>
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>
            <div v-else class="empty-state">
              Nenhuma musica personalizada salva ainda.
            </div>
          </section>
        </aside>

        <main class="custom-song-workspace">
          <section class="preview-strip">
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
            <div class="preview-list">
              <v-list density="compact" class="bg-transparent pa-0">
                <v-list-item
                  v-for="(slide, index) in projectionPreviewSlides"
                  :key="slide.uid"
                  class="preview-list-item"
                  :active="previewIndex === index"
                  @click="previewIndex = index"
                >
                  <template #prepend>
                    <v-avatar size="22" color="primary" class="text-white text-caption">
                      {{ index + 1 }}
                    </v-avatar>
                  </template>
                  <v-list-item-title class="text-truncate">
                    {{ previewSlideTitle(slide, index) }}
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </div>
          </section>

          <section class="slides-workarea">
            <div class="panel-title slides-title">
              <v-icon color="primary">
                mdi-monitor-screenshot
              </v-icon>
              <span>Slides da letra</span>
              <v-chip size="small" variant="tonal" color="primary">
                {{ form.slides.length }}
              </v-chip>
              <v-spacer />
              <v-btn
                color="primary"
                variant="tonal"
                class="text-none"
                prepend-icon="mdi-plus"
                @click="addSlide"
              >
                Slide
              </v-btn>
            </div>

            <div class="slides-list">
              <article
                v-for="(slide, index) in form.slides"
                :key="slide.uid"
                class="slide-editor"
              >
                <div class="slide-editor-head">
                  <v-chip color="primary" variant="tonal" size="small">
                    Slide {{ index + 1 }}
                  </v-chip>
                  <v-spacer />
                  <v-btn
                    icon
                    size="small"
                    variant="text"
                    :disabled="index === 0"
                    @click="moveSlide(index, -1)"
                  >
                    <v-icon>mdi-arrow-up</v-icon>
                  </v-btn>
                  <v-btn
                    icon
                    size="small"
                    variant="text"
                    :disabled="index === form.slides.length - 1"
                    @click="moveSlide(index, 1)"
                  >
                    <v-icon>mdi-arrow-down</v-icon>
                  </v-btn>
                  <v-btn
                    icon
                    size="small"
                    variant="text"
                    color="error"
                    :disabled="form.slides.length === 1"
                    @click="removeSlide(index)"
                  >
                    <v-icon>mdi-delete-outline</v-icon>
                  </v-btn>
                </div>

                <v-textarea
                  v-model="slide.text"
                  label="Letra do slide"
                  variant="outlined"
                  rows="2"
                  density="compact"
                  hide-details="auto"
                />
                <div class="slide-meta-row">
                  <v-text-field
                    v-model="slide.aux"
                    label="Marcador"
                    placeholder="Verso, Coro..."
                    variant="outlined"
                    density="compact"
                    hide-details
                    class="slide-marker-field"
                  />
                  <v-text-field
                    v-model="slide.time"
                    label="Inicio"
                    placeholder="00:00"
                    variant="outlined"
                    density="compact"
                    hide-details
                    class="slide-time-field"
                  />
                </div>
              </article>
            </div>
          </section>
        </main>
      </div>
    </div>
  </v-slide-y-reverse-transition>
</template>

<script>
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
    editingMusicId: null,
    customSongs: [],
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
      return this.form.name.trim() && this.form.slides.some((slide) => slide.text.trim());
    },
    activePreview() {
      return this.form.slides[this.previewIndex] || this.form.slides[0] || {};
    },
    projectionPreviewSlides() {
      const showTitle = this.$userdata.get("modules.config.slide_show_title") !== false;
      return [
        {
          uid: "title-preview",
          lyric: showTitle ? this.form.name || "Titulo da musica" : "",
          aux_lyric: "",
          cover: true,
          url_image: "",
          image_position: "center center",
        },
        ...this.form.slides.map((slide) => ({
          uid: slide.uid,
          lyric: this.toSlideHtml(slide.text),
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
        name: draft.name || "",
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
      this.previewIndex = target;
    },
    fileName(filePath) {
      return String(filePath).split(/[\\/]/).pop();
    },
    toSlideHtml(text) {
      return String(text || "").trim().replace(/[\r\n]+/g, "<br>");
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
          text: slide.lyric || "",
          aux: slide.aux_lyric || "",
          time: slide.time || "00:00",
        }));

      this.editingMusicId = idMusic;
      this.previewIndex = 0;
      this.form = {
        name: music.name || "",
        artist: music.artist || "",
        duration: music.duration || "00:00",
        audioPath: music.url_music || "",
        slides: slides.length ? slides : [this.createSlide()],
      };
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
        lyric: this.form.slides.map((slide) => slide.text).join(" "),
      };

      if (existing >= 0) index.splice(existing, 1, indexedMusic);
      else index.push(indexedMusic);

      return index;
    },
    createMusicSummary(idMusic, track, urlMusic) {
      return {
        id_music: idMusic,
        name: this.form.name.trim(),
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
        albums: [albumRef],
        categories: [categoryId],
        url_image: "",
        image_position: "center center",
        instrumental_duration: "00:00",
        lyric: this.form.slides
          .filter((slide) => slide.text.trim())
          .map((slide, index) => ({
            id_lyric: index + 1,
            lyric: slide.text.trim(),
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
</style>
