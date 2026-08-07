<template>
  <transition name="fade-transition">
    <div v-if="isOpen" class="first-boot-overlay d-flex flex-column align-center justify-center bg-main">
      <transition name="fade-transition">
        <div v-if="showContent" class="text-center" style="max-width: 520px; width: 100%;">
          <img src="/ico/favicon.png" width="80" class="mb-6 pulse-anim" />
          <h2 class="text-h4 font-weight-bold mb-2" style="color: var(--sidebar-text);">
            {{ isFirstBoot ? copy.firstBootTitle : copy.startTitle }}
          </h2>
          <p class="text-subtitle-1 mb-3" style="color: var(--sidebar-text-secondary);">
            {{ copy.subtitle }}
          </p>

          <div class="language-badge mb-7">
            <CountryFlag :country="languages[selectedLanguage].flag" />
            <span>{{ languages[selectedLanguage].name }}</span>
          </div>
          <p v-if="copy.catalogNote" class="text-caption mb-6" style="color: var(--sidebar-text-secondary);">
            {{ copy.catalogNote }}
          </p>

          <div class="mb-2 d-flex justify-space-between align-center px-4">
            <span class="text-caption font-weight-bold" style="color: var(--sidebar-text);">{{ statusText }}</span>
            <span class="text-caption font-weight-bold" style="color: var(--accent-blue);">{{ progress }}%</span>
          </div>

          <div class="px-4">
            <v-progress-linear
              v-if="!hasError"
              v-model="progress"
              color="primary"
              height="8"
              rounded
              striped
            />

            <v-btn v-else color="primary" class="mt-4" @click="retrySync">
              {{ copy.retry }}
            </v-btn>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>

<script lang="ts">
import CountryFlag from "vue-country-flag-next";
import $path from "@/helpers/Path";

const SUPPORTED_LANGUAGES = ["pt", "en", "es"];
const DATABASE_SOURCE_LANGUAGES = { pt: "pt", en: "pt", es: "es" };
const LANGUAGES = {
  pt: { name: "Portugu\u00eas", flag: "br" },
  en: { name: "English", flag: "us" },
  es: { name: "Espa\u00f1ol", flag: "es" },
};
const COPY = {
  pt: {
    firstBootTitle: "Preparando o IASDPresenter",
    startTitle: "Iniciando o IASDPresenter",
    subtitle: "Estamos verificando os dados no idioma correto antes de iniciar.",
    starting: "Iniciando...",
    preparingInstall: "Preparando nova instala\u00e7\u00e3o...",
    preparingLanguage: "Preparando dados em Portugu\u00eas...",
    loading: "Carregando ambiente...",
    checkingLocal: "Verificando banco local...",
    downloading: "Baixando banco de dados em Portugu\u00eas...",
    extracting: "Extraindo dados locais...",
    completed: "Sincroniza\u00e7\u00e3o conclu\u00edda!",
    retrying: "Tentando novamente...",
    retry: "Tentar novamente",
    downloadFailed: "N\u00e3o foi poss\u00edvel conectar ao servidor do banco. Tente novamente.",
  },
  en: {
    firstBootTitle: "Preparing IASDPresenter",
    startTitle: "Starting IASDPresenter",
    subtitle: "We are checking the correct language data before starting.",
    starting: "Starting...",
    preparingInstall: "Preparing your new installation...",
    preparingLanguage: "Preparing data in English...",
    loading: "Loading your workspace...",
    checkingLocal: "Checking local database...",
    downloading: "Downloading the English database...",
    extracting: "Extracting local data...",
    completed: "Synchronization complete!",
    retrying: "Trying again...",
    retry: "Try again",
    downloadFailed: "Could not connect to the database server. Please try again.",
    catalogNote: "English interface with the Portuguese content catalog.",
  },
  es: {
    firstBootTitle: "Preparando IASDPresenter",
    startTitle: "Iniciando IASDPresenter",
    subtitle: "Estamos comprobando los datos en el idioma correcto antes de iniciar.",
    starting: "Iniciando...",
    preparingInstall: "Preparando la nueva instalaci\u00f3n...",
    preparingLanguage: "Preparando datos en espa\u00f1ol...",
    loading: "Cargando el entorno...",
    checkingLocal: "Comprobando la base de datos local...",
    downloading: "Descargando la base de datos en espa\u00f1ol...",
    extracting: "Extrayendo datos locales...",
    completed: "Sincronizaci\u00f3n completada!",
    retrying: "Intentando de nuevo...",
    retry: "Intentar de nuevo",
    downloadFailed: "No se pudo conectar al servidor de la base de datos. Int\u00e9ntalo de nuevo.",
  },
};

