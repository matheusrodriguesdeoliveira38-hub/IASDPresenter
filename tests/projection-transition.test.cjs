const assert = require('node:assert/strict');
const { test } = require('node:test');
const loadTs = require('./load-ts.cjs');

function setup(popups) {
  let listener, timeout, command;
  const window = {
    setTimeout: callback => { timeout = callback; return 1; },
    clearTimeout: () => { timeout = null; },
    addEventListener: (_, callback) => { listener = callback; },
    removeEventListener: () => { listener = null; },
  };
  const { transitionProjection } = loadTs('src/helpers/ProjectionTransition.ts', {}, { window });
  const appdata = {
    get: key => key === 'popups' ? popups : popups[0],
    set: (_, value) => { command = value; },
  };
  return {
    run: () => transitionProjection(appdata, true, 750),
    acknowledge: (source, requestId = command.requestId) => listener?.({
      source, data: { action: 'projection-transition-complete', requestId },
    }),
    expire: () => timeout(),
    clean: () => !listener && !timeout,
    command: () => command,
  };
}

test('waits for every projection and ignores stale or unrelated acknowledgements', async () => {
  const first = {}, second = {};
  const context = setup([first, second]);
  let completed = false;
  const promise = context.run().then(() => { completed = true; });
  assert.equal(context.command().durationMs, 750);
  context.acknowledge({});
  context.acknowledge(first, 'old-request');
  context.acknowledge(second);
  await Promise.resolve();
  assert.equal(completed, false);
  context.acknowledge(first);
  await promise;
  assert.equal(context.clean(), true);
});
test('missing acknowledgements release controls and clean listeners', async () => {
  const context = setup([{}]);
  const promise = context.run();
  context.expire();
  await promise;
  assert.equal(context.clean(), true);
});

test('no open projection completes immediately', async () => {
  const context = setup([{ closed: true }]);
  await context.run();
  assert.equal(context.clean(), true);
});

test('projection animates opacity for the requested duration and acknowledges only when finished', async () => {
  let finishAnimation, frames, options;
  const messages = [];
  const element = {
    style: {},
    getAnimations: () => [],
    animate: (keyframes, settings) => {
      frames = keyframes;
      options = settings;
      return { finished: new Promise(resolve => { finishAnimation = resolve; }) };
    },
  };
  const { default: popup } = loadTs('src/views/Popup.vue', { vue: {}, '@/components/PulpitMessageOverlay.vue': {} }, {
    window: { opener: { postMessage: message => messages.push(message) } },
    getComputedStyle: () => ({ opacity: '1' }),
  });
  const promise = popup.watch.projectionTransition.handler.call({
    $nextTick: () => Promise.resolve(),
    $refs: { projectionContent: element },
  }, { active: true, durationMs: 1200, requestId: 'fade-test' });
  await Promise.resolve();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(options.duration, 1200);
  assert.equal(frames[0].opacity, '1');
  assert.equal(frames[1].opacity, '0');
  assert.equal(element.style.opacity, '0');
  assert.equal(messages.length, 0);
  finishAnimation();
  await promise;
  assert.equal(messages[0].requestId, 'fade-test');
});
