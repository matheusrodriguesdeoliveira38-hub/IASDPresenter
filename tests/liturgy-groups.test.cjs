const assert = require('node:assert/strict');
const { test } = require('node:test');
const loadTs = require('./load-ts.cjs');
const groups = loadTs('src/helpers/LiturgyGroups.ts');
const item = id => ({ id, type: 'music' });
const category = id => ({ id, type: 'category', collapsed: true });
const ids = items => Array.from(items, entry => entry.id);
const { default: component } = loadTs('src/modules/liturgy/interface/Index.vue', {
  '@/helpers/LiturgyGroups': groups,
  '@/helpers/HymnalPreference': {},
  '../manifest.json': {},
  '@/components/MenuToggleButton.vue': {},
  vuedraggable: {},
  './RichTextEditor.vue': {},
  '@/helpers/ExternalMedia': {},
  '@/helpers/YouTube': {},
  '@/helpers/ProjectionTransition': {},
});

function context(items) {
  const ctx = {
    ...component.data(), currentItems: items,
    $t: key => key,
    $alert: { yesno: (_, callback) => callback('yes') },
    saves: 0,
  };
  for (const [key, method] of Object.entries(component.methods)) ctx[key] = method.bind(ctx);
  ctx.saveLiturgy = () => { ctx.saves++; };
  Object.defineProperty(ctx, 'selectedItem', { get: () => component.computed.selectedItem.call(ctx) });
  Object.defineProperty(ctx, 'isFormValid', { get: () => component.computed.isFormValid.call(ctx) });
  return ctx;
}

test('existing flat liturgies form groups without losing items or changing order', () => {
  const items = [item('free'), category('a'), item('a1'), item('a2'), category('b')];
  assert.equal(groups.categoryForIndex(items, 0), null);
  assert.equal(groups.categoryForIndex(items, 3), items[1]);
  assert.equal(groups.categoryEnd(items, 1), 4);
  assert.equal(groups.categoryEnd(items, 4), 5);
});

test('inserting into a category, an empty category, or outside categories preserves other groups', () => {
  const items = [category('a'), item('a1'), category('b')];
  assert.deepEqual(ids(groups.insertInCategory(items, item('new'), 'a')), ['a', 'a1', 'new', 'b']);
  assert.deepEqual(ids(groups.insertInCategory(items, item('new'), 'b')), ['a', 'a1', 'b', 'new']);
  assert.deepEqual(ids(groups.insertInCategory(items, item('new'), null)), ['new', 'a', 'a1', 'b']);
  assert.deepEqual(ids(items), ['a', 'a1', 'b']);
});

test('dragging collapsed categories in either direction keeps their children', () => {
  const [a, a1, b, b1] = [category('a'), item('a1'), category('b'), item('b1')];
  const before = [a, a1, b, b1];
  assert.deepEqual(ids(groups.keepCategoryTogether(before, [a1, b, b1, a], 'a')), ['b', 'b1', 'a', 'a1']);
  assert.deepEqual(ids(groups.keepCategoryTogether(before, [b, a, a1, b1], 'b')), ['b', 'b1', 'a', 'a1']);
  assert.deepEqual(ids(groups.keepCategoryTogether(before, [a1, b, a, b1], 'a')), ['b', 'b1', 'a', 'a1']);
});

test('dragging an individual item can move it to another category', () => {
  const before = [category('a'), item('a1'), category('b'), item('b1')];
  const after = [before[0], before[2], before[3], before[1]];
  assert.deepEqual(ids(groups.keepCategoryTogether(before, after, 'a1')), ['a', 'b', 'b1', 'a1']);
  assert.equal(groups.categoryForIndex(after, 3).id, 'b');
});

test('adding a placeholder to a collapsed category expands it and preserves selection', async () => {
  const ctx = context([category('a'), item('a1'), category('b')]);
  ctx.selectedItemIndex = 2;
  ctx.openAddMenu('a');
  ctx.openAddForm('music');
  ctx.addForm.name = 'New song';
  await ctx.saveItem();
  assert.equal(ctx.currentItems[2].name, 'New song');
  assert.equal(ctx.currentItems[2].musicId, null);
  assert.equal(ctx.currentItems[0].collapsed, false);
  assert.equal(ctx.selectedItem.id, 'b');
  assert.equal(ctx.showAddMenu, false);
  assert.equal(ctx.saves, 1);
});

test('editing a category preserves its id, collapsed state and children', async () => {
  const ctx = context([category('a'), item('a1')]);
  ctx.editItem(0);
  ctx.addForm.name = 'Renamed';
  await ctx.saveItem();
  assert.equal(ctx.currentItems[0].collapsed, true);
  assert.deepEqual(ids(ctx.currentItems), ['a', 'a1']);
});

test('removing a category retains its children outside other categories', () => {
  const ctx = context([category('a'), item('a1'), category('b'), item('b1')]);
  ctx.selectedItemIndex = 3;
  ctx.removeItem(2);
  assert.deepEqual(ids(ctx.currentItems), ['b1', 'a', 'a1']);
  assert.equal(ctx.itemCategory(0), null);
  assert.equal(ctx.selectedItem.id, 'b1');
});

test('editing can move a checked item to a different category without losing its identity', async () => {
  const ctx = context([category('a'), { ...item('a1'), name: 'Song', done: true }, category('b')]);
  ctx.selectedItemIndex = 1;
  ctx.editItem(1);
  ctx.addForm.categoryId = 'b';
  await ctx.saveItem();
  assert.deepEqual(ids(ctx.currentItems), ['a', 'b', 'a1']);
  assert.equal(ctx.selectedItem.done, true);
  assert.equal(ctx.itemCategory(2).id, 'b');
});

test('collapsed categories survive the saved liturgy payload', () => {
  const ctx = context([category('a'), item('a1')]);
  ctx.liturgies.sunday = ctx.currentItems;
  ctx.toggleCategory(ctx.currentItems[0]);
  assert.equal(ctx.currentItems[0].collapsed, false);
  ctx.toggleCategory(ctx.currentItems[0]);
  const saved = {};
  ctx.$userdata = { set: (key, value) => { saved[key] = value; } };
  ctx.module_id = 'liturgy';
  component.methods.saveLiturgy.call(ctx);
  assert.equal(saved['modules.liturgy.liturgies'].sunday[0].collapsed, true);
  assert.deepEqual(ids(saved['modules.liturgy.liturgies'].sunday), ['a', 'a1']);
});
