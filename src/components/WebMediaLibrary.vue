<template>
  <v-btn size="small" prepend-icon="mdi-download" @click="openLibrary">
    Mídias e downloads
  </v-btn>
  <v-dialog v-model="visible" max-width="720" :persistent="busy">
    <v-card title="Mídias e downloads">
      <v-card-text>
        <p class="mb-3">
          Áudio, playback, capas e imagens podem ser reproduzidos com internet. Baixe as coletâneas que deseja usar offline. A biblioteca completa pode ocupar muitos gigabytes.
        </p>
        <v-select v-model="selected" :items="albums" item-title="name" item-value="id_album" label="Coletâneas para baixar" multiple chips :disabled="busy" />
        <div class="d-flex flex-wrap ga-2 mb-3">
          <v-btn :disabled="busy || !albums.length" @click="selected = albums.map(a => a.id_album)">
            Selecionar todas
          </v-btn>
          <v-btn color="primary" :disabled="busy || !selected.length" @click="download">
            Baixar selecionadas
          </v-btn>
          <v-btn v-if="busy" @click="cancel">
            Interromper
          </v-btn>
        </div>
        <v-progress-linear v-if="busy" :indeterminate="total === 0" :model-value="total ? completed / total * 100 : 0" color="primary" />
        <p role="status" class="my-3">
          {{ status }}
        </p>
        <p v-if="space" class="text-caption mb-4">
          {{ space }}
        </p>
        <v-divider class="mb-4" />
        <h3 class="text-subtitle-1 mb-2">
          Arquivos deste computador
        </h3>
        <p class="mb-3">
          Importe áudio ou vídeo para guardar neste navegador. MP3, MP4 e WebM são boas opções; a reprodução depende do codec do arquivo. Os arquivos permanecem neste dispositivo.
        </p>
        <input ref="picker" type="file" accept="audio/*,video/*" multiple hidden @change="importFiles" />
        <v-btn :disabled="busy" @click="picker?.click()">
          Importar áudio ou vídeo
        </v-btn>
        <v-list>
          <v-list-item v-for="file in localFiles" :key="file.key" :title="file.name">
            <template #append>
              <v-btn size="small" @click="playLocal(file)">
                Abrir
              </v-btn>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
      <v-card-actions>
        <v-btn :disabled="busy" @click="visible = false">
          Fechar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from "vue";
import database from "@/helpers/Database";
import appdata from "@/helpers/AppData";
import media from "@/helpers/Media";
import { openExternalMedia, isAudioFile } from "@/helpers/ExternalMedia";
import { albumMediaFiles, saveRemoteMedia, importLocalMedia, listLocalMedia, localMediaUrl } from "@/helpers/WebMedia";
const visible = ref(false), busy = ref(false);
const albums = ref<Array<{ id_album: number; name: string }>>([]);
const selected = ref<number[]>([]);
const localFiles = ref<Array<{ key: string; name: string }>>([]);
const picker = ref<HTMLInputElement>();
const status = ref(""), space = ref("");
const completed = ref(0), total = ref(0);
let controller: AbortController | undefined;
let activeObjectUrl = "";

async function refreshStorage() {
  const estimate = await navigator.storage?.estimate?.();
  if (estimate) space.value = `${((estimate.usage || 0) / 1024 ** 3).toFixed(2)} GB usados de até ${((estimate.quota || 0) / 1024 ** 3).toFixed(2)} GB disponíveis para este site.`;
}
async function openLibrary() {
  visible.value = true;
  try {
    const categories = await database.get("pt_categories", { silent: true });
    if (!categories) throw new Error("Não foi possível abrir a lista de coletâneas.");
    const unique = new Map<number, { id_album: number; name: string }>();
    categories.flatMap(category => category.albums || []).forEach(album => unique.set(album.id_album, album));
    for (const id of [712, 629]) {
      const album = await database.get(`album_${id}`, { silent: true });
      if (album) unique.set(id, album);
    }
    albums.value = [...unique.values()].sort((a, b) => a.name.localeCompare(b.name, "pt"));
    localFiles.value = await listLocalMedia();
    await refreshStorage();
  } catch (error) { status.value = error.message; }
}
function cancel() { controller?.abort(); }
async function download() {
  busy.value = true; completed.value = 0; total.value = 0;
  controller = new AbortController();
  try {
    await navigator.storage?.persist?.();
    const urls = new Set<string>();
    for (const id of selected.value) {
      if (controller.signal.aborted) throw new Error("Download interrompido. Os arquivos concluídos foram mantidos.");
      status.value = `Preparando ${albums.value.find(a => a.id_album === id)?.name || id}…`;
      (await albumMediaFiles(id)).forEach(url => urls.add(url));
    }
    total.value = urls.size;
    for (const url of urls) {
      if (controller.signal.aborted) throw new Error("Download interrompido. Os arquivos concluídos foram mantidos.");
      status.value = `Baixando ${completed.value + 1} de ${total.value} arquivos…`;
      await saveRemoteMedia(url, controller.signal);
      completed.value++;
    }
    status.value = `${completed.value} arquivos disponíveis offline. Reabra o app antes de testar sem internet.`;
  } catch (error) {
    status.value = controller.signal.aborted ? "Download interrompido. Você pode retomá-lo selecionando as mesmas coletâneas." : `${error.message} Os downloads concluídos foram mantidos; selecione novamente para retomar.`;
  } finally { busy.value = false; await refreshStorage(); }
}
async function importFiles(event: Event) {
  const input = event.target as HTMLInputElement;
  busy.value = true;
  try {
    for (const file of Array.from(input.files || [])) await importLocalMedia(file);
    localFiles.value = await listLocalMedia();
    status.value = "Arquivos importados para uso offline.";
  } catch (error) { status.value = `Não foi possível concluir a importação: ${error.message}`; }
  finally { busy.value = false; input.value = ""; await refreshStorage(); }
}
async function playLocal(file: { key: string; name: string }) {
  try {
    const url = await localMediaUrl(file.key, file.name);
    const previous = activeObjectUrl;
    await media.close(true);
    activeObjectUrl = url;
    openExternalMedia(appdata, { filePath: url, title: file.name });
    appdata.set("modules.external_media.show", !isAudioFile(url));
    appdata.set("modules.external_media.minimized", isAudioFile(url));
    if (previous) URL.revokeObjectURL(previous.split("#")[0]);
    visible.value = false;
  } catch (error) { status.value = error.message; }
}
</script>
