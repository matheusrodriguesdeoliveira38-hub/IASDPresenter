import BaseModule from "../BaseModule";
import manifest from "./manifest.json";

export default class extends BaseModule {
  constructor() {
    super({
      ...manifest,
      translations: {
        pt: { title: "Mensagem ao Púlpito" },
        en: { title: "Pulpit Message" },
        es: { title: "Mensaje al Púlpito" },
      },
    });
  }
}
