const { test } = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');
const { syncClockWindowOrder } = loadTs('electron/ProjectionWindows.ts');

function window(module, x = 0) {
  return {
    visible: true, destroyed: false, top: true, raised: 0,
    webContents: { getURL: () => `http://localhost/#/popup?module=${module}` },
    isDestroyed() { return this.destroyed; }, isVisible() { return this.visible; },
    getBounds: () => ({ x, y: 0, width: 1920, height: 1080 }),
    setAlwaysOnTop(value) { this.top = value; }, moveTop() { this.raised++; },
  };
}

test('clock stays below content for both load orders, refocus and output closure', () => {
  for (const clockFirst of [true, false]) {
    const clock = window('clock'), output = window('return_monitor');
    (clockFirst ? output : clock).visible = false;
    syncClockWindowOrder([clock, output]);
    clock.visible = output.visible = true;
    syncClockWindowOrder([clock, output]);
    assert.equal(clock.top, false);
    assert.equal(output.raised, 1);
    syncClockWindowOrder([clock, output]);
    assert.equal(clock.top, false);
    output.destroyed = true;
    syncClockWindowOrder([clock, output]);
    assert.equal(clock.top, true);
  }
});

test('separate monitors keep their clocks and shared screens prioritize return content', () => {
  const clock = window('clock'), otherClock = window('clock', 1920);
  const projection = window('bible'), output = window('return_monitor');
  syncClockWindowOrder([clock, otherClock, projection, output]);
  assert.equal(clock.top, false);
  assert.equal(otherClock.top, true);
  assert.equal(output.raised, 1);
  assert.equal(projection.raised, 0);
});
