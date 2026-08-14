const assert = require('node:assert/strict');
const test = require('node:test');

const { normalizeSmartSearchText, smartEditDistance, smartTokenScore } = require('./SmartSearch');

test('normalizes accents and punctuation', () => {
  assert.equal(normalizeSmartSearchText('  Grandioso És Tu! '), 'grandioso es tu');
});

test('ranks exact, partial and typo matches', () => {
  assert.equal(smartTokenScore('grandioso es tu', 'Grandioso És Tu'), 100);
  assert.ok(smartTokenScore('grand', 'Grandioso És Tu') >= 80);
  assert.ok(smartTokenScore('grandiozo', 'Grandioso És Tu') >= 60);
  assert.equal(smartTokenScore('castelo', 'Grandioso És Tu'), 0);
});

test('calculates edit distance deterministically', () => {
  assert.equal(smartEditDistance('joao', 'joao'), 0);
  assert.equal(smartEditDistance('joaoo', 'joao'), 1);
});
