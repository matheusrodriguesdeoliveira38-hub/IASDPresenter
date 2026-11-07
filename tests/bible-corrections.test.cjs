const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { correctBibleChapter, NAA_SAMUEL_22_51 } = require('../electron/BibleCorrections.ts');

test('repairs old cached chapters without modifying the input and is idempotent', () => {
  const original = { 50: 'previous verse' };
  const repaired = correctBibleChapter('bible_8_10_22', original);
  assert.equal(repaired[51], NAA_SAMUEL_22_51);
  assert.equal(original[51], undefined);
  assert.deepEqual(correctBibleChapter('bible_8_10_22', repaired), repaired);
  assert.deepEqual(correctBibleChapter('bible_8_10_23', { 39: 'last verse', 51: NAA_SAMUEL_22_51 }), { 39: 'last verse' });
  assert.deepEqual(correctBibleChapter('bible_7_19_95', { 11: 'last verse', 95: '' }), { 11: 'last verse' });
  const acf = correctBibleChapter('bible_13_64_1', { 14: 'First. (1:15)Second.' });
  assert.deepEqual(acf, { 14: 'First.', 15: 'Second.' });
  assert.deepEqual(correctBibleChapter('bible_13_64_1', acf), acf);
});

test('preserves translation groupings, custom text and unrelated records', () => {
  const ntlh = { 9: 'Combined text of verses 9–10.', 10: '' };
  assert.equal(correctBibleChapter('bible_4_1_6', ntlh), ntlh);
  const custom = { 51: 'Custom text' };
  assert.equal(correctBibleChapter('bible_8_10_22', custom)[51], custom[51]);
  assert.equal(correctBibleChapter('bible_8_10_23', custom)[51], custom[51]);
  assert.equal(correctBibleChapter('music_1', custom), custom);
  assert.equal(correctBibleChapter('bible_8_10_22', null), null);
});

test('bundled database has corrected references and preserves all books and chapters', () => {
  const db = new DatabaseSync('resources/database.db', { readOnly: true });
  try {
    const text = (version, book, chapter, verse) => db.prepare('SELECT text FROM bible_verse WHERE id_bible_version=? AND id_bible_book=? AND chapter=? AND verse=?').get(version, book, chapter, verse)?.text;
    assert.equal(text(8, 10, 22, 51), NAA_SAMUEL_22_51);
    assert.equal(text(8, 10, 23, 51), undefined);
    assert.equal(text(7, 19, 95, 95), undefined);
    assert.equal(text(13, 64, 1, 14), 'Espero, porém, ver-te brevemente, e falaremos face a face.');
    assert.equal(text(13, 64, 1, 15), 'Paz seja contigo. Os amigos te saúdam. Saúda os amigos pelo seu nome.');
    assert.equal(db.prepare('SELECT count(*) n FROM bible_book').get().n, 66);
    for (const version of db.prepare('SELECT id_bible_version FROM bible_version').all()) {
      assert.equal(db.prepare('SELECT count(*) n FROM (SELECT DISTINCT id_bible_book,chapter FROM bible_verse WHERE id_bible_version=?)').get(version.id_bible_version).n, 1189);
    }
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  } finally { db.close(); }
});
