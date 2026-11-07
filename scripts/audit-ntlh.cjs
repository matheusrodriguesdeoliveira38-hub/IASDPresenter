// Read-only comparison with the SBB NTLH edition published by YouVersion.
// Raw reference pages are cached in ignored tmp/; reports contain no Bible text.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { parse } = require('@vue/compiler-dom');
const codes = 'GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV'.split(' ');
const root = path.resolve(__dirname, '..');
const cache = path.join(root, 'tmp/ntlh-reference');
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const normalize = text => text.normalize('NFC').toLowerCase().replace(/<[^>]*>/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
const attr = (node, name) => node.props?.find(p => p.type === 6 && p.name === name)?.value?.content;
const hasClass = (node, suffix) => (attr(node, 'class') || '').split(/\s+/).some(c => c.endsWith('_' + suffix));

function parseVerses(html) {
  const verses = new Map();
  const ast = parse(html, { onError() {} });
  function visit(node, inTableHeader = false) {
    inTableHeader = inTableHeader || node.tag === 'th';
    if (hasClass(node, 'verse')) {
      const ref = attr(node, 'data-usfm');
      if (ref) {
        let text = '';
        function content(child, inside = false) {
          if (hasClass(child, 'note')) return;
          inside = inside || hasClass(child, 'content') || (inTableHeader && hasClass(child, 'heading'));
          if (inside && child.type === 2) text += child.content;
          for (const next of child.children || []) content(next, inside);
        }
        content(node);
        verses.set(ref, (verses.get(ref) || '') + ' ' + text);
      }
    }
    for (const child of node.children || []) visit(child, inTableHeader);
  }
  visit(ast);
  return [...verses].map(([reference, text]) => ({ reference, numbers: reference.split('+').map(r => Number(r.split('.').pop())), text: text.trim() }));
}

async function page(code, chapter) {
  const file = path.join(cache, `${code}.${chapter}.html`);
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  const url = `https://www.bible.com/pt/bible/211/${code}.${chapter}.NTLH`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) {
      if (attempt === 2) throw new Error(`${url}: HTTP ${response.status}`);
      await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1)));
      continue;
    }
    const html = await response.text();
    const verses = parseVerses(html);
    if (!verses.some(v => v.reference.startsWith(`${code}.${chapter}.`))) throw new Error(`No chapter content: ${url}`);
    fs.writeFileSync(file, html);
    return html;
  }
}

async function audit() {
  fs.mkdirSync(cache, { recursive: true });
  const db = new DatabaseSync(path.join(root, 'resources/database.db'), { readOnly: true });
  try {
    const rows = db.prepare('SELECT v.*, b.name, b.book_number FROM bible_verse v JOIN bible_book b USING(id_bible_book) WHERE id_bible_version=4 ORDER BY b.book_number,chapter,verse').all();
    const chapters = new Map();
    for (const row of rows) {
      const key = `${codes[row.book_number - 1]}.${row.chapter}`;
      if (!chapters.has(key)) chapters.set(key, []);
      chapters.get(key).push(row);
    }
    const targets = [...chapters].filter(([, records]) => records.some(r => !r.text.trim()));
    const results = [];
    const sources = [];
    const errors = [];
    let index = 0;
    let completed = 0;
    async function worker() {
      while (index < targets.length) {
        const [key, records] = targets[index++];
        const [code, chapter] = key.split('.');
        const url = `https://www.bible.com/pt/bible/211/${key}.NTLH`;
        try {
          const html = await page(code, chapter);
          const published = parseVerses(html);
          sources.push({ chapter: key, url, sha256: hash(html) });
          for (const row of records.filter(r => !r.text.trim())) {
            const source = published.find(v => v.numbers.includes(row.verse));
            const record = { book: row.name, bookNumber: row.book_number, chapter: row.chapter, verse: row.verse, sourceUrl: url };
            if (!source) {
              results.push({ ...record, status: 'referenceNotFound' });
              continue;
            }
            const owners = records.filter(r => source.numbers.includes(r.verse) && r.text.trim());
            const local = owners.map(r => r.text).join(' ');
            const same = normalize(local) === normalize(source.text);
            results.push({ ...record, publishedReference: source.reference, storedAt: owners.map(r => r.verse), status: source.numbers.length > 1 && same ? 'combinedTextConfirmed' : same ? 'textConfirmed' : 'textMismatch', localTextSha256: hash(normalize(local)), publishedTextSha256: hash(normalize(source.text)) });
          }
        } catch (error) {
          errors.push({ chapter: key, url, error: error.message });
        }
        completed++;
        if (completed % 20 === 0 || completed === targets.length) console.log(`${completed}/${targets.length} chapters checked`);
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    results.sort((a, b) => a.bookNumber - b.bookNumber || a.chapter - b.chapter || a.verse - b.verse);
    sources.sort((a, b) => a.chapter.localeCompare(b.chapter));
    const summary = { emptyRecords: rows.filter(r => !r.text.trim()).length, targetChapters: targets.length, checkedRecords: results.length, checkedChapters: sources.length, statuses: results.reduce((counts, r) => { counts[r.status] = (counts[r.status] || 0) + 1; return counts; }, {}), errors: errors.length };
    summary.confirmedGroups = new Set(results.filter(r => r.status === 'combinedTextConfirmed').map(r => r.publishedReference)).size;
    const report = { source: 'Nova Tradução na Linguagem de Hoje, Sociedade Bíblica do Brasil, ©2000; YouVersion version 211', checkedAt: new Date().toISOString(), databaseSha256: hash(fs.readFileSync(path.join(root, 'resources/database.db'))), method: 'Compare every empty record with explicit published data-usfm verse groups and all nonempty local text within that group. Ignore markup, case, punctuation and whitespace; preserve words, order, accents and digits. Exclude notes and section headings; include table column headings associated with a verse group.', summary, errors, results, sources };
    const output = path.join(root, 'docs/AUDITORIA-NTLH.json');
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(summary, null, 2));
    if (errors.length || results.some(r => !['combinedTextConfirmed', 'textConfirmed'].includes(r.status))) process.exitCode = 1;
    return report;
  } finally { db.close(); }
}
module.exports = { parseVerses, normalize };
if (require.main === module) audit().catch(error => { console.error(error); process.exitCode = 1; });
