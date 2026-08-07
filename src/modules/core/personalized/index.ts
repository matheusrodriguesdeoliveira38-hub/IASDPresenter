import BaseModule from "../../BaseModule";
import es from "./lang/es.json";
import en from "./lang/en.json";
import pt from "./lang/pt.json";
import manifest from "./manifest.json";

export default class extends BaseModule {
  constructor() {
    (manifest as any).translations = { pt, en, es };
    super(manifest);
  }
}
