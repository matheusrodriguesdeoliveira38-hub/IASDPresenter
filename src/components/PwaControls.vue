<template>
  <div v-if="pwa.enabled && $route.path !== '/popup'" class="pwa-controls">
    <v-btn v-if="pwa.installEvent" size="small" prepend-icon="mdi-download" @click="installPwa">
      Instalar app
    </v-btn>
    <v-btn size="small" prepend-icon="mdi-projector" @click="openProjection">
      Abrir projeção
    </v-btn>
    <v-btn size="small" variant="text" @click="showHelp = true">
      ChromeOS
    </v-btn>
    <WebMediaLibrary />
    <span v-if="pwa.libraryBundled" role="status" class="text-caption">
      {{ pwa.offlineReady ? 'Biblioteca pronta offline' : 'Preparando biblioteca offline…' }}
    </span>
    <v-btn v-if="pwa.updateReady" size="small" color="primary" @click="showUpdate = true">
      Atualização disponível
    </v-btn>
    <v-dialog v-model="showUpdate" max-width="440">
      <v-card title="Atualizar aplicativo">
        <v-card-text>Encerre a apresentação e feche as janelas de projeção antes de atualizar. O aplicativo será recarregado.</v-card-text>
        <v-card-actions>
          <v-btn @click="showUpdate = false">
            Depois
          </v-btn><v-btn @click="updatePwa">
            Atualizar agora
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="showHelp" max-width="560">
      <v-card title="IASDPresenter no ChromeOS">
        <v-card-text>
          <p class="mb-3">
            Instale pelo menu do Chrome para abrir em janela própria. Permita pop-ups para projetar, mova a janela para a tela externa e pressione a tecla de tela cheia.
          </p>
          <p class="mb-3">
            {{ pwa.libraryBundled ? 'Esta versão inclui músicas, letras, hinários e Bíblia em português. Aguarde o aviso de biblioteca pronta offline antes de desconectar. O primeiro carregamento baixa cerca de 67 MB.' : 'Letras e dados consultados com internet ficam guardados neste navegador.' }}
            Use Mídias e downloads para guardar áudios, playback, capas e imagens por coletânea ou importar seus próprios vídeos. Não limpe os dados do site se precisar do conteúdo salvo.
          </p>
          <p class="mb-3">
            Você pode criar músicas personalizadas, importar letras TXT, abrir apresentações PDF e importar ou exportar liturgias. Exporte arquivos PowerPoint como PDF antes de importá-los. Os arquivos selecionados ficam guardados neste navegador.
          </p>
          <p class="mb-3">
            Controle remoto pela rede, monitor virtual, automação de mesas e sincronização completa da biblioteca exigem a versão desktop.
          </p>
          <p>{{ pwa.offlineReady ? 'Interface salva para abrir offline.' : 'Para confirmar o uso offline, abra o app com internet e teste novamente sem conexão.' }}</p>
          <v-btn class="mt-3" @click="persistStorage">
            Manter dados neste dispositivo
          </v-btn>
          <p role="status" class="mt-2">
            {{ storageMessage }}
          </p>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="showHelp = false">
            Fechar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-snackbar :model-value="!!pwa.error" @update:model-value="pwa.error = ''">
      {{ pwa.error }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import WebMediaLibrary from "@/components/WebMediaLibrary.vue";
import { pwa, installPwa, updatePwa } from "@/helpers/Pwa";
import popup from "@/helpers/Popup";
import appdata from "@/helpers/AppData";
const showHelp = ref(false);
const showUpdate = ref(false);
const storageMessage = ref("");
function openProjection() {
  popup.open({ module: appdata.get("modules.external_media.filePath") ? "external_media" : appdata.get("popup_module") || "media" });
  if (!appdata.get("popup")) pwa.error = "Permita pop-ups neste site para abrir a projeção.";
}
async function persistStorage() {
  try {
    const granted = await navigator.storage?.persist?.();
    storageMessage.value = granted ? "Armazenamento persistente autorizado." : "O Chrome não autorizou armazenamento persistente. Os dados podem ser removidos se faltar espaço.";
  } catch {
    storageMessage.value = "Não foi possível solicitar armazenamento persistente.";
  }
}
</script>

<style scoped>
.pwa-controls { display: flex; align-items: center; gap: 8px; height: 42px; flex: 0 0 42px; padding: 0 12px; overflow-x: auto; }
</style>