function normalizeLanguage(language) {
  const locale = String(language || "").toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LANGUAGES.includes(locale) ? locale : "pt";
}

export default {
  name: "FirstBootLoader",
  components: { CountryFlag },
  data() {
    const selectedLanguage = normalizeLanguage(
      this.$userdata.get("language") || navigator.language,
    );
    return {
      isOpen: true,
      showContent: false,
      progress: 0,
      statusText: COPY[selectedLanguage].starting,
      isFirstBoot: false,
      hasError: false,
      selectedLanguage,
      languages: LANGUAGES,
      removeExtractProgressListener: null,
      removeDownloadProgressListener: null,
      databaseSourceLanguage: DATABASE_SOURCE_LANGUAGES[selectedLanguage],
    };
  },
  computed: {
    copy() {
      return COPY[this.selectedLanguage];
    },
    requiredFiles() {
      const locale = this.selectedLanguage;
      return [
        "config",
        `${locale}_categories`,
        `${locale}_musics`,
        `${locale}_bible_book`,
        `${locale}_bible_version`,
      ];
    },
  },
  mounted() {
    if (window.location.href.includes("popup")) {
      this.isOpen = false;
      return;
    }

    this.$userdata.set("language", this.selectedLanguage);
    this.$i18n.locale = this.selectedLanguage;
    window.addEventListener("show-boot-screen", this.handleManualShow);

    requestAnimationFrame(async () => {
      this.showContent = true;
      await this.checkFirstBoot();
    });
  },
  unmounted() {
    window.removeEventListener("show-boot-screen", this.handleManualShow);
    this.removeProgressListeners();
  },
  methods: {
    removeProgressListeners() {
      if (this.removeExtractProgressListener) this.removeExtractProgressListener();
      if (this.removeDownloadProgressListener) this.removeDownloadProgressListener();
      this.removeExtractProgressListener = null;
      this.removeDownloadProgressListener = null;
    },
    handleManualShow() {
      this.isOpen = true;
      this.showContent = true;
      this.progress = 50;
      this.statusText = this.copy.loading;
      setTimeout(() => { this.isOpen = false; }, 5000);
    },
    async retrySync() {
      this.hasError = false;
      this.progress = 0;
      this.statusText = this.copy.retrying;
      await this.runFirstBootSync();
    },
    async checkFirstBoot() {
      if (!window.electronAPI?.isElectron) {
        this.isOpen = false;
        return;
      }

      const [isComplete, installedDatabase, hasRequiredData] = await Promise.all([
        window.electronAPI.getLocalDb("system_first_boot_complete"),
        window.electronAPI.getLocalDb("system_database_language"),
        window.electronAPI.hasLocalDbFiles(this.requiredFiles),
      ]);
      const bootComplete = isComplete?.complete === true;
      const installedLanguage = String(installedDatabase?.language || "")
        .toLowerCase()
        .split(/[-_]/)[0];
      const installedSourceLanguage = String(installedDatabase?.sourceLanguage || installedLanguage)
        .toLowerCase()
        .split(/[-_]/)[0];
      const hasLanguageMarker = Boolean(installedDatabase?.language);

      // Migrate installations created before the language marker existed.
      if (bootComplete && hasRequiredData && !hasLanguageMarker) {
        await window.electronAPI.saveLocalDb("system_database_language", {
          language: this.selectedLanguage,
          sourceLanguage: this.databaseSourceLanguage,
          installedAt: new Date().toISOString(),
        });
      }

      const languageMatches = !hasLanguageMarker || installedLanguage === this.selectedLanguage;
      const sourceLanguageMatches = !hasLanguageMarker
        || installedSourceLanguage === this.databaseSourceLanguage;
      if (!bootComplete || !hasRequiredData || !languageMatches || !sourceLanguageMatches) {
        this.isFirstBoot = !bootComplete;
        this.statusText = this.isFirstBoot ? this.copy.preparingInstall : this.copy.preparingLanguage;

        if (this.isFirstBoot && window.electronAPI.clearAllData) {
          await window.electronAPI.clearAllData();
        }
        await this.runFirstBootSync();
        return;
      }

      this.isFirstBoot = false;
      this.progress = 100;
      this.isOpen = false;
    },
    async fetchFromApi(file, retries = 5, delayMs = 1000) {
      try {
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const response = await fetch(`${$path.db(`/${file}`)}?${date}`, {
          headers: { "Api-Token": import.meta.env.VITE_API_TOKEN },
        });
        if (response.status === 429 && retries > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
          return this.fetchFromApi(file, retries - 1, delayMs * 1.5);
        }
        if (!response.ok) {
          if (retries > 0 && response.status >= 500) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
            return this.fetchFromApi(file, retries - 1, delayMs * 1.5);
          }
          throw new Error(`Server returned ${response.status}`);
        }
        const contentType = response.headers.get("content-type") || "";
        const text = await response.text();
        if (!contentType.includes("application/json") && text.trim().startsWith("<")) {
          throw new Error(`Server returned HTML for ${file}.`);
        }
        return JSON.parse(text);
      } catch (error) {
        if (retries > 0 && /Failed to fetch|NetworkError/i.test(error.message)) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
          return this.fetchFromApi(file, retries - 1, delayMs * 1.5);
        }
        throw error;
      }
    },
    async fetchAndSave(file) {
      const data = await this.fetchFromApi(file);
      if (data && window.electronAPI) await window.electronAPI.saveLocalDb(file, data);
      return data;
    },
    async finishFirstBootSync() {
      const hasRequiredData = await window.electronAPI.hasLocalDbFiles(this.requiredFiles);
      if (!hasRequiredData) {
        throw new Error(`The ${this.selectedLanguage} database is incomplete.`);
      }

      const markerSaved = await window.electronAPI.saveLocalDb("system_database_language", {
        language: this.selectedLanguage,
        sourceLanguage: this.databaseSourceLanguage,
        installedAt: new Date().toISOString(),
      });
      const bootSaved = await window.electronAPI.saveLocalDb("system_first_boot_complete", { complete: true });
      if (!markerSaved || !bootSaved) throw new Error("Could not confirm the local database.");

      this.progress = 100;
      this.statusText = this.copy.completed;
      setTimeout(() => {
        this.isOpen = false;
        this.$emit("boot-complete");
        window.location.reload();
      }, 100);
    },
    async runFirstBootSync() {
      try {
        this.progress = 0;
        this.statusText = this.copy.checkingLocal;

        this.removeProgressListeners();
        this.removeExtractProgressListener = window.electronAPI.onExtractProgress(
          data => { this.progress = data.progress; },
        );
        if (window.electronAPI.onDownloadDbProgress) {
          this.removeDownloadProgressListener = window.electronAPI.onDownloadDbProgress(
            data => { this.progress = data.progress; },
          );
        }

        const hasConfig = await window.electronAPI.hasLocalDbFiles(["config"]);
        const configPromise = hasConfig
          ? Promise.resolve(true)
          : this.fetchAndSave("config").then(() => true);

        // The bundled database is currently the Portuguese offline fallback.
        if (this.selectedLanguage === "pt" && window.electronAPI.extractBundledDatabase) {
          const [bundledResult] = await Promise.all([
            window.electronAPI.extractBundledDatabase(this.selectedLanguage),
            configPromise,
          ]);
          if (bundledResult?.ok) {
            await this.finishFirstBootSync();
            return;
          }
        }

        if (navigator.onLine === false) {
          throw new Error("An internet connection is required to install this language database.");
        }
        this.statusText = this.copy.downloading;
        this.progress = 0;
        const [downloadResult] = await Promise.all([
          window.electronAPI.downloadDatabase(this.selectedLanguage),
          configPromise,
        ]);
        if (!downloadResult?.ok) {
          console.error("Database download failed:", downloadResult?.error);
          throw new Error(this.copy.downloadFailed);
        }
        this.databaseSourceLanguage = downloadResult.sourceLanguage
          || DATABASE_SOURCE_LANGUAGES[this.selectedLanguage];

        this.statusText = this.copy.extracting;
        this.progress = 0;
        const extractResult = await window.electronAPI.extractLocalDb(
          this.selectedLanguage,
          this.databaseSourceLanguage,
        );
        if (!extractResult?.ok && extractResult !== true) {
          throw new Error(extractResult?.error || "Database extraction failed.");
        }
        await this.finishFirstBootSync();
      } catch (error) {
        console.error("Initial synchronization error:", error);
        this.statusText = error?.message || "Synchronization failed. Please try again.";
        this.hasError = true;
      }
    },
  },
};
</script>

<style scoped>
.first-boot-overlay {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 10000;
}
.language-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border: 1px solid rgba(128, 128, 128, 0.25);
  border-radius: 999px;
  color: var(--sidebar-text);
}
.language-badge :deep(.flag) { margin: 0; }
.pulse-anim { animation: pulse 2s infinite ease-in-out; }
@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
}
</style>
