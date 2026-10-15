const assert = require('node:assert/strict');
const { test } = require('node:test');
const loadTs = require('./load-ts.cjs');
const timing = loadTs('src/helpers/LiturgyTiming.ts');
const { durationSeconds, elapsedSeconds, startStage, changeStageStatus, formatStageTime } = timing;

test('deadline uses local start date and becomes overdue exactly at the limit', () => {
  const start = new Date(2026, 9, 14, 11, 20).getTime();
  const end = new Date(2026, 9, 14, 11, 30).getTime();
  const timer = startStage({ id: 'sermon', name: 'Sermão', timingMode: 'deadline', endTime: '11:30', plannedMinutes: 99 }, start);
  assert.equal(timer.deadlineAt, end);
  assert.equal(timer.plannedSeconds, 0);
  assert.equal(timing.remainingStageSeconds(timer, start), 600);
  assert.equal(timing.remainingStageSeconds(timer, end), 0);
  assert.equal(timing.remainingStageSeconds(timer, end + 65000), -65);
});

test('pausing a deadline does not postpone it; finishing freezes its final result', () => {
  const start = new Date(2026, 9, 14, 11, 20).getTime();
  let timer = startStage({ id: 1, name: 'Etapa', timingMode: 'deadline', endTime: '11:30' }, start);
  timer = changeStageStatus(timer, 'paused', start + 60000);
  assert.equal(timing.remainingStageSeconds(timer, start + 660000), -60);
  timer = changeStageStatus(timer, 'finished', start + 660000);
  assert.equal(timing.remainingStageSeconds(timer, start + 900000), -60);
});

test('a past end time is already overdue and never silently moves to tomorrow', () => {
  const now = new Date(2026, 9, 14, 11, 40).getTime();
  const timer = startStage({ id: 1, name: 'Etapa', timingMode: 'deadline', endTime: '11:30' }, now);
  assert.equal(timing.remainingStageSeconds(timer, now), -600);
  assert.equal(timing.validEndTime('24:00'), false);
  assert.equal(timing.validEndTime('11:60'), false);
  assert.equal(timing.validEndTime(''), false);
  assert.equal(timing.validEndTime('00:00'), true);
});

const { default: clock } = loadTs('src/components/LiturgyStageClock.vue', { '@/helpers/LiturgyTiming': timing });
test('clock explicitly displays overdue at zero, including paused deadlines', () => {
  assert.equal(clock.computed.overdue.call({ remaining: 0 }), true);
  assert.equal(clock.computed.overdue.call({ remaining: null }), false);
  assert.equal(clock.computed.statusText.call({ overdue: true, timer: { status: 'paused' }, $t: key => key }), 'modules.liturgy.timing.overdue');
});

test('duration handles legacy items, fractional minutes and invalid imported values', () => {
  assert.equal(durationSeconds(undefined), 0);
  assert.equal(durationSeconds('1.5'), 90);
  assert.equal(durationSeconds(-1), 0);
  assert.equal(durationSeconds(Infinity), 0);
  assert.equal(durationSeconds('invalid'), 0);
  assert.equal(durationSeconds(2000), 86400);
});

test('pause and resume retain subsecond time and exclude the paused interval', () => {
  let timer = startStage({ id: 'sermon', name: 'Sermão', plannedMinutes: 30 }, 1000);
  assert.equal(elapsedSeconds(timer, 6000), 5);
  timer = changeStageStatus(timer, 'paused', 6500);
  assert.equal(elapsedSeconds(timer, 100000), 5);
  timer = changeStageStatus(timer, 'running', 100000);
  assert.equal(elapsedSeconds(timer, 101500), 7);
  timer = changeStageStatus(timer, 'finished', 102000);
  assert.equal(elapsedSeconds(timer, 900000), 7);
  assert.equal(timer.startedAt, null);
});

test('elapsed time derives from timestamps after delayed callbacks and exceeds the plan', () => {
  const timer = startStage({ id: 1, name: 'Oração', plannedMinutes: 1 }, 0);
  assert.equal(elapsedSeconds(timer, 75000), 75);
  assert.equal(elapsedSeconds(timer, -100), 0);
  assert.equal(formatStageTime(75 - timer.plannedSeconds), '00:15');
  assert.equal(formatStageTime(3661), '1:01:01');
});

const { default: panel } = loadTs('src/components/LiturgyTimingPanel.vue', {
  vue: {}, './LiturgyStageClock.vue': {}, '@/helpers/LiturgyTiming': timing,
});

test('changing liturgy or selection cannot silently replace a running stage', () => {
  let timer = startStage({ id: 'first', name: 'Primeira', plannedMinutes: 1 }, 100);
  const ctx = { selectedStage: { id: 'second', name: 'Segunda' }, busy: true,
    $appdata: { set: (_, value) => { timer = value; } } };
  panel.methods.start.call(ctx);
  assert.equal(timer.itemId, 'first');
  ctx.busy = false;
  panel.methods.start.call(ctx);
  assert.equal(timer.itemId, 'second');
});

test('program totals exclude category headings and report stages without a plan', () => {
  const stages = panel.computed.stages.call({ items: [
    { id: 1, name: 'Louvor', type: 'category', plannedMinutes: 10 },
    { id: 2, name: 'Hino', type: 'music', plannedMinutes: 3.5 },
    { id: 3, name: 'Oração', type: 'annotation' },
  ] });
  assert.equal(panel.computed.totalSeconds.call({ stages }), 210);
  assert.equal(panel.computed.unplanned.call({ stages }), 1);
});
