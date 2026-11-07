// Read-only structural audit of the Bible shipped with the application.
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const chapterCounts = [50,40,27,36,34,24,21,4,31,24,22,25,29,36,10,13,10,42,150,31,12,8,66,52,5,48,12,14,3,9,1,4,7,3,3,3,2,14,4,28,16,24,21,28,16,16,13,6,6,4,4,5,3,6,4,3,1,13,5,5,3,5,1,1,1,22];
const db = new DatabaseSync(path.join(__dirname, '../resources/database.db'), { readOnly: true });
try {
  const books = db.prepare('SELECT * FROM bible_book ORDER BY book_number').all();
  const versions = db.prepare('SELECT * FROM bible_version').all();
  const issues = [];
  const summaries = [];
  const reference = new Map();
  const data = new Map();
  for (const version of versions) {
    const chapters = new Map();
    const rows = db.prepare('SELECT * FROM bible_verse WHERE id_bible_version = ?').all(version.id_bible_version);
    for (const row of rows) {
      const key = `${row.id_bible_book}:${row.chapter}`;
      if (!chapters.has(key)) chapters.set(key, new Set());
      if (chapters.get(key).has(row.verse)) issues.push({ type: 'duplicate', version: version.abbreviation, key, verse: row.verse });
      chapters.get(key).add(row.verse);
      if (!row.text?.trim()) issues.push({ type: 'emptyText', version: version.abbreviation, key, verse: row.verse, review: 'May be part of a combined verse; verify against this translation.' });
      const book = books.find(b => b.id_bible_book === row.id_bible_book);
      if (!book || row.chapter < 1 || row.chapter > book.chapters || !Number.isInteger(row.verse) || row.verse < 1) issues.push({ type: 'invalidReference', version: version.abbreviation, key, verse: row.verse });
      if (!reference.has(key)) reference.set(key, new Set());
      reference.get(key).add(row.verse);
    }
    const languageBooks = books.filter(b => b.id_language === version.id_language);
    if (languageBooks.length !== 66) issues.push({ type: 'bookCount', version: version.abbreviation });
    for (const book of languageBooks) {
      if (book.chapters !== chapterCounts[book.book_number - 1]) issues.push({ type: 'chapterCount', book: book.name });
      for (let chapter = 1; chapter <= book.chapters; chapter++) {
        if (!chapters.get(`${book.id_bible_book}:${chapter}`)?.size) issues.push({ type: 'missingChapter', version: version.abbreviation, book: book.name, chapter });
      }
    }
    summaries.push({ version: version.abbreviation, books: languageBooks.length, chapters: chapters.size, verses: rows.length });
    data.set(version.id_bible_version, chapters);
  }
  const numberingDifferences = [];
  for (const version of versions) {
    for (const [key, numbers] of reference) {
      const present = data.get(version.id_bible_version).get(key) || new Set();
      const absent = [...numbers].filter(n => !present.has(n));
      if (absent.length) {
        const [bookId, chapter] = key.split(':').map(Number);
        numberingDifferences.push({ version: version.abbreviation, book: books.find(b => b.id_bible_book === bookId)?.name, chapter, absent });
      }
    }
  }
  const report = { scope: 'Bundled database; structural checks only. Numbering differences require translation-specific verification and are not automatically missing text.', summaries, issues, numberingDifferences };
  const output = process.argv[2];
  if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(output ? { summaries, findings: issues.length, numberingDifferences: numberingDifferences.length, output } : report, null, 2));
  if (issues.length) process.exitCode = 1;
} finally { db.close(); }
