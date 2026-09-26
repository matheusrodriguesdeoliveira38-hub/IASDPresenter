import { createSocket, Socket } from "node:dgram";
import { setTimeout as delay } from "node:timers/promises";
import { getMixerProfile, normalizeMixerDevice, validateMixerAction, validateMixerDevice } from "./MixerProfiles";

// X32/M32: UDP 10023; X Air: UDP 10024. Protocol references:
// https://github.com/pmaillot/X32-Behringer
// https://media.discopiu.com/files/2022/3/25/864756-original.pdf
function oscString(value: string) {
  const bytes = Buffer.from(value, "utf8");
  const result = Buffer.alloc(Math.ceil((bytes.length + 1) / 4) * 4);
  bytes.copy(result);
  return result;
}

export function encodeOsc(address: string, value?: number, type: "i" | "f" = "f") {
  if (value === undefined) return oscString(address);
  const argument = Buffer.alloc(4);
  if (type === "i") argument.writeInt32BE(value);
  else argument.writeFloatBE(value);
  return Buffer.concat([oscString(address), oscString(`,${type}`), argument]);
}

export function decodeOsc(packet: Buffer): { address: string; values: (string | number)[] } | null {
  let offset = 0;
  const readString = () => {
    const end = packet.indexOf(0, offset);
    if (end < offset) throw new Error("Invalid OSC string");
    const value = packet.toString("utf8", offset, end);
    offset = Math.ceil((end + 1) / 4) * 4;
    if (offset > packet.length) throw new Error("Invalid OSC padding");
    return value;
  };
  try {
    const address = readString();
    if (!address.startsWith("/")) return null;
    if (offset === packet.length) return { address, values: [] };
    const tags = readString();
    if (!tags.startsWith(",")) return null;
    const values: (string | number)[] = [];
    for (const type of tags.slice(1)) {
      if (type === "s") values.push(readString());
      else if (type === "i" || type === "f") {
        if (offset + 4 > packet.length) return null;
        values.push(type === "i" ? packet.readInt32BE(offset) : packet.readFloatBE(offset));
        offset += 4;
      } else return null;
    }
    return { address, values };
  } catch {
    return null;
  }
}

// Console faders use a piecewise scale, not a linear dB mapping.
export function dbToOscFader(db: number) {
  if (!Number.isFinite(db) || db < -90 || db > 10) throw new Error("Volume inválido.");
  if (db <= -90) return 0;
  if (db < -60) return (db + 90) / 480;
  if (db < -30) return (db + 70) / 160;
  if (db < -10) return (db + 50) / 80;
  return (db + 30) / 40;
}

export function oscTargetPath(device, action) {
  const profile = getMixerProfile(device);
  if (!profile || profile.type === "soundcraft-ui") throw new Error("Mesa OSC inválida.");
  if (action.target === "master") return profile.type === "behringer-xair" ? "/lr/mix" : "/main/st/mix";
  if (action.target === "aux" && profile.type === "behringer-xair") return "/rtn/aux/mix";
  if (action.target !== "input" || !Number.isInteger(action.channel) || action.channel < 1 || action.channel > profile.inputs) {
    throw new Error("Canal OSC inválido.");
  }
  return `/ch/${String(action.channel).padStart(2, "0")}/mix`;
}

class OscSession {
  private socket: Socket = createSocket("udp4");
  private failure: Error | null = null;

  constructor(private timeoutMs: number) {
    // Keep an error listener even between requests (UDP can report ICMP errors).
    this.socket.on("error", error => { this.failure = error; });
  }

  async connect(device) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error("Tempo limite ao abrir a conexão OSC.")), this.timeoutMs);
      const finish = (error?: Error) => {
        clearTimeout(timer);
        this.socket.off("error", onError);
        if (error) reject(error); else resolve();
      };
      const onError = (error: Error) => finish(error);
      this.socket.once("error", onError);
      try { this.socket.connect(device.port, device.ip, () => finish()); }
      catch (error) { finish(error as Error); }
    });
  }

  send(address: string, value?: number, type: "i" | "f" = "f") {
    return new Promise<void>((resolve, reject) => {
      if (this.failure) { reject(this.failure); return; }
      this.socket.send(encodeOsc(address, value, type), error => error ? reject(error) : resolve());
    });
  }

  request(address: string, accept: (values: (string | number)[]) => boolean) {
    return new Promise<(string | number)[]>((resolve, reject) => {
      const finish = (error?: Error, values?: (string | number)[]) => {
        clearTimeout(timeout);
        clearInterval(retry);
        this.socket.off("message", onMessage);
        this.socket.off("error", onError);
        if (error) reject(error); else resolve(values!);
      };
      const onMessage = (packet: Buffer) => {
        const message = decodeOsc(packet);
        if (message?.address === address && accept(message.values)) finish(undefined, message.values);
      };
      const onError = (error: Error) => finish(error);
      const query = () => { void this.send(address).catch(onError); };
      const timeout = setTimeout(() => finish(new Error("A mesa não confirmou o comando OSC. Confira IP, porta e rede.")), this.timeoutMs);
      const retry = setInterval(query, 300);
      this.socket.on("message", onMessage);
      this.socket.once("error", onError);
      query();
    });
  }

  async readFader(address: string) {
    const values = await this.request(address, values => typeof values[0] === "number" && Number.isFinite(values[0]) && values[0] >= 0 && values[0] <= 1);
    return values[0] as number;
  }

  async setConfirmed(address: string, value: number, type: "i" | "f") {
    await this.send(address, value, type);
    await this.request(address, values => typeof values[0] === "number" && Math.abs(values[0] - value) <= (type === "i" ? 0 : 0.002));
  }

  close() {
    try { this.socket.close(); } catch { /* socket may not have bound */ }
  }
}

async function withSession<T>(device, timeoutMs: number, run: (session: OscSession) => Promise<T>) {
  const normalized = normalizeMixerDevice(device);
  validateMixerDevice(normalized);
  const session = new OscSession(timeoutMs);
  try {
    await session.connect(normalized);
    return await run(session);
  } finally {
    session.close();
  }
}

export async function testOscMixer(device, timeoutMs = 2500) {
  return withSession(device, timeoutMs, async session => {
    await session.request("/info", values => values.length >= 4 && values.every(value => typeof value === "string"));
    return { ok: true };
  });
}

export async function executeOscAction(device, action, timeoutMs = 2500) {
  validateMixerAction(normalizeMixerDevice(device), action);
  return withSession(device, timeoutMs, async session => {
    const base = oscTargetPath(device, action);
    if (action.operation === "mute" || action.operation === "unmute") {
      await session.setConfirmed(`${base}/on`, action.operation === "mute" ? 0 : 1, "i");
    } else {
      const address = `${base}/fader`;
      const end = dbToOscFader(action.valueDB);
      if (action.operation === "fadeToDB" && action.fadeMs > 0) {
        const start = await session.readFader(address);
        const started = Date.now();
        while (Date.now() - started < action.fadeMs) {
          const progress = Math.min(1, (Date.now() - started) / action.fadeMs);
          await session.send(address, start + (end - start) * progress);
          await delay(Math.min(50, Math.max(1, action.fadeMs - (Date.now() - started))));
        }
      }
      await session.setConfirmed(address, end, "f");
    }
    return { ok: true };
  });
}
