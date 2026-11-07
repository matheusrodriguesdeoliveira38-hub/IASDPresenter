const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { parseVerses, normalize } = require('../scripts/audit-ntlh.cjs');

test('reference reader preserves combined verses, paragraph continuations and table headings, excluding notes', () => {
  const records = parseVerses(`<div class="abc_s1"><span class="abc_heading">Section title</span></div>
    <span class="abc_verse" data-usfm="GEN.1.1+GEN.1.2"><span class="abc_label">1-2</span><span class="abc_content">First text.</span><span class="abc_note"><span class="abc_content">Not Bible text</span><span data-usfm="GEN.9.1">Cross reference</span></span></span>
    <p><span class="abc_verse" data-usfm="GEN.1.1+GEN.1.2"><span class="abc_content">Continuation &amp; text.</span></span></p>
    <table><tr><th><span class="abc_verse" data-usfm="GEN.1.3+GEN.1.4"><span class="abc_heading">Column name</span></span></th></tr>
    <tr><td><span class="abc_verse" data-usfm="GEN.1.3+GEN.1.4"><span class="abc_content">Cell text.</span></span></td></tr></table>`);
  assert.deepEqual(records, [
    { reference: 'GEN.1.1+GEN.1.2', numbers: [1, 2], text: 'First text. Continuation & text.' },
    { reference: 'GEN.1.3+GEN.1.4', numbers: [3, 4], text: 'Column name Cell text.' },
  ]);
  assert.equal(normalize('Texto: — com  espaços!'), normalize('texto com espaços'));
  assert.notEqual(normalize('Não falou'), normalize('Falou'));
  assert.notEqual(normalize('avó'), normalize('avô'));
});

test('published audit accounts for every empty NTLH record in the current database', () => {
  const report = JSON.parse(fs.readFileSync('docs/AUDITORIA-NTLH.json', 'utf8'));
  assert.equal(report.databaseSha256, crypto.createHash('sha256').update(fs.readFileSync('resources/database.db')).digest('hex'));
  assert.equal(report.summary.emptyRecords, 793);
  assert.equal(report.summary.checkedChapters, 186);
  assert.equal(report.summary.confirmedGroups, 297);
  assert.equal(report.errors.length, 0);
  const keys = new Set();
  for (const row of report.results) {
    const key = `${row.bookNumber}:${row.chapter}:${row.verse}`;
    assert.ok(!keys.has(key), `Duplicate ${key}`);
    keys.add(key);
    assert.equal(row.status, 'combinedTextConfirmed');
    assert.equal(row.localTextSha256, row.publishedTextSha256);
    assert.ok(row.storedAt.length > 0);
    assert.ok(row.publishedReference.split('+').some(ref => Number(ref.split('.').pop()) === row.verse));
  }
  const db = new DatabaseSync('resources/database.db', { readOnly: true });
  try {
    const empty = db.prepare("SELECT b.book_number,v.chapter,v.verse FROM bible_verse v JOIN bible_book b USING(id_bible_book) WHERE id_bible_version=4 AND trim(v.text)=''").all();
    assert.equal(keys.size, empty.length);
    for (const row of empty) assert.ok(keys.has(`${row.book_number}:${row.chapter}:${row.verse}`));
  } finally { db.close(); }
});
