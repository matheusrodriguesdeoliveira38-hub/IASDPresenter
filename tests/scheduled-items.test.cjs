const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomUUID } = require('node:crypto');
const loadTs = require('./load-ts.cjs');
const opened = [];
const api = { isFileReadable: async () => true };
// Local date deliberately differs from UTC, catching accidental toISOString use.
class LocalDate extends Date {
  constructor(...args) { super(...(args.length ? args : ['2026-09-26T02:30:00Z'])); }
  getFullYear() { return 2026; }
  getMonth() { return 8; }
  getDate() { return 25; }
}
const { default: component } = loadTs('src/modules/liturgy/interface/Index.vue', {
  '@/helpers/BrowserFiles': api,
  '@/helpers/LiturgyGroups': loadTs('src/helpers/LiturgyGroups.ts'),
  '@/helpers/HymnalPreference': {}, '../manifest.json': {},
  '@/components/MenuToggleButton.vue': {}, vuedraggable: {}, './RichTextEditor.vue': {},
  '@/helpers/ExternalMedia': { isAudioFile: () => true, openExternalMedia: (_, item) => opened.push(item) },
  '@/helpers/YouTube': {}, '@/helpers/ProjectionTransition': {},
}, { crypto: { randomUUID }, window: { electronAPI: api }, Date: LocalDate });
function context(saved = {}) {
  const ctx = { ...component.data(), module_id: 'liturgy', errors: [],
    returnModules: [],
    $media: { async syncReturnMonitor(force, current, module) { ctx.returnModules.push(module); } },
    $userdata: { get: key => saved[key], set: (key, value) => { saved[key] = JSON.parse(JSON.stringify(value)); } },
    $appdata: { get: () => true, set() {} },
    $alert: { error: ({text}) => ctx.errors.push(text), yesno: (_, callback) => callback('yes') },
    $t: key => key,
  };
  for (const [key, method] of Object.entries(component.methods)) ctx[key] = method.bind(ctx);
  for (const key of ['selectedScheduledCategory', 'sortedScheduledItems', 'isFormValid', 'selectedItem']) Object.defineProperty(ctx, key, { get: () => component.computed[key].call(ctx) });
  ctx.currentItems = [];
  ctx.getLiturgyTransitionDurationMs = () => 0;
  ctx.hasActiveLiturgyItem = () => false;
  ctx.stopActiveLiturgyPlayback = async () => {};
  ctx.runAutomationForItem = async () => {};
  return ctx;
}
function populate(ctx) {
  ctx.newScheduledCategoryName = 'Provai e Vede'; ctx.createScheduledCategory();
  ctx.scheduledDate = '2026-09-25'; ctx.scheduledFilePath = 'C:\\media\\today.mp4'; ctx.addScheduledFile();
}

test('export reports success only after writing and handles cancellation and failure', async () => {
  const ctx = context();
  const notices = [], writes = [];
  ctx.$alert.info = notice => notices.push(notice);
  api.saveFileDialog = async () => 'liturgy.json';
  api.writeTextFile = async (path, content) => { writes.push({ path, content }); return { ok: true }; };
  await ctx.exportLiturgy();
  assert.equal(writes.length, 1);
  assert.deepEqual(JSON.parse(writes[0].content), JSON.parse(JSON.stringify(ctx.createExportPayload())));
  assert.equal(notices.length, 1);
  assert.equal(ctx.errors.length, 0);
  api.saveFileDialog = async () => null;
  await ctx.exportLiturgy();
  assert.equal(writes.length, 1);
  assert.equal(notices.length, 1);
  api.saveFileDialog = async () => 'liturgy.json';
  api.writeTextFile = async () => ({ ok: false, error: 'write failed' });
  await ctx.exportLiturgy();
  assert.deepEqual(ctx.errors, ['write failed']);
  assert.equal(notices.length, 1);
});

