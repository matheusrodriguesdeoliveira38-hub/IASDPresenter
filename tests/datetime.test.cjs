const { test } = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');
const datetime = loadTs('src/helpers/DateTime.ts').default;

test('song durations accept minutes, hours and seconds without NaN', () => {
  assert.equal(datetime.shortTime('00:00'), '0:00');
  assert.equal(datetime.shortTime('03:25'), '3:25');
  assert.equal(datetime.shortTime('01:03:25'), '63:25');
  assert.equal(datetime.shortTime(205), '3:25');
  assert.equal(datetime.shortTime('invalid'), '0:00');
});
