// Apply confirmed reference repairs transactionally; keep an original backup.
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const { NAA_SAMUEL_22_51 } = require('../electron/BibleCorrections.ts');
const file = path.join(__dirname, '../resources/database.db');
const backup = path.join(__dirname, '../tmp/database-before-bible-fixes.db');
fs.mkdirSync(path.dirname(backup), { recursive: true });
if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);
const db = new DatabaseSync(file);
try {
  db.exec('BEGIN IMMEDIATE');
  const source = db.prepare('SELECT * FROM bible_verse WHERE id_bible_version=8 AND id_bible_book=10 AND chapter=23 AND verse=51').get();
  if (source) {
    if (source.text !== NAA_SAMUEL_22_51) throw new Error('Unexpected NAA source; aborting repair.');
    if (db.prepare('SELECT 1 FROM bible_verse WHERE id_bible_version=8 AND id_bible_book=10 AND chapter=22 AND verse=51').get()) throw new Error('NAA target already exists.');
    db.prepare('UPDATE bible_verse SET chapter=22 WHERE id_bible_verse=?').run(source.id_bible_verse);
  }
  db.prepare("DELETE FROM bible_verse WHERE id_bible_version=7 AND id_bible_book=19 AND chapter=95 AND verse=95 AND text=''").run();
  const combined = db.prepare('SELECT * FROM bible_verse WHERE id_bible_version=13 AND id_bible_book=64 AND chapter=1 AND verse=14').get();
  if (combined?.text.includes(' (1:15)')) {
    const parts = combined.text.split(' (1:15)');
    if (parts.length !== 2 || !parts.every(part => part.trim())) throw new Error('Unexpected ACF combined verse.');
    if (db.prepare('SELECT 1 FROM bible_verse WHERE id_bible_version=13 AND id_bible_book=64 AND chapter=1 AND verse=15').get()) throw new Error('ACF target already exists.');
    db.prepare('UPDATE bible_verse SET text=? WHERE id_bible_verse=?').run(parts[0].trim(), combined.id_bible_verse);
    db.prepare('INSERT INTO bible_verse (id_bible_version,id_bible_book,chapter,verse,text,id_language,created_at,updated_at) VALUES (13,64,1,15,?,?,?,?)').run(parts[1].trim(), combined.id_language, combined.created_at, combined.updated_at);
  }
  db.exec('COMMIT');
  console.log('Confirmed Bible repairs applied. Backup: ' + backup);
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
} finally { db.close(); }
