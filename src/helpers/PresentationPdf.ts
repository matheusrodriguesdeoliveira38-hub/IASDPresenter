import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export function toPdfBytes(data: unknown): Uint8Array {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (Array.isArray(data)) return new Uint8Array(data);
  if (data && typeof data === "object" && "data" in data && Array.isArray(data.data)) {
    return new Uint8Array(data.data);
  }
  throw new Error("Formato de dados do PDF invalido.");
}

// Owns the worker and render tasks independently of Vue's reactive graph.
export class PresentationPdf {
  revision = 0;
  document: pdfjs.PDFDocumentProxy | null = null;
  private loadingTask: pdfjs.PDFDocumentLoadingTask | null = null;
  private channels = new Map<string, number>();
  private renders = new Map<pdfjs.RenderTask, string>();
  private pageUsers = new Map<pdfjs.PDFPageProxy, number>();

  reset() {
    this.revision++;
    this.channels.clear();
    for (const task of this.renders.keys()) task.cancel();
    this.renders.clear();
    const loadingTask = this.loadingTask;
    this.loadingTask = null;
    this.document = null;
    // destroy also owns the document/worker after loading has completed.
    if (loadingTask) void loadingTask.destroy().catch(() => {});
    return this.revision;
  }

  async load(read: () => Promise<unknown>, revision = this.revision) {
    try {
      const data = await read();
      if (revision !== this.revision) return null;
      const task = pdfjs.getDocument({ data: toPdfBytes(data) });
      this.loadingTask = task;
      const document = await task.promise;
      if (revision !== this.revision) return null;
      this.document = document;
      return document;
    } catch (error) {
      if (revision !== this.revision) return null;
      this.reset();
      throw error;
    }
  }

  beginRender(channel: string) {
    const token = (this.channels.get(channel) || 0) + 1;
    this.channels.set(channel, token);
    for (const [task, taskChannel] of this.renders) {
      if (taskChannel === channel) task.cancel();
    }
    return token;
  }

  isRenderCurrent(channel: string, token: number) {
    return this.channels.get(channel) === token;
  }

  async render(pageNumber: number, scale: number, quality: number, channel: string, token: number) {
    const doc = this.document;
    const revision = this.revision;
    const current = () => doc === this.document && revision === this.revision && this.channels.get(channel) === token;
    if (!doc || !current()) return "";
    let canvas: HTMLCanvasElement | undefined;
    let page: pdfjs.PDFPageProxy | undefined;
    let task: pdfjs.RenderTask | undefined;
    let acquired = false;
    try {
      page = await doc.getPage(pageNumber);
      if (!current()) return "";
      this.pageUsers.set(page, (this.pageUsers.get(page) || 0) + 1);
      acquired = true;
      let viewport = page.getViewport({ scale });
      const maxDimension = Math.max(viewport.width, viewport.height);
      if (maxDimension > 2560) viewport = page.getViewport({ scale: scale * 2560 / maxDimension });
      canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d", { alpha: false });
      task = page.render({ canvas, canvasContext: context, viewport });
      this.renders.set(task, channel);
      await task.promise;
      return current() ? canvas.toDataURL("image/jpeg", quality) : "";
    } catch (error) {
      if (!current() || error?.name === "RenderingCancelledException") return "";
      throw error;
    } finally {
      if (task) this.renders.delete(task);
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
      if (acquired) {
        const remaining = (this.pageUsers.get(page) || 1) - 1;
        if (remaining) this.pageUsers.set(page, remaining);
        else {
          this.pageUsers.delete(page);
          page?.cleanup();
        }
      }
    }
  }
}
