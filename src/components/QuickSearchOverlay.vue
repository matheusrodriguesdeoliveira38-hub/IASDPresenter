<template>
  <v-dialog v-model="visible" max-width="760" @after-leave="reset">
    <v-card class="quick-search-card" rounded="xl">
      <div class="d-flex align-center px-5 pt-5 pb-3">
        <v-avatar color="primary" variant="tonal" size="42" class="mr-3">
          <v-icon>{{ mode === "music" ? "mdi-music-note-search" : "mdi-book-search-outline" }}</v-icon>
        </v-avatar>
        <div class="flex-grow-1">
          <div class="text-h6 font-weight-bold">
            {{ mode === "music" ? labels.musicTitle : labels.bibleTitle }}
          </div>
          <div class="text-caption quick-search-muted">
            {{ mode === "music" ? labels.musicCaption : labels.bibleCaption }}
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" aria-label="Fechar busca" @click="close" />
      </div>

      <div class="px-5 pb-4">
        <v-text-field
          ref="searchInput"
          v-model="query"
          :placeholder="mode === 'music' ? labels.musicPlaceholder : labels.biblePlaceholder"
          prepend-inner-icon="mdi-magnify"
          variant="solo"
          density="comfortable"
          hide-details
          clearable
          autofocus
          rounded
          @keydown.down.prevent="moveSelection(1)"
          @keydown.up.prevent="moveSelection(-1)"
          @keydown.enter.prevent="activateSelected"
          @keydown.esc.prevent="close"
        />
      </div>

      <v-divider />
      <div class="quick-search-results px-3 py-3">
        <div v-if="loading" class="d-flex justify-center py-10">
          <v-progress-circular indeterminate color="primary" />
        </div>
        <template v-else-if="results.length">
          <button
            v-for="(item, index) in results"
            :key="resultKey(item, index)"
            type="button"
            class="quick-search-result d-flex align-center w-100 pa-3"
            :class="{ selected: index === selectedIndex }"
            @mouseenter="selectedIndex = index"
            @click="activate(item)"
          >
            <v-avatar size="40" color="primary" variant="tonal" class="mr-3 flex-shrink-0">
              <v-icon v-if="mode === 'music' && !musicTrack(item)" size="small">
                mdi-music-note
              </v-icon>
              <span v-else class="text-caption font-weight-bold">{{ resultBadge(item) }}</span>
            </v-avatar>
            <div class="text-left flex-grow-1" style="min-width: 0;">
              <div class="font-weight-bold text-truncate">
{{ resultTitle(item) }}
</div>
              <div class="text-body-2 quick-search-muted text-truncate">
{{ resultSubtitle(item) }}
</div>
            </div>
            <v-icon size="small" class="ml-3 quick-search-muted">
              {{ item.type === "book" || item.type === "chapter" ? "mdi-chevron-right" : "mdi-presentation-play" }}
            </v-icon>
          </button>
        </template>
        <div v-else class="text-center quick-search-muted py-10 px-4">
          <v-icon size="40" class="mb-2">
            {{ query ? "mdi-magnify-close" : "mdi-keyboard-outline" }}
          </v-icon>
          <div>{{ emptyMessage }}</div>
        </div>
      </div>

      <v-divider />
      <div class="quick-search-footer d-flex align-center px-5 py-3 text-caption quick-search-muted">
        <span class="d-flex align-center">
          <kbd><v-icon size="14">mdi-arrow-up</v-icon></kbd>
          <kbd><v-icon size="14">mdi-arrow-down</v-icon></kbd>
          {{ labels.select }}
        </span>
        <span class="ml-4"><kbd>Enter</kbd> {{ selectedActionLabel }}</span>
        <v-spacer />
        <span><kbd>Esc</kbd> {{ labels.close }}</span>
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {
  extractBibleBookSearchPart,
  normalizeBibleSearchText,
  parseBibleSearch,
  parseBibleVerseNumbers,
} from "@/helpers/BibleSearch";

