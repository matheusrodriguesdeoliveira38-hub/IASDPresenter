import $db from "@/helpers/Database";
import $path from "@/helpers/Path";

class BackgroundSync {
  private isRunning: boolean;
  constructor() {
    this.isRunning = false;
  }

  async start() {
    if (!window.electronAPI || !window.electronAPI.isElectron) return;
    if (this.isRunning) return;

    try {
      this.isRunning = true;
      
      // 1. Verificar se as capas já foram todas baixadas no passado
      const isComplete = await window.electronAPI.getLocalDb("system_covers_downloaded");
      if (isComplete && isComplete.complete) {
        console.log("[BackgroundSync] Todas as capas já constam como baixadas. Verificação ignorada.");
        this.isRunning = false;
        return;
      }

      console.log("[BackgroundSync] Iniciando verificação de capas ausentes em background...");

      // 2. Extrair a lista de todas as capas
      const categories = await $db.get("pt_categories");
      if (!categories || !Array.isArray(categories)) {
        this.isRunning = false;
        return;
      }

      const allImages = new Set<string>();
      for (const cat of categories) {
        if (cat.albums && Array.isArray(cat.albums)) {
          cat.albums.forEach(a => {
            if (a.url_image) allImages.add(a.url_image);
          });
        }
      }

      const imagesList = Array.from(allImages);
      const imageEntries = imagesList.map(url => ({
        url,
        relativePath: url.replace(/^\/(musics|images|covers)\//, ""),
      }));

      // Uma única chamada IPC evita centenas de idas e voltas durante a inicialização.
      console.log(`[BackgroundSync] Verificando ${imagesList.length} capas no disco...`);
      const existingImages = window.electronAPI.checkMediaBatch
        ? await window.electronAPI.checkMediaBatch(imageEntries.map(image => ({
          type: "covers",
          filename: image.relativePath,
        })))
        : await Promise.all(imageEntries.map(image =>
          window.electronAPI.checkMedia("covers", image.relativePath),
        ));
      const missingImages = imageEntries.filter((image, index) => !existingImages[index]);
      if (missingImages.length === 0) {
        console.log("[BackgroundSync] Nenhuma capa faltando. Salvando flag...");
        await window.electronAPI.saveLocalDb("system_covers_downloaded", { complete: true });
        this.isRunning = false;
        return;
      }

      console.log(`[BackgroundSync] Encontradas ${missingImages.length} capas ausentes. Iniciando download controlado...`);

      // 4. Baixar as capas ausentes com proteção de rate limit (lotes de 5)
      const batchSize = 5;
      let completed = true;
      for (let i = 0; i < missingImages.length; i += batchSize) {
        if (!navigator.onLine) {
          console.warn("[BackgroundSync] Sem internet. Download pausado.");
          completed = false;
          break;
        }

        const batch = missingImages.slice(i, i + batchSize);
        const results = await Promise.all(batch.map(image =>
          window.electronAPI.downloadMedia(
            $path.file(image.url),
            "covers",
            image.relativePath,
          ),
        ));
        if (results.some(success => !success)) completed = false;
      }

      // A flag só é persistida se cada arquivo tiver sido confirmado no disco.
      if (completed) {
        console.log("[BackgroundSync] Download de capas finalizado com sucesso!");
        await window.electronAPI.saveLocalDb("system_covers_downloaded", { complete: true });
      }
    } catch (e) {
      console.error("[BackgroundSync] Erro na sincronização de background:", e);
    } finally {
      this.isRunning = false;
    }
  }
}

export default new BackgroundSync();
