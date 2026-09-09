import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { pipeline } from "node:stream";
import type { ServerResponse } from "node:http";

export async function streamStaticFile(response: ServerResponse, filePath: string, headers: Record<string, string>) {
  const notFound = () => {
    if (response.destroyed) return;
    if (response.headersSent) response.destroy();
    else {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  };
  try {
    if (!(await stat(filePath)).isFile()) return notFound();
  } catch {
    return notFound();
  }
  if (response.destroyed) return;
  const source = createReadStream(filePath);
  const onClose = () => source.destroy();
  response.once("close", onClose);
  source.once("close", () => response.off("close", onClose));
  source.once("error", notFound);
  source.once("open", () => {
    if (response.destroyed) return source.destroy();
    response.writeHead(200, headers);
    // pipeline respects backpressure and destroys both sides on failure.
    pipeline(source, response, () => {});
  });
  return source;
}