export default {
  name: "QuickSearchOverlay",
  data: () => ({
    visible: false,
    mode: "music",
    query: "",
    selectedIndex: 0,
    loading: false,
    musics: [],
    books: [],
    versions: [],
    selectedBook: null,
    selectedChapter: null,
    bibleVerses: {},
    bibleReferenceResult: null,
    searchToken: 0,
    removeElectronListener: null,
  }),
  computed: {
    labels() {
      return {
        musicTitle: "Busca de M\u00fasicas",
        bibleTitle: "Busca R\u00e1pida da B\u00edblia",
        musicCaption: "Nome ou n\u00famero do hino",
        bibleCaption: "Escolha livro, cap\u00edtulo e verso ou digite a refer\u00eancia",
        musicPlaceholder: "Digite uma m\u00fasica ou n\u00famero...",
        biblePlaceholder: "Ex.: Jo\u00e3o 3:16",
        musicStart: "Comece a digitar o nome ou o n\u00famero do hino.",
        bibleStart: "Digite um livro para iniciar a busca inteligente.",
        noMusic: "Nenhuma m\u00fasica encontrada.",
        noBible: "Nenhuma refer\u00eancia encontrada.",
        music: "M\u00fasica",
        selectChapter: "Selecione o cap\u00edtulo",
        selectVerse: "Selecione o verso para projetar",
        chapter: "Cap\u00edtulo",
        select: "selecionar",
        open: "abrir",
        project: "projetar",
        close: "fechar",
      };
    },
    musicResults() {
      const query = normalizeBibleSearchText(this.query);
      if (!query) return [];
      const number = /^\d+$/.test(query) ? Number(query) : null;
      return this.musics
        .filter((music) => normalizeBibleSearchText(music.name).includes(query) || (
          number !== null && music.albums?.some((album) => (
            album.type === "hymnal" && Number(album.pivot?.track) === number
          ))
        ))
        .sort((a, b) => this.musicScore(b, query, number) - this.musicScore(a, query, number))
        .slice(0, 12);
    },
    bibleBookSuggestions() {
      const query = String(this.query || "").trim();
      if (!query || this.selectedBook) return [];
      const bookPart = extractBibleBookSearchPart(query, this.books);
      const compactBookPart = bookPart.replace(/\s+/g, "");
      if (!bookPart) return [];
      return this.books
        .filter((book) => [book.name, book.abbreviation]
          .filter(Boolean)
          .flatMap((name) => {
            const normalizedName = normalizeBibleSearchText(name);
            return [normalizedName, normalizedName.replace(/\s+/g, "")];
          })
          .some((name) => name.includes(bookPart) || name.includes(compactBookPart) || bookPart.includes(name)))
        .slice(0, 8)
        .map((book) => ({ type: "book", book }));
    },
    bibleResults() {
      if (this.bibleReferenceResult) return [this.bibleReferenceResult];
      if (this.selectedBook && this.selectedChapter) {
        return Object.keys(this.bibleVerses).map(Number).sort((a, b) => a - b).map((verse) => ({
          type: "verse",
          book: this.selectedBook,
          chapter: this.selectedChapter,
          verse,
          text: this.bibleVerses[verse],
        }));
      }
      if (this.selectedBook) {
        return Array.from({ length: Number(this.selectedBook.chapters) }, (_, index) => ({
          type: "chapter",
          book: this.selectedBook,
          chapter: index + 1,
        }));
      }
      return this.bibleBookSuggestions;
    },
    results() {
      return this.mode === "music" ? this.musicResults : this.bibleResults;
    },
    emptyMessage() {
      if (!this.query) return this.mode === "music" ? this.labels.musicStart : this.labels.bibleStart;
      return this.mode === "music" ? this.labels.noMusic : this.labels.noBible;
    },
    selectedActionLabel() {
      const type = this.results[this.selectedIndex]?.type;
      return type === "book" || type === "chapter" ? this.labels.open : this.labels.project;
    },
  },
  watch: {
    query() {
      this.selectedIndex = 0;
      if (this.mode === "bible") this.handleBibleQueryChange();
    },
  },
  mounted() {
    window.addEventListener("keydown", this.handleShortcut, true);
    if (window.electronAPI?.onOpenQuickSearch) {
      this.removeElectronListener = window.electronAPI.onOpenQuickSearch(this.open);
    }
  },
  beforeUnmount() {
    window.removeEventListener("keydown", this.handleShortcut, true);
    if (this.removeElectronListener) this.removeElectronListener();
  },
  methods: {
    handleShortcut(event) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
      if (!["KeyF", "KeyB"].includes(event.code)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      this.open(event.code === "KeyF" ? "music" : "bible");
    },
    async open(mode) {
      this.mode = mode === "bible" ? "bible" : "music";
      this.resetSearchState();
      this.visible = true;
      await this.ensureData();
      this.focusInput();
    },
    close() {
      this.visible = false;
    },
    reset() {
      this.resetSearchState();
      this.loading = false;
      this.searchToken += 1;
    },
    resetSearchState() {
      this.query = "";
      this.selectedIndex = 0;
      this.selectedBook = null;
      this.selectedChapter = null;
      this.bibleVerses = {};
      this.bibleReferenceResult = null;
    },
    async ensureData() {
      this.loading = true;
      const locale = this.$i18n.locale || "pt";
      try {
        if (this.mode === "music" && !this.musics.length) {
          this.musics = await this.$database.get(`${locale}_musics`) || [];
        } else if (this.mode === "bible" && (!this.books.length || !this.versions.length)) {
          const [books, versions] = await Promise.all([
            this.$database.get(`${locale}_bible_book`),
            this.$database.get(`${locale}_bible_version`),
          ]);
          this.books = books || [];
          this.versions = versions || [];
        }
      } finally {
        this.loading = false;
      }
    },
    musicTrack(music) {
      return music.albums?.find((item) => item.type === "hymnal" && item.pivot?.track)?.pivot?.track || music.track || "";
    },
    musicSubtitle(music) {
      return music.albums?.map((album) => album.name).filter(Boolean).join(" - ") || this.labels.music;
    },
    musicScore(music, query, number) {
      const name = normalizeBibleSearchText(music.name);
      let score = name === query ? 100 : name.startsWith(query) ? 50 : 10;
      if (number !== null && music.albums?.some((album) => Number(album.pivot?.track) === number)) score += 200;
      return score;
    },
    handleBibleQueryChange() {
      this.bibleReferenceResult = null;
      const selectedPrefix = this.selectedBook
        ? `${this.selectedBook.name}${this.selectedChapter ? ` ${this.selectedChapter}:` : ""}`
        : "";
      if (selectedPrefix && !String(this.query || "").startsWith(selectedPrefix)) {
        this.selectedBook = null;
        this.selectedChapter = null;
        this.bibleVerses = {};
      }
      const search = parseBibleSearch(this.query, this.books);
      if (search?.book && search.verseQuery) this.loadDirectBibleReference(search);
    },
    async loadDirectBibleReference(search) {
      const token = ++this.searchToken;
      const chapter = Math.min(Math.max(Number(search.chapter) || 1, 1), Number(search.book.chapters));
      const version = this.getBibleVersion();
      if (!version) return;
      this.loading = true;
      try {
        const verses = await this.loadBibleChapter(version, search.book, chapter);
        if (token !== this.searchToken) return;
        const verseNumbers = parseBibleVerseNumbers(search.verseQuery, verses);
        if (!verseNumbers.length) return;
        this.bibleReferenceResult = this.buildBibleResult(version, search.book, chapter, verseNumbers, verses);
      } finally {
        if (token === this.searchToken) this.loading = false;
      }
    },
    selectBibleBook(book) {
      this.selectedBook = book;
      this.selectedChapter = null;
      this.bibleVerses = {};
      this.query = `${book.name} `;
      this.focusInput();
    },
    async selectBibleChapter(book, chapter) {
      const version = this.getBibleVersion();
      if (!version) return;
      this.selectedBook = book;
      this.selectedChapter = chapter;
      this.query = `${book.name} ${chapter}:`;
      this.loading = true;
      try {
        this.bibleVerses = await this.loadBibleChapter(version, book, chapter);
      } finally {
        this.loading = false;
      }
      this.selectedIndex = 0;
      this.focusInput();
    },
    getBibleVersion() {
      const saved = this.$userdata.get("modules.bible.selected_version");
      return this.versions.find((item) => Number(item.id_bible_version) === Number(saved))
        || this.versions.find((item) => item.abbreviation === "ARA" || item.name === "ARA")
        || this.versions[0];
    },
    async loadBibleChapter(version, book, chapter) {
      return await this.$database.get(`bible_${version.id_bible_version}_${book.id_bible_book}_${chapter}`) || {};
    },
    buildBibleResult(version, book, chapter, verseNumbers, verses) {
      const interval = this.numbersInterval(verseNumbers);
      return {
        type: "reference",
        version,
        book,
        chapter,
        verseNumbers,
        verse: interval,
        reference: `${book.name} ${chapter}:${interval} (${version.abbreviation})`,
        text: this.selectedVerseText(verses, verseNumbers),
      };
    },
    moveSelection(direction) {
      if (this.results.length) {
        this.selectedIndex = (this.selectedIndex + direction + this.results.length) % this.results.length;
      }
    },
    activateSelected() {
      if (this.results.length) this.activate(this.results[this.selectedIndex] || this.results[0]);
    },
    async activate(item) {
      if (this.mode === "music") {
        await this.$media.open({ id_music: item.id_music, mode: "audio", minimized: true });
        this.close();
        return;
      }
      if (item.type === "book") {
        this.selectBibleBook(item.book);
        return;
      }
      if (item.type === "chapter") {
        await this.selectBibleChapter(item.book, item.chapter);
        return;
      }
      if (item.type === "verse") {
        const version = this.getBibleVersion();
        if (!version) return;
        item = this.buildBibleResult(version, item.book, item.chapter, [item.verse], this.bibleVerses);
      }
      await this.projectBible(item);
      this.close();
    },
    resultBadge(item) {
      if (this.mode === "music") return this.musicTrack(item);
      if (item.type === "book") return item.book.abbreviation;
      if (item.type === "chapter") return item.chapter;
      return item.verse;
    },
    resultTitle(item) {
      if (this.mode === "music") return item.name;
      if (item.type === "book") return item.book.name;
      if (item.type === "chapter") return `${this.labels.chapter} ${item.chapter}`;
      if (item.type === "verse") return `${item.book.name} ${item.chapter}:${item.verse}`;
      return item.reference;
    },
    resultSubtitle(item) {
      if (this.mode === "music") return this.musicSubtitle(item);
      if (item.type === "book") return this.labels.selectChapter;
      if (item.type === "chapter") return this.labels.selectVerse;
      return item.text;
    },
    resultKey(item, index) {
      if (this.mode === "music") return item.id_music;
      return `${item.type}-${item.book?.id_bible_book || ""}-${item.chapter || ""}-${item.verse || index}`;
    },
    focusInput() {
      this.$nextTick(() => this.$refs.searchInput?.$el?.querySelector("input")?.focus());
    },
    numbersInterval(numbers) {
      const result = [];
      let start = numbers[0];
      let end = numbers[0];
      for (let index = 1; index <= numbers.length; index++) {
        if (numbers[index] === end + 1) end = numbers[index];
        else {
          result.push(start === end ? `${start}` : `${start}-${end}`);
          start = numbers[index];
          end = numbers[index];
        }
      }
      return result.join(", ");
    },
    selectedVerseText(verses, numbers) {
      let result = "";
      let previous = null;
      for (const number of numbers) {
        result += previous !== null && number - previous > 1 ? " [...] " : result ? " " : "";
        result += verses[number];
        previous = number;
      }
      return result;
    },
    async projectBible(item) {
      this.$appdata.set("modules.bible.data", {
        id_bible_version: item.version.id_bible_version,
        id_bible_book: item.book.id_bible_book,
        version: item.version.abbreviation,
        book: item.book.name,
        chapter: item.chapter,
        verses: item.verseNumbers,
        scriptural_reference: item.reference,
        text: item.text,
      });
      await this.openProjection("bible");
    },
    async openProjection(moduleName) {
      if (this.$appdata.get("popup_module") && this.$appdata.get("popup_module") !== moduleName) {
        await this.$popup.exit();
      }
      let monitors = [];
      if (window.electronAPI?.getDisplays) {
        const displays = await window.electronAPI.getDisplays();
        if (displays?.length > 1) {
          let configured = this.$userdata.get("modules.config.slide_monitor") || [];
          if (!Array.isArray(configured)) configured = [configured];
          const primary = displays.find((display) => display.isPrimary) || displays[0];
          monitors = configured.filter((id) => id !== primary.id);
        }
      }
      if (monitors.length) await this.$popup.syncMonitors(monitors, moduleName, true);
      else await this.$popup.open({
        module: moduleName,
        fullscreen: this.$userdata.get("modules.config.slide_fullscreen") !== false,
      });
    },
  },
};
</script>

<style scoped>
.quick-search-card {
  background: var(--card-bg, #fff);
  color: var(--sidebar-text, inherit);
  overflow: hidden;
}

.quick-search-results {
  min-height: 190px;
  max-height: min(52vh, 520px);
  overflow-y: auto;
}

.quick-search-result {
  border: 0;
  border-radius: 14px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease;
}

.quick-search-result:hover,
.quick-search-result.selected {
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 13%, transparent);
}

.quick-search-result:active {
  transform: scale(0.99);
}

.quick-search-muted {
  color: var(--sidebar-text-secondary, #6b7280);
}

kbd {
  display: inline-grid;
  min-width: 22px;
  min-height: 22px;
  margin-right: 3px;
  padding: 2px 6px;
  place-items: center;
  border: 1px solid rgba(127, 127, 127, 0.28);
  border-radius: 5px;
  background: rgba(127, 127, 127, 0.1);
  font: inherit;
  text-align: center;
}

@media (max-width: 600px) {
  .quick-search-footer {
    display: none !important;
  }
}
</style>
