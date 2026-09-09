import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, get } from "node:http";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { streamStaticFile } from "./StaticFile";

test("static streaming preserves bytes and headers and handles missing files", async () => {
  const directory = await mkdtemp(join(tmpdir(), "iasd-static-test-"));
  const bytes = Buffer.alloc(1024 * 1024, 42);
  await writeFile(join(directory, "large.bin"), bytes);
  const server = createServer((request, response) => {
    void streamStaticFile(response, join(directory, request.url === "/exists" ? "large.bin" : "missing"), {
      "Content-Type": "application/octet-stream", "Cache-Control": "no-store",
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const url = `http://127.0.0.1:${typeof address === "object" ? address.port : 0}`;
  try {
    const response = await fetch(`${url}/exists`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
    const missing = await fetch(`${url}/missing`);
    assert.equal(missing.status, 404);
    assert.equal(await missing.text(), "Not found");
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});

test("disconnecting a client destroys the file stream before reading the entire file", async () => {
  const directory = await mkdtemp(join(tmpdir(), "iasd-static-abort-"));
  const filePath = join(directory, "large.bin");
  const size = 16 * 1024 * 1024;
  await writeFile(filePath, Buffer.alloc(size));
  let source;
  let complete;
  const closed = new Promise<void>(resolve => { complete = resolve; });
  const server = createServer(async (_request, response) => {
    source = await streamStaticFile(response, filePath, {});
    source.once("close", complete);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  try {
    await new Promise<void>((resolve, reject) => {
      const request = get(`http://127.0.0.1:${typeof address === "object" ? address.port : 0}`, response => {
        response.once("data", () => { response.destroy(); resolve(); });
      });
      request.on("error", reject);
    });
    await closed;
    assert.equal(source.destroyed, true);
    assert.ok(source.bytesRead < size);
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});
