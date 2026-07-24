<template>
  <AppSidebar v-model="sidebarOpen" />

  <AppAlert />

  <div class="main-container" :class="{ 'sidebar-open': sidebarOpen }" @toggle-sidebar="toggleSidebar">
    <v-main class="bg-main">
      <AppModules />
      
      <AppTrayArea />

      <transition name="fade-slide">
        <div v-if="isMinimized && showMiniPlayer" class="mini-player-popup elevation-12">
          <v-card
            theme="dark"
            rounded="lg"
            class="overflow-hidden bg-black"
            width="320"
          >
            <div class="mini-player-toolbar d-flex justify-end pa-1 position-absolute w-100" style="z-index: 10;">
              <v-btn 
                icon
                size="x-small" 
                variant="flat" 
                color="rgba(0,0,0,0.6)" 
                class="mx-1 hover-btn"
                @click="maximizePlayer" 
              >
                <v-icon>mdi-arrow-expand-all</v-icon>
                <v-tooltip
                  activator="parent"
                  location="top"
                  open-delay="300"
                  content-class="modern-glass-menu elevation-0 font-weight-medium text-white"
                >
                  Maximizar
                </v-tooltip>
              </v-btn>
              <v-btn 
                icon
                size="x-small" 
                variant="flat" 
                color="rgba(0,0,0,0.6)" 
                class="hover-btn"
                @click="showMiniPlayer = false" 
              >
                <v-icon>mdi-minus</v-icon>
                <v-tooltip
                  activator="parent"
                  location="top"
                  open-delay="300"
                  content-class="modern-glass-menu elevation-0 font-weight-medium text-white"
                >
                  Minimizar
                </v-tooltip>
              </v-btn>
            </div>
            <div class="position-relative w-100 bg-black" style="height: 180px;">
              <LSlide
                v-if="slide"
                :slide_number="config.slide_index"
                :cover="slide.cover == true"
                :text="slide.lyric"
                :aux_text="slide.aux_lyric"
                :image="slide.url_image ? $path.file(slide.url_image) : null"
                :image_position="slide.image_position"
                class="w-100 h-100"
              />
              <div v-else class="w-100 h-100 d-flex align-center justify-center text-grey">
                Sem mídia
              </div>
            </div>
          </v-card>
        </div>
      </transition>

      <!-- External Media MiniPlayer -->
      <transition name="fade-slide">
        <div v-if="isExternalMediaMinimized && showExternalMiniPlayer && (isExternalVideo || isExternalYouTube)" class="mini-player-popup elevation-12">
          <v-card
            theme="dark"
            rounded="lg"
            class="overflow-hidden bg-black"
            width="320"
          >
            <div class="mini-player-toolbar d-flex justify-end pa-1 position-absolute w-100" style="z-index: 10;">
              <v-btn 
                icon
                size="x-small" 
                variant="flat" 
                color="rgba(0,0,0,0.6)" 
                class="mx-1 hover-btn"
                @click="maximizeExternalPlayer" 
              >
                <v-icon>mdi-arrow-expand-all</v-icon>
                <v-tooltip
                  activator="parent"
                  location="top"
                  open-delay="300"
                  content-class="modern-glass-menu elevation-0 font-weight-medium text-white"
                >
                  Maximizar
                </v-tooltip>
              </v-btn>
              <v-btn 
                icon
                size="x-small" 
                variant="flat" 
                color="rgba(0,0,0,0.6)" 
                class="hover-btn"
                @click="showExternalMiniPlayer = false" 
              >
                <v-icon>mdi-minus</v-icon>
                <v-tooltip
                  activator="parent"
                  location="top"
                  open-delay="300"
                  content-class="modern-glass-menu elevation-0 font-weight-medium text-white"
                >
                  Minimizar
                </v-tooltip>
              </v-btn>
            </div>
            <div class="position-relative w-100 bg-black" style="height: 180px;">
              <iframe
                v-if="isExternalYouTube && externalYouTubeEmbedUrl"
                ref="externalMiniPlayerYouTube"
                :src="externalYouTubeEmbedUrl"
                class="w-100 h-100"
                style="border: 0; pointer-events: none;"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowfullscreen
              />
              <video
                v-else-if="externalFilePath"
                ref="externalMiniPlayerVideo"
                :src="externalFilePath"
                class="w-100 h-100"
                style="object-fit: contain;"
                muted
                @loadedmetadata="syncMiniPlayer"
              />
              <div v-else class="w-100 h-100 d-flex align-center justify-center text-grey">
                Sem mídia
              </div>
            </div>
          </v-card>
        </div>
      </transition>
    </v-main>

    <AppFooter />
  </div>
