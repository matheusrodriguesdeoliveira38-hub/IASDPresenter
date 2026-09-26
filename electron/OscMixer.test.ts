import { test } from "node:test";
import assert from "node:assert/strict";
import { createSocket } from "node:dgram";
import { once } from "node:events";
import { encodeOsc, decodeOsc, dbToOscFader, oscTargetPath, executeOscAction, testOscMixer } from "./OscMixer";
import { mixerProfiles, normalizeMixerDevice, validateMixerAction, validateMixerConfig } from "./MixerProfiles";

const device = (model = "x32", port?: number) => {
  const profile = mixerProfiles.find(item => item.id === model)!;
  return normalizeMixerDevice({ id: model, name: profile.name, model, type: profile.type, ip: "127.0.0.1", port });
};
const action = (overrides = {}) => ({ target: "input", channel: 1, operation: "setFaderLevelDB", valueDB: 0, fadeMs: 0, ...overrides });

test("OSC packets use padded strings, big-endian float and integer arguments", () => {
  assert.equal(encodeOsc("/info").toString("hex"), "2f696e666f000000");
  assert.equal(encodeOsc("/ch/01/mix/on", 0, "i").toString("hex"), "2f63682f30312f6d69782f6f6e0000002c69000000000000");
  assert.equal(encodeOsc("/lr/mix/fader", 0.75).subarray(-8).toString("hex"), "2c6600003f400000");
  assert.deepEqual(decodeOsc(Buffer.from("2f6100002c6600003f000000", "hex")), { address: "/a", values: [0.5] });
  assert.equal(decodeOsc(Buffer.from("2f6100002c6600003f00", "hex")), null);
  assert.equal(decodeOsc(Buffer.from("not an OSC packet")), null);
});

test("fader scale matches console breakpoints and rejects invalid levels", () => {
  for (const [db, value] of [[-90, 0], [-60, 0.0625], [-30, 0.25], [-10, 0.5], [0, 0.75], [10, 1]]) {
    assert.equal(dbToOscFader(db), value);
  }
  for (const invalid of [NaN, Infinity, -91, 11]) assert.throws(() => dbToOscFader(invalid));
});

test("model capabilities, legacy Ui16 and action destinations are validated", () => {
  const legacy = normalizeMixerDevice({ id: "soundcraft_ui16", name: "Mesa antiga", type: "soundcraft-ui", ip: "http://192.168.0.80/" });
  assert.equal(legacy.model, "ui16");
  assert.equal(legacy.id, "soundcraft_ui16");
  assert.equal(legacy.ip, "192.168.0.80");
  assert.equal(device("xr18").port, 10024);
  assert.equal(device("m32").port, 10023);
  assert.equal(oscTargetPath(device("x32"), action({ target: "master" })), "/main/st/mix");
  assert.equal(oscTargetPath(device("xr18"), action({ target: "master" })), "/lr/mix");
  assert.equal(oscTargetPath(device("xr18"), action({ target: "aux" })), "/rtn/aux/mix");
  assert.throws(() => validateMixerAction(device("xr18"), action({ channel: 18 })), /1 e 16/);
  assert.throws(() => validateMixerAction(device("m32"), action({ target: "line-left" })), /Alvo/);
  assert.throws(() => validateMixerAction(device("ui12"), action({ channel: 9 })), /1 e 8/);
  assert.doesNotThrow(() => validateMixerAction(device("ui24r"), action({ channel: 24 })));
  assert.throws(() => validateMixerAction(device(), action({ restoreOnMediaEnd: true, endValueDB: NaN })), /volume/);
  assert.throws(() => validateMixerAction(device(), action({ operation: "fadeToDB", fadeMs: Infinity })), /fade/);
  assert.throws(() => validateMixerConfig({ devices: [device()], triggers: [{ name: "Vídeo", actions: [action({ deviceId: "missing" })] }] }), /Selecione uma mesa/);
  assert.throws(() => validateMixerConfig({ devices: [device(), device()], triggers: [] }), /duplicados/);
  assert.throws(() => validateMixerConfig({ devices: [{ ...device(), type: "unknown" }], triggers: [] }), /não suportado/);
});

