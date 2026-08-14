import $dev from "@/helpers/Dev";
import $storage from "@/helpers/Storage";
import $appdata from "@/helpers/AppData";

const helper: Record<string, any> = {
  save() {
    $dev.write("salvando dados");
    /*if (store.state.desktop) {
          // SE FOR APLICAÇÃO DESKTOP, SALVA AS CONFIGURAÇÕES NA MAQUINA DO USUARIO
          IPC.send('save_data', JSON.stringify(store.state.data));
      }*/

    const data = JSON.parse(JSON.stringify($appdata.get("user_data")));

    // Mantem o storage web para o navegador e grava um arquivo estavel no Electron.
    $storage.set("user_data", data);
    if (window.electronAPI?.saveUserData) {
      window.electronAPI.saveUserData(data).catch((error) => {
        console.error("Erro ao salvar dados do usuario:", error);
      });
    }
  },
  load() {
    $dev.write("carregando dados");
    const fileData = window.electronAPI?.getUserData?.();
    const savedData = fileData || $storage.get("user_data") || {};
    const data = $appdata.flatten(savedData);

    Object.keys(data).map((item) => {
      $appdata.set(`user_data.${item}`, data[item]);
    });

    // Migra automaticamente os dados existentes para o arquivo persistente.
    if (!fileData && Object.keys(data).length > 0 && window.electronAPI?.saveUserData) {
      window.electronAPI.saveUserData(savedData).catch((error) => {
        console.error("Erro ao migrar dados do usuario:", error);
      });
    }
  },

  set(param, value) {
    $dev.write("set userdata", { param, value });
    $appdata.set(`user_data.${param}`, value);

    //Salvar os Dados
    this.save();
  },

  get(param, ifnull = null) {
    //$dev.write("get userdata", { param, ifnull });
    if (!param) {
      return $appdata.get("user_data", ifnull);
    }
    return $appdata.get(`user_data.${param}`, ifnull);
  },
};

export default helper;