</template>

<script>
import AppFooter from "@/layout/Footer.vue";
import AppSidebar from "@/layout/Sidebar.vue";
import AppModules from "@/layout/Modules.vue";
import AppAlert from "@/layout/Alert.vue";
import AppTrayArea from "@/layout/TrayArea.vue";
import LSlide from "@/components/Slide.vue";
import { isAudioFile, isVideoFile, openExternalMedia } from "@/helpers/ExternalMedia";
import { getYouTubeEmbedUrl, isYouTubeUrl } from "@/helpers/YouTube";

export default {
  name: "MainPage",
  components: {
    AppFooter,
    AppSidebar,
    AppModules,
    AppAlert,
    AppTrayArea,
    LSlide,
  },
  data() {
    return {
      sidebarOpen: false,
      remoteControlUnsubscribe: null,
      remoteControlQueue: Promise.resolve(),
    };
  },
  computed: {
    showMiniPlayer: {
      get() {
        return this.$appdata.get("modules.media.show_mini_player") !== false;
      },
      set(val) {
        this.$appdata.set("modules.media.show_mini_player", val);
      },
    },
    showExternalMiniPlayer: {
      get() {
        return this.$appdata.get("modules.external_media.show_mini_player") !== false;
      },
      set(val) {
        this.$appdata.set("modules.external_media.show_mini_player", val);
      },
    },
    isMinimized() {
      return this.$media.isMinimized();
    },
    isExternalMediaMinimized() {
      return this.$appdata.get("modules.external_media.minimized") === true && this.$appdata.get("modules.external_media.filePath");
    },
    externalFilePath() {
      const raw = this.$appdata.get("modules.external_media.filePath");
      if (!raw) return "";
      if (window.electronAPI) {
        return this.$localFile.toLocalAppUrl(raw);
      }
      return raw;
    },
    isExternalVideo() {
      const raw = this.$appdata.get("modules.external_media.filePath");
      if (!raw) return false;
      return !isYouTubeUrl(raw) && isVideoFile(raw);
    },
    isExternalYouTube() {
      return isYouTubeUrl(this.$appdata.get("modules.external_media.filePath"));
    },
    externalYouTubeEmbedUrl() {
      return getYouTubeEmbedUrl(this.$appdata.get("modules.external_media.filePath"), {
        autoplay: true,
        muted: true,
      });
    },
    externalMediaCurrentTime() {
      return this.$appdata.get("modules.external_media.config.current_time");
    },
    externalMediaIsPaused() {
      return this.$appdata.get("modules.external_media.config.is_paused");
    },
    config() {
      return this.$media.config();
    },
    slide() {
      return this.$media.slide();
    },
  },
  watch: {
    externalMediaCurrentTime(val) {
      if (this.showExternalMiniPlayer && this.$refs.externalMiniPlayerVideo) {
        const video = this.$refs.externalMiniPlayerVideo;
        if (!video.seeking && Math.abs(video.currentTime - val) > 0.5) {
          video.currentTime = val;
        }
      }
    },
    externalMediaIsPaused(val) {
      if (this.showExternalMiniPlayer && this.$refs.externalMiniPlayerVideo) {
        if (val) this.$refs.externalMiniPlayerVideo.pause();
        else this.$refs.externalMiniPlayerVideo.play().catch((err) => {
          console.error("[MiniPlayer] play() failed:", err.message);
        });
      }
    },
    showExternalMiniPlayer(newVal) {
      if (newVal) {
        this.$nextTick(() => {
          if (!this.externalMediaIsPaused && this.$refs.externalMiniPlayerVideo) {
            this.$refs.externalMiniPlayerVideo.currentTime = this.externalMediaCurrentTime || 0;
            this.$refs.externalMiniPlayerVideo.play().catch((err) => {
              console.error("[MiniPlayer] play() failed:", err.message);
            });
          }
        });
      }
    },
    isMinimized(val) {
      if (val) {
        this.showMiniPlayer = true;
      }
    },
    isExternalMediaMinimized(val) {
      if (val && (this.isExternalVideo || this.isExternalYouTube)) {
        this.showExternalMiniPlayer = true;
      }
    },
  },
  mounted() {
    this.closeAllModules();

    this.$userdata.load();

    const theme = this.$userdata.get("theme");
    if (theme !== "") {
      this.$vuetify.theme.global.name = theme;
    }
    this.$appdata.set("is_dark", this.$vuetify.theme.global.current.dark);
    this.$theme.applyAccentColor(this.$vuetify);

    const lang = this.$userdata.get("language");
    if (lang !== "") {
      this.$i18n.locale = lang;
    } else {
      this.$userdata.set("language", this.$i18n.locale);
    }

    const is_dev = import.meta.env.VITE_APP_MODE === "development";
    this.$appdata.set("is_dev", is_dev);

    // beforeunload foi removido para usar o diálogo customizado de fechamento no Titlebar

    this.$appdata.set(
      "is_mobile",
      this.$vuetify.display.platform.android ||
        this.$vuetify.display.platform.ios,
    );

    if (this.$vuetify.display.platform.electron) {
      this.$appdata.set("is_desktop", true);
    } else {
      this.$appdata.set("is_desktop", false);
      this.$appdata.set("is_online", true);
    }

    window.addEventListener("message", (event) => {
      if (event.origin === window.location.origin || event.origin === "file://" || event.origin === "null") {
        if (event.data === "mounted") {
          const popupSource = event.source;
          if (popupSource) {
            const data = this.$appdata.getFlatten();
            Object.keys(data).map((item) => {
              popupSource.postMessage(
                { param: item, value: data[item] },
                "*",
              );
            });
          }
        }
      }
    });

    /*********************************************************************/
    /*********************************************************************/
    /* ********************* PROVISORIO ******************************** */
    if (is_dev) {
      //const self = this;
      setTimeout(() => {
        //self.$media.open({ id_music: 112, mode: "audio", minimized: false });
        //self.$modules.open("clock");
        //self.$modules.open("collections");
        //self.$media.openAlbum(9);
      }, 100);
    }
    /*********************************************************************/
    /*********************************************************************/

    if (window.electronAPI && window.electronAPI.isElectron) {
      window.electronAPI.onNavigateModule((moduleId) => {
        this.$modules.open(moduleId);
      });
      window.electronAPI.onNavigateRoute((routeName) => {
        if (routeName === "help") {
          this.$modules.open("help");
        }
      });
      if (window.electronAPI.onRemoteControlCommand) {
        this.remoteControlUnsubscribe = window.electronAPI.onRemoteControlCommand(
          this.enqueueRemoteControlCommand,
        );
      }
    }
  },
  beforeUnmount() {
    if (this.remoteControlUnsubscribe) {
      this.remoteControlUnsubscribe();
    }
  },
  methods: {
    toggleSidebar() {
      this.sidebarOpen = !this.sidebarOpen;
    },
    enqueueRemoteControlCommand(command) {
      this.remoteControlQueue = this.remoteControlQueue
        .then(() => this.handleRemoteControlCommand(command))
        .catch((error) => {
          console.error("Erro ao executar comando do controle remoto:", error);
        });
    },
    async handleRemoteControlCommand(command) {
      if (!command || typeof command !== "object") return;

      if (command.type === "open_media" && command.id_music) {
        await this.$media.open({
          id_music: Number(command.id_music),
          id_album: command.id_album ? Number(command.id_album) : null,
          mode: command.mode || "audio",
          minimized: false,
        });
        this.$modules.open("media");
        this.$media.maximize();
        await this.projectModule("media");
        await this.$media.syncReturnMonitor(true);
        return;
      }

      if (command.type === "open_bible" && command.bible) {
        this.$appdata.set("modules.bible.data", command.bible);
        this.$modules.open("bible");
        await this.projectModule("bible");
        return;
      }

      if (command.type === "open_liturgy_item" && command.item) {
        await this.openRemoteLiturgyItem(command.item);
        return;
      }

      if (command.type !== "control") return;

      if (this.$appdata.get("popup_module") === "bible") {
        await this.handleRemoteBibleControl(command.action);
        return;
      }

      if (this.$appdata.get("popup_module") === "presentation") {
        await this.handleRemotePresentationControl(command.action);
        return;
      }

      if (
        this.$appdata.get("popup_module") === "external_media" ||
        this.$appdata.get("modules.external_media.filePath")
      ) {
        await this.handleRemoteExternalMediaControl(command.action);
        return;
      }

      switch (command.action) {
      case "play_pause":
        if (this.$media.config()?.is_paused) {
          this.$media.play();
        } else {
          this.$media.pause();
        }
        break;
      case "next":
        this.$media.nextSlide();
        break;
      case "prev":
        this.$media.prevSlide();
        break;
      case "maximize":
        this.$media.maximize();
        break;
      case "close":
        await this.$media.close(true);
        break;
      default:
        break;
      }
    },
    async handleRemotePresentationControl(action) {
      switch (action) {
      case "next":
        this.moveRemotePresentationSlide(1);
        break;
      case "prev":
        this.moveRemotePresentationSlide(-1);
        break;
      case "close":
        await this.$popup.exit();
        this.$modules.close("presentation");
        break;
      default:
        break;
      }
    },
    moveRemotePresentationSlide(direction) {
      const totalSlides = this.$appdata.get("modules.presentation.config.total_slides") || 0;
      if (!totalSlides) return;

      const currentIndex = this.$appdata.get("modules.presentation.config.slide_index") || 0;
      const nextIndex = Math.min(Math.max(currentIndex + direction, 0), totalSlides - 1);
      if (nextIndex === currentIndex) return;

      this.$appdata.set("modules.presentation.config.slide_index", nextIndex);
      window.dispatchEvent(new CustomEvent("presentation-slide-index-change", { detail: nextIndex }));
    },
    async handleRemoteExternalMediaControl(action) {
      switch (action) {
      case "play_pause":
        this.$appdata.set("modules.external_media.config.request_action", {
          action: "toggle_play",
          time: Date.now(),
        });
        break;
      case "next":
        this.$appdata.set("modules.external_media.config.request_action", {
          action: "next_page",
          time: Date.now(),
        });
        break;
      case "prev":
        this.$appdata.set("modules.external_media.config.request_action", {
          action: "prev_page",
          time: Date.now(),
        });
        break;
      case "close":
        this.$appdata.set("modules.external_media.config.request_action", {
          action: "close",
          time: Date.now(),
        });
        break;
      default:
        break;
      }
    },
    async projectModule(moduleName, forceOpen = true) {
      let selectedMonitors = [];
      if (window.electronAPI && window.electronAPI.getDisplays) {
        const displays = await window.electronAPI.getDisplays();
        if (displays && displays.length > 1) {
          let configMonitors = this.$userdata.get("modules.config.slide_monitor");
          if (!Array.isArray(configMonitors)) {
            configMonitors = configMonitors ? [configMonitors] : [];
          }
          const primary = displays.find(d => d.isPrimary) || displays[0];
          selectedMonitors = configMonitors.filter(m => m !== primary.id);
        }
      }

      if (selectedMonitors.length > 0) {
        await this.$popup.syncMonitors(selectedMonitors, moduleName, forceOpen);
      } else {
        const fullscreen = this.$userdata.get("modules.config.slide_fullscreen") !== false;
        await this.$popup.open({ module: moduleName, fullscreen });
      }
    },
    numbersInterval(numbers) {
      if (!numbers || numbers.length === 0) return "";

      const sorted = [...numbers].sort((a, b) => a - b);
      const result = [];
      let start = sorted[0];
      let end = sorted[0];

      for (let i = 1; i <= sorted.length; i++) {
        if (sorted[i] === end + 1) {
          end = sorted[i];
        } else {
          result.push(start === end ? `${start}` : `${start}-${end}`);
          start = sorted[i];
          end = sorted[i];
        }
      }

      return result.join(", ");
    },
    getSelectedBibleVerses(verses, keys) {
      const sorted = [...keys].sort((a, b) => a - b);
      let result = "";
      let previousKey = null;

      sorted.forEach((key) => {
        if (previousKey !== null && key - previousKey > 1) {
          result += " [...] ";
        } else if (result) {
          result += " ";
        }
        result += verses[key] || "";
        previousKey = key;
      });

      return result;
    },
    buildBibleProjectionData({ version, book, chapter, verseNumbers, verses }) {
      const selectedVerses = [...verseNumbers].sort((a, b) => a - b);
      const versesInterval = this.numbersInterval(selectedVerses);

      return {
        id_bible_version: version.id_bible_version,
        id_bible_book: book.id_bible_book,
        version: version.abbreviation,
        book: book.name,
        chapter,
        verses: selectedVerses,
        scriptural_reference: `${book.name} ${chapter}${versesInterval ? `:${versesInterval}` : ""}${version.abbreviation ? ` (${version.abbreviation})` : ""}`.trim(),
        text: this.getSelectedBibleVerses(verses, selectedVerses),
      };
    },
    parseBibleVerseNumbers(input, verses) {
      const selected = new Set();
      const parts = String(input || "").split(",");

      for (const part of parts) {
        const range = part.trim().match(/^(\d+)\s*-\s*(\d+)$/);
        if (range) {
          const start = Number(range[1]);
          const end = Number(range[2]);
          const min = Math.min(start, end);
          const max = Math.max(start, end);
          for (let verse = min; verse <= max; verse++) {
            if (verses[verse]) selected.add(verse);
          }
        } else {
          const verse = Number(part.trim());
          if (!Number.isNaN(verse) && verses[verse]) selected.add(verse);
        }
      }

      return Array.from(selected).sort((a, b) => a - b);
    },
    async openRemoteLiturgyVerse(item) {
      if (!item.verseBookId || !item.verseChapter) return;

      const locale = this.$i18n.locale || "pt";
      const books = await this.$database.get(`${locale}_bible_book`) || [];
      const versions = await this.$database.get(`${locale}_bible_version`) || [];
      const savedVersion = this.$userdata.get("modules.bible.selected_version");
      const version = versions.find(v => Number(v.id_bible_version) === Number(savedVersion))
        || versions.find(v => v.abbreviation === "ARA" || v.name === "ARA")
        || versions[0];
      const book = books.find(b => Number(b.id_bible_book) === Number(item.verseBookId));
      const chapter = Number(item.verseChapter);
      if (!version || !book || !Number.isInteger(chapter)) return;

      const verses = await this.$database.get(`bible_${version.id_bible_version}_${book.id_bible_book}_${chapter}`) || {};
      const verseNumbers = this.parseBibleVerseNumbers(item.verseNumbers || "1", verses);
      if (!verseNumbers.length) return;

      this.$appdata.set("modules.bible.data", this.buildBibleProjectionData({
        version,
        book,
        chapter,
        verseNumbers,
        verses,
      }));
      this.$modules.open("bible");
      await this.projectModule("bible");
    },
    async openRemoteLiturgyItem(item) {
      this.$modules.open("liturgy");

      switch (item.type) {
      case "music":
        if (item.musicId) {
          await this.$media.open({
            id_music: Number(item.musicId),
            mode: item.musicMode || "audio",
            minimized: false,
          });
          this.$modules.open("media");
          this.$media.maximize();
          await this.projectModule("media");
          await this.$media.syncReturnMonitor(true);
        }
        break;
      case "verse":
        await this.openRemoteLiturgyVerse(item);
        break;
      case "media":
        if (item.filePath) {
          const useInternal = this.$userdata.get("modules.config.media_use_internal_player");
          if (useInternal) {
            openExternalMedia(this.$appdata, {
              filePath: item.filePath,
              title: item.name || "",
              subtitle: item.subtitle || "",
            });

            const isAudio = isAudioFile(item.filePath);
            if (isAudio) {
              this.$appdata.set("modules.external_media.minimized", true);
            } else {
              this.$appdata.set("modules.external_media.show", true);
              await this.projectModule("external_media");
            }
          } else if (window.electronAPI?.openPath) {
            window.electronAPI.openPath(item.filePath);
          }
        }
        break;
      case "link":
        if (item.url && isYouTubeUrl(item.url)) {
          openExternalMedia(this.$appdata, {
            filePath: item.url,
            title: item.name || "YouTube",
            subtitle: item.subtitle || item.url,
          });
          this.$appdata.set("modules.external_media.show", true);
          await this.projectModule("external_media");
        } else if (item.url && window.electronAPI?.openExternal) {
          window.electronAPI.openExternal(item.url);
        } else if (item.url) {
          window.open(item.url, "_blank");
        }
        break;
      default:
        break;
      }
    },
    async setRemoteBibleVerse(direction) {
      const current = this.$appdata.get("modules.bible.data");
      if (!current?.id_bible_version || !current?.id_bible_book || !current?.chapter) return;

      const locale = this.$i18n.locale || "pt";
      const books = await this.$database.get(`${locale}_bible_book`) || [];
      const versions = await this.$database.get(`${locale}_bible_version`) || [];
      const version = versions.find(item => Number(item.id_bible_version) === Number(current.id_bible_version));
      let book = books.find(item => Number(item.id_bible_book) === Number(current.id_bible_book));
      if (!version || !book) return;

      let chapter = Number(current.chapter);
      let verses = await this.$database.get(`bible_${version.id_bible_version}_${book.id_bible_book}_${chapter}`);
      let verseNumbers = Object.keys(verses || {}).map(Number).sort((a, b) => a - b);
      if (!verseNumbers.length) return;

      const selected = current.verses?.length ? current.verses.map(Number) : [direction > 0 ? verseNumbers[0] - 1 : verseNumbers[verseNumbers.length - 1] + 1];
      let targetVerse = direction > 0 ? Math.max(...selected) + 1 : Math.min(...selected) - 1;

      if (targetVerse < verseNumbers[0] || targetVerse > verseNumbers[verseNumbers.length - 1]) {
        if (direction > 0) {
          if (chapter < Number(book.chapters)) {
            chapter += 1;
          } else {
            const currentBookIndex = books.findIndex(item => Number(item.id_bible_book) === Number(book.id_bible_book));
            book = books[currentBookIndex < books.length - 1 ? currentBookIndex + 1 : 0];
            chapter = 1;
          }
        } else if (chapter > 1) {
          chapter -= 1;
        } else {
          const currentBookIndex = books.findIndex(item => Number(item.id_bible_book) === Number(book.id_bible_book));
          book = books[currentBookIndex > 0 ? currentBookIndex - 1 : books.length - 1];
          chapter = Number(book.chapters);
        }

        verses = await this.$database.get(`bible_${version.id_bible_version}_${book.id_bible_book}_${chapter}`);
        verseNumbers = Object.keys(verses || {}).map(Number).sort((a, b) => a - b);
        if (!verseNumbers.length) return;
        targetVerse = direction > 0 ? verseNumbers[0] : verseNumbers[verseNumbers.length - 1];
      }

      this.$appdata.set("modules.bible.data", this.buildBibleProjectionData({
        version,
        book,
        chapter,
        verseNumbers: [targetVerse],
        verses,
      }));
    },
    async handleRemoteBibleControl(action) {
      switch (action) {
      case "next":
        await this.setRemoteBibleVerse(1);
        break;
      case "prev":
        await this.setRemoteBibleVerse(-1);
        break;
      case "close":
        this.$popup.exit();
        this.$modules.close("bible");
        this.$appdata.set("modules.bible.data", {
          id_bible_version: null,
          id_bible_book: null,
          version: null,
          book: null,
          chapter: null,
          verses: [],
          scriptural_reference: null,
          text: null,
        });
        break;
      default:
        break;
      }
    },
    syncMiniPlayer() {
      const video = this.$refs.externalMiniPlayerVideo;
      if (video) {
        const currentTime = this.$appdata.get("modules.external_media.config.current_time") || 0;
        video.currentTime = currentTime;
        
        const isPaused = this.$appdata.get("modules.external_media.config.is_paused");
        if (!isPaused) {
          video.play().catch(e => console.log("MiniPlayer play error:", e));
        }
      }
    },
    closeAllModules() {
      const modules = this.$appdata.get("modules") || {};
      for (const key of Object.keys(modules)) {
        this.$appdata.set(`modules.${key}.show`, false);
      }
      if (this.$appdata.get("modules.home")) {
        this.$appdata.set("modules.home.show", true);
      }
    },
    maximizePlayer() {
      this.$media.maximize();
      this.showMiniPlayer = false;
    },
    maximizeExternalPlayer() {
      this.$appdata.set("modules.external_media.show", true);
      this.$appdata.set("modules.external_media.minimized", false);
      this.showExternalMiniPlayer = false;
    },
  },
};
</script>

<style scoped>
.main-container {
  margin-left: var(--sidebar-width);
  transition: margin-left 0.3s ease;
  height: calc(100vh - 32px);
  display: flex;
  flex-direction: column;
}

@media (max-width: 1024px) {
  .main-container {
    margin-left: 0 !important;
  }
}

main {
  display: flex !important;
  flex: auto !important;
  align-items: stretch !important;
  --v-layout-top: 0 !important;
  padding-top: 0 !important;
  overflow: hidden !important;
  position: relative !important;
}

.mini-player-popup {
  position: absolute;
  bottom: 16px;
  left: 16px;
  z-index: 1000;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  border: 1px solid rgba(255,255,255,0.1);
}

.mini-player-toolbar {
  opacity: 0;
  transition: opacity 0.3s ease;
  background: linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%);
  padding-bottom: 20px !important;
}

.mini-player-popup:hover .mini-player-toolbar {
  opacity: 1;
}

.hover-btn {
  transition: all 0.2s;
}

.hover-btn:hover {
  background: rgba(255,255,255,0.2) !important;
  color: white !important;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
</style>