test('import confirms success through the supported alert API after saving', async () => {
  const ctx = context();
  ctx.liturgies.saturday = [{ id: 'note', type: 'annotation', name: 'Abertura' }];
  const notices = [];
  let saved = false;
  ctx.$alert.info = notice => { assert.equal(saved, true); notices.push(notice); };
  api.openFileDialog = async () => 'liturgy.json';
  api.readTextFile = async () => ({ ok: true, content: JSON.stringify(ctx.createExportPayload()) });
  ctx.saveLiturgy = () => { saved = true; };
  await ctx.importLiturgy();
  assert.equal(notices.length, 1);
  assert.equal(ctx.errors.length, 0);
});

test('clicks received during a load execute once each in order without another click', async () => {
  const ctx = context();
  let release;
  const loading = new Promise(resolve => { release = resolve; });
  const calls = [];
  ctx.executeItemNow = async (item, mode) => {
    calls.push([item.id, mode]);
    if (item.id === 1) await loading;
  };
  const first = ctx.executeItem({ id: 1 });
  const second = ctx.executeItem({ id: 2 }, 'instrumental');
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(calls, [[1, 'audio']]);
  assert.equal(ctx.liturgyTransitionInProgress, true);
  release();
  await Promise.all([first, second]);
  assert.deepEqual(calls, [[1, 'audio'], [2, 'instrumental']]);
  assert.equal(ctx.liturgyTransitionInProgress, false);
});

test('failed item cannot leave subsequent clicks locked', async () => {
  const ctx = context();
  const calls = [];
  ctx.executeItemNow = async item => {
    calls.push(item.id);
    if (item.id === 1) throw new Error('unavailable');
  };
  const first = ctx.executeItem({ id: 1 });
  const rejected = assert.rejects(first, /unavailable/);
  const second = ctx.executeItem({ id: 2 });
  await Promise.all([rejected, second]);
  assert.deepEqual(calls, [1, 2]);
  assert.equal(ctx.liturgyTransitionInProgress, false);
});