async function fakeMixer(options: { silent?: boolean; ignoreWrites?: boolean } = {}) {
  const server = createSocket("udp4");
  const writes: { address: string; value: number }[] = [];
  const state = new Map<string, number>();
  server.on("message", (packet, remote) => {
    if (options.silent) return;
    const message = decodeOsc(packet);
    if (!message) return;
    if (message.address === "/info") {
      // Four OSC strings, as returned by the console's /info response.
      server.send(Buffer.from("/info\0\0\0,ssss\0\0\0v1\0\0Mix\0X32\0v4\0\0"), remote.port, remote.address);
      return;
    }
    const { address, values } = message;
    if (values.length) {
      writes.push({ address, value: Number(values[0]) });
      if (!options.ignoreWrites) state.set(address, Number(values[0]));
    } else {
      const value = state.get(address) ?? (address.endsWith("/on") ? 1 : 0.25);
      server.send(encodeOsc(address, value, address.endsWith("/on") ? "i" : "f"), remote.port, remote.address);
    }
  });
  server.bind(0, "127.0.0.1");
  await once(server, "listening");
  return { port: server.address().port, writes, close: () => new Promise<void>(resolve => server.close(() => resolve())) };
}

test("UDP integration: connection, mute, unmute, level and fade across OSC families", async () => {
  const mixer = await fakeMixer();
  try {
    for (const model of ["x32", "m32", "xr12", "xr16", "xr18", "x18"]) {
      const target = device(model, mixer.port);
      assert.deepEqual(await testOscMixer(target), { ok: true });
      await executeOscAction(target, action({ operation: "mute" }));
      assert.deepEqual(mixer.writes.at(-1), { address: "/ch/01/mix/on", value: 0 });
      await executeOscAction(target, action({ operation: "unmute" }));
      assert.equal(mixer.writes.at(-1)?.value, 1);
      await executeOscAction(target, action({ target: "master" }));
      assert.equal(mixer.writes.at(-1)?.address, model === "x32" || model === "m32" ? "/main/st/mix/fader" : "/lr/mix/fader");
      assert.equal(mixer.writes.at(-1)?.value, 0.75);
    }
    const start = mixer.writes.length;
    await executeOscAction(device("xr18", mixer.port), action({ target: "aux", operation: "fadeToDB", fadeMs: 120 }));
    const fade = mixer.writes.slice(start);
    assert.ok(fade.length >= 3);
    assert.equal(fade[0].address, "/rtn/aux/mix/fader");
    assert.ok(fade[0].value >= 0.25 && fade[0].value < 0.5);
    assert.equal(fade.at(-1)?.value, 0.75);
  } finally { await mixer.close(); }
});

test("an unreachable or non-applying mixer never reports success", async () => {
  const silent = await fakeMixer({ silent: true });
  const unchanged = await fakeMixer({ ignoreWrites: true });
  try {
    await assert.rejects(testOscMixer(device("x32", silent.port), 100), /não confirmou/);
    await assert.rejects(executeOscAction(device("x32", unchanged.port), action(), 100), /não confirmou/);
    await assert.rejects(executeOscAction(device("x32", silent.port), action({ operation: "fadeToDB", fadeMs: 50 }), 100), /não confirmou/);
    assert.equal(silent.writes.length, 0);
  } finally { await silent.close(); await unchanged.close(); }
});

test("two registered mixers receive only their own actions", async () => {
  const first = await fakeMixer();
  const second = await fakeMixer();
  try {
    await Promise.all([
      executeOscAction(device("x32", first.port), action({ channel: 9, operation: "mute" })),
      executeOscAction(device("xr18", second.port), action({ channel: 3 })),
    ]);
    assert.deepEqual(first.writes, [{ address: "/ch/09/mix/on", value: 0 }]);
    assert.deepEqual(second.writes, [{ address: "/ch/03/mix/fader", value: 0.75 }]);
  } finally { await first.close(); await second.close(); }
});