test('a clock alone cannot make the first verse click skip opening projection', async () => {
  const ctx = context();
  const calls = [];
  const state = { popups: [{ popupRole: 'clock', closed: false }], popup_module: 'bible' };
  ctx.$appdata = { get: key => state[key], set: (key, value) => { state[key] = value; } };
  ctx.$nextTick = callback => Promise.resolve(callback?.());
  ctx.$popup = { async open(params) { calls.push(params.module); } };
  await ctx.executeItem({ type: 'verse', verseBookId: 1, verseChapter: 1, verseNumbers: '1' });
  assert.deepEqual(calls, ['bible']);
  assert.deepEqual(ctx.returnModules, ['bible']);
});
test('create, persist and reload category and scheduled file with stable IDs', () => {
  const saved = {}; const ctx = context(saved); populate(ctx);
  const reloaded = context(saved); reloaded.loadSavedLiturgies();
  assert.equal(reloaded.scheduledCategories[0].id, ctx.scheduledCategories[0].id);
  assert.equal(reloaded.scheduledCategories[0].items[0].id, ctx.selectedScheduledCategory.items[0].id);
  assert.equal(reloaded.scheduledCategories[0].items[0].name, 'today.mp4');
});
test('duplicate creation and date edit preserve prior values; entries sort chronologically', () => {
  const ctx = context(); populate(ctx); ctx.scheduledFilePath = 'C:\\other.mp4'; ctx.addScheduledFile();
  assert.equal(ctx.selectedScheduledCategory.items.length, 1);
  ctx.scheduledDate = '2026-09-24'; ctx.addScheduledFile();
  const entry = ctx.selectedScheduledCategory.items[1]; const event = { target: { value: '2026-09-25' } };
  ctx.changeScheduledDate(entry, event);
  assert.equal(entry.date, '2026-09-24'); assert.equal(event.target.value, entry.date);
  assert.match(ctx.errors[0], /Já existe/);
  assert.equal(ctx.sortedScheduledItems[0].id, entry.id);
});
test('program item stores category ID without a fixed media path and survives export', async () => {
  const ctx = context(); populate(ctx); ctx.openAddForm('scheduled_item');
  ctx.addForm.scheduledCategoryId = ctx.selectedScheduledCategoryId;
  await ctx.saveItem();
  assert.equal(ctx.currentItems[0].categoryId, ctx.selectedScheduledCategoryId);
  assert.equal(ctx.currentItems[0].filePath, undefined);
  assert.equal(ctx.currentItems[0].name, 'Provai e Vede');
  ctx.liturgies.saturday = ctx.currentItems;
  const payload = ctx.normalizeImportedLiturgies(ctx.createExportPayload());
  assert.equal(payload.scheduledCategories[0].id, ctx.currentItems[0].categoryId);
});
test('execution resolves exact LOCAL day through normal player with volume options', async () => {
  const ctx = context(); populate(ctx); ctx.$userdata.get = () => true;
  opened.length = 0; api.isFileReadable = async () => true;
  await ctx.executeItem({ type: 'scheduled_item', categoryId: ctx.selectedScheduledCategoryId });
  assert.equal(opened.length, 1); assert.equal(opened[0].filePath, 'C:\\media\\today.mp4'); assert.equal(opened[0].volume, 100);
  assert.deepEqual(ctx.returnModules, ['external_media']);
});
test('missing exact date, deleted category and inaccessible file never stop or open media', async () => {
  const ctx = context(); populate(ctx); let stopped = 0;
  ctx.stopActiveLiturgyPlayback = async () => stopped++;
  const item = { type: 'scheduled_item', categoryId: ctx.selectedScheduledCategoryId };
  const entry = ctx.selectedScheduledCategory.items[0]; entry.date = '2026-09-24';
  await ctx.executeItem(item); assert.match(ctx.errors.pop(), /Não há arquivo/);
  entry.date = '2026-09-25'; api.isFileReadable = async () => false;
  await ctx.executeItem(item); assert.match(ctx.errors.pop(), /não está acessível/);
  ctx.deleteScheduledCategory(); await ctx.executeItem(item); assert.match(ctx.errors.pop(), /excluída/);
  assert.equal(stopped, 0);
});
test('deleting populated category requires affirmative confirmation', () => {
  const ctx = context(); populate(ctx); ctx.$alert.yesno = (_, callback) => callback('no');
  ctx.deleteScheduledCategory(); assert.equal(ctx.scheduledCategories.length, 1);
});

test('desktop accessibility check accepts readable files and rejects missing files and directories', async () => {
  const fs = require('node:fs'); const path = require('node:path'); const vm = require('node:vm');
  const source = fs.readFileSync('electron/main.ts', 'utf8');
  const handler = source.slice(source.indexOf("ipcMain.handle('is-file-readable'"), source.indexOf("ipcMain.handle('open-path'"));
  let check;
  vm.runInNewContext(handler, { fs, path, ipcMain: { handle: (_, fn) => { check = fn; } } });
  assert.equal(await check(null, path.resolve('package.json')), true);
  assert.equal(await check(null, path.resolve('missing-scheduled-file.mp4')), false);
  assert.equal(await check(null, path.resolve('src')), false);
  assert.equal(await check(null, 'relative.mp4'), false);
});

test('switching category clears pending file and initializes local date; conflict is visible before saving', () => {
  const ctx = context(); populate(ctx);
  const first = ctx.selectedScheduledCategoryId;
  ctx.newScheduledCategoryName = 'Informativo'; ctx.createScheduledCategory();
  ctx.scheduledFilePath = 'C:\\pending.mp4';
  ctx.selectScheduledCategory(first);
  assert.equal(ctx.scheduledFilePath, '');
  assert.equal(ctx.scheduledDate, '2026-09-25');
  assert.equal(component.computed.scheduledDateConflict.call(ctx), true);
  ctx.scheduledDate = '2026-09-26';
  assert.equal(component.computed.scheduledDateConflict.call(ctx), false);
});
