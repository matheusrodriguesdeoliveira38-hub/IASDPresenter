const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs-extra');
const { app } = require('electron');
const crypto = require('crypto');
const { writeRecoverableFile } = require('./FileRecovery');

const ENCRYPTION_KEY = Buffer.from('v389s8dkj238910s8a7d3h2j1k9s8d7f', 'utf8');
const IV_LENGTH = 16;

function encryptData(text) {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (e) {
    console.error('Erro ao ofuscar dados', e);
    return null;
  }
}

class DbExtractor {
  constructor(dbPath, language = 'pt', sourceLanguage = language) {
    this.dbPath = dbPath;
    this.language = ['pt', 'en', 'es'].includes(language) ? language : 'pt';
    this.sourceLanguage = ['pt', 'en', 'es'].includes(sourceLanguage) ? sourceLanguage : this.language;
    this.sysdataDir = path.join(app.getPath('userData'), '.sysdata');
  }

  async extract(progressCallback = () => {}) {
    if (!fs.existsSync(this.dbPath)) {
      throw new Error(`Database file not found at ${this.dbPath}`);
    }

    fs.ensureDirSync(this.sysdataDir);
    const db = new Database(this.dbPath, { readonly: true });

    try {
      this.validateLanguage(db);

      progressCallback({ text: 'Extraindo categorias...', progress: 10 });
      this.extractCategories(db);

      progressCallback({ text: 'Extraindo álbuns...', progress: 20 });
      this.extractAlbumsAndMusics(db, progressCallback);

      progressCallback({ text: 'Criando indice de musicas...', progress: 55 });
      this.extractMusicIndex(db);

      progressCallback({ text: 'Extraindo hinários...', progress: 60 });
      this.extractHymnals(db);

      progressCallback({ text: 'Extraindo Bíblias...', progress: 70 });
      this.extractBibles(db, progressCallback);

      progressCallback({ text: 'Extração concluída', progress: 100 });
    } finally {
      db.close();
    }
  }

  validateLanguage(db) {
    const albums = db.prepare('SELECT COUNT(*) AS total FROM albums WHERE id_language = ?').get(this.sourceLanguage);
    const books = db.prepare('SELECT COUNT(*) AS total FROM bible_book WHERE id_language = ?').get(this.sourceLanguage);
    const versions = db.prepare('SELECT COUNT(*) AS total FROM bible_version WHERE id_language = ?').get(this.sourceLanguage);

    if (!albums?.total || !books?.total || !versions?.total) {
      throw new Error(`Database does not contain the required data for language "${this.sourceLanguage}".`);
    }
  }

  saveJson(filename, data) {
    const filePath = path.join(this.sysdataDir, `${filename}.bin`);
    const jsonString = JSON.stringify(data);
    const encryptedContent = encryptData(jsonString);
    if (encryptedContent) {
      writeRecoverableFile(filePath, encryptedContent, {
        // Extraction is restartable until the first-boot marker is written. Avoid
        // decrypting and writing every generated file twice; normal reads create
        // the recovery copy lazily.
        validate: false,
        backup: false,
        parse: (content) => {
          const parts = content.split(':');
          if (parts.length !== 2) throw new Error('Conteudo criptografado invalido.');
          const iv = Buffer.from(parts[0], 'hex');
          const encrypted = Buffer.from(parts[1], 'hex');
          const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
          let decrypted = decipher.update(encrypted, 'hex', 'utf8');
          decrypted += decipher.final('utf8');
          return JSON.parse(decrypted);
        },
      });
    }
  }

  extractCategories(db) {
    const categoriesRows = db.prepare(`SELECT * FROM categories WHERE id_language = ? ORDER BY \`order\` ASC`).all(this.sourceLanguage);
    const albumRows = db.prepare(`
      SELECT ca.id_category, ca.id_album, a.name, a.color, f.dir, f.file_name,
             ca.name as subtitle, ca.\`order\`
      FROM categories_albums ca
      JOIN albums a ON ca.id_album = a.id_album
      LEFT JOIN files f ON a.id_file_image = f.id_file
      WHERE a.id_language = ?
      ORDER BY ca.id_category, ca.\`order\` ASC
    `).all(this.sourceLanguage);
    const albumsByCategory = new Map();

    for (const row of albumRows) {
      if (!albumsByCategory.has(row.id_category)) albumsByCategory.set(row.id_category, []);
      albumsByCategory.get(row.id_category).push({
        id_album: row.id_album,
        name: row.name,
        color: row.color,
        url_image: (row.dir && row.file_name) ? `${row.dir}/${row.file_name}` : null,
        subtitle: row.subtitle || '',
        order: row.order
      });
    }

    const categories = categoriesRows.map(cat => {
      const albums = albumsByCategory.get(cat.id_category) || [];
      return {
        id_category: cat.id_category,
        name: cat.name,
        slug: cat.slug,
        order: cat.order,
        albums: albums.length > 0 ? albums : undefined
      };
    });

    this.saveJson(`${this.language}_categories`, categories);
  }
  extractAlbumsAndMusics(db, progressCallback) {
    const albums = db.prepare(`
      SELECT a.id_album, a.name, a.color, f.dir, f.file_name
      FROM albums a
      LEFT JOIN files f ON a.id_file_image = f.id_file
      WHERE a.id_language = ?
    `).all(this.sourceLanguage);
    const categoriesRows = db.prepare(`
      SELECT ca.id_album, c.slug
      FROM categories_albums ca
      JOIN categories c ON ca.id_category = c.id_category
      JOIN albums a ON ca.id_album = a.id_album
      WHERE a.id_language = ?
    `).all(this.sourceLanguage);
    const musicsRows = db.prepare(`
      SELECT am.id_album, m.id_music, m.name, am.track,
        fm.duration as duration, fim.duration as instrumental_duration,
        fm.dir as m_dir, fm.file_name as m_file,
        fim.dir as im_dir, fim.file_name as im_file,
        fi.dir as i_dir, fi.file_name as i_file
      FROM albums_musics am
      JOIN albums a ON am.id_album = a.id_album
      JOIN musics m ON am.id_music = m.id_music
      LEFT JOIN files fm ON m.id_file_music = fm.id_file
      LEFT JOIN files fim ON m.id_file_instrumental_music = fim.id_file
      LEFT JOIN files fi ON m.id_file_image = fi.id_file
      WHERE a.id_language = ?
      ORDER BY am.id_album, am.track ASC
    `).all(this.sourceLanguage);
    const lyricsRows = db.prepare(`
      SELECT l.id_music, l.id_lyric, l.lyric, l.aux_lyric, l.time,
             l.instrumental_time, l.show_slide, l.\`order\`, fl.dir, fl.file_name
      FROM lyrics l
      LEFT JOIN files fl ON l.id_file_image = fl.id_file
      WHERE EXISTS (
        SELECT 1 FROM albums_musics am
        JOIN albums a ON am.id_album = a.id_album
        WHERE am.id_music = l.id_music AND a.id_language = ?
      )
      ORDER BY l.id_music, l.\`order\` ASC
    `).all(this.sourceLanguage);
    const musicAlbumsRows = db.prepare(`
      SELECT am.id_music, am.id_album, a.name, am.track, f.dir, f.file_name,
             MIN(COALESCE(ca.\`order\`, 0)) AS \`order\`
      FROM albums_musics am
      JOIN albums a ON am.id_album = a.id_album
      LEFT JOIN files f ON a.id_file_image = f.id_file
      LEFT JOIN categories_albums ca ON ca.id_album = a.id_album
      WHERE EXISTS (
        SELECT 1 FROM albums_musics source_am
        JOIN albums source_a ON source_am.id_album = source_a.id_album
        WHERE source_am.id_music = am.id_music AND source_a.id_language = ?
      )
      GROUP BY am.id_music, am.id_album, a.name, am.track, f.dir, f.file_name
    `).all(this.sourceLanguage);

    const groupBy = (rows, key) => {
      const grouped = new Map();
      for (const row of rows) {
        if (!grouped.has(row[key])) grouped.set(row[key], []);
        grouped.get(row[key]).push(row);
      }
      return grouped;
    };
    const categoriesByAlbum = groupBy(categoriesRows, 'id_album');
    const musicsByAlbum = groupBy(musicsRows, 'id_album');
    const lyricsByMusic = groupBy(lyricsRows, 'id_music');
    const albumsByMusic = groupBy(musicAlbumsRows, 'id_music');
    const savedMusics = new Set();
    const totalAlbums = albums.length;

    albums.forEach((album, albumIndex) => {
      const categories = (categoriesByAlbum.get(album.id_album) || []).map(item => item.slug);
      const albumMusics = musicsByAlbum.get(album.id_album) || [];
      const albumJson = {
        id_album: album.id_album,
        name: album.name,
        color: album.color || '',
        url_image: (album.dir && album.file_name) ? `${album.dir}/${album.file_name}` : null,
        categories: categories.length > 0 ? categories : undefined,
        musics: albumMusics.map(music => ({
          id_music: music.id_music,
          name: music.name,
          has_instrumental_music: music.im_file ? 1 : 0,
          duration: music.duration,
          track: music.track
        }))
      };

      for (const music of albumMusics) {
        if (savedMusics.has(music.id_music)) continue;
        savedMusics.add(music.id_music);
        const lyric = (lyricsByMusic.get(music.id_music) || []).map(item => ({
          id_lyric: item.id_lyric,
          id_music: music.id_music,
          lyric: item.lyric,
          aux_lyric: item.aux_lyric,
          url_image: (item.dir && item.file_name) ? `${item.dir}/${item.file_name}` : null,
          image_position: null,
          time: item.time,
          instrumental_time: item.instrumental_time,
          show_slide: item.show_slide,
          order: item.order
        }));
        const musicAlbums = (albumsByMusic.get(music.id_music) || []).map(item => ({
          id_album: item.id_album,
          name: item.name,
          track: item.track,
          url_image: (item.dir && item.file_name) ? `${item.dir}/${item.file_name}` : null,
          order: item.order || 0
        }));

        this.saveJson(`music_${music.id_music}`, {
          id_music: music.id_music,
          name: music.name,
          duration: music.duration,
          instrumental_duration: music.instrumental_duration,
          url_image: (music.i_dir && music.i_file) ? `${music.i_dir}/${music.i_file}` : null,
          image_position: null,
          url_music: (music.m_dir && music.m_file) ? `${music.m_dir}/${music.m_file}` : null,
          url_instrumental_music: (music.im_dir && music.im_file) ? `${music.im_dir}/${music.im_file}` : null,
          lyric,
          albums: musicAlbums
        });
      }

      this.saveJson(`album_${album.id_album}`, albumJson);
      const processedAlbums = albumIndex + 1;
      if (processedAlbums % 10 === 0 || processedAlbums === totalAlbums) {
        const fraction = totalAlbums ? processedAlbums / totalAlbums : 1;
        progressCallback({ text: 'Extraindo albuns...', progress: 20 + Math.floor(fraction * 35) });
      }
    });
  }
  extractMusicIndex(db) {
    const rows = db.prepare(`
      SELECT DISTINCT
        m.id_music,
        m.name,
        fm.duration as duration,
        fm.file_name as music_file,
        fim.file_name as instrumental_file
      FROM musics m
      JOIN albums_musics am ON am.id_music = m.id_music
      JOIN albums a ON a.id_album = am.id_album
      LEFT JOIN files fm ON m.id_file_music = fm.id_file
      LEFT JOIN files fim ON m.id_file_instrumental_music = fim.id_file
      WHERE a.id_language = ?
      ORDER BY m.name ASC
    `).all(this.sourceLanguage);

    const albumRows = db.prepare(`
      SELECT
        am.id_music,
        am.id_album,
        am.track,
        a.name,
        CASE
          WHEN am.id_album IN (712, 629) THEN 'hymnal'
          ELSE 'album'
        END as type
      FROM albums_musics am
      JOIN albums a ON am.id_album = a.id_album
      WHERE a.id_language = ?
      ORDER BY a.name ASC, am.track ASC
    `).all(this.sourceLanguage);

    const lyricsRows = db.prepare(`
      SELECT l.id_music, l.lyric, l.aux_lyric
      FROM lyrics l
      WHERE EXISTS (
        SELECT 1 FROM albums_musics am
        JOIN albums a ON am.id_album = a.id_album
        WHERE am.id_music = l.id_music AND a.id_language = ?
      )
      ORDER BY l.\`order\` ASC
    `).all(this.sourceLanguage);

    const albumsByMusic = new Map();
    for (const album of albumRows) {
      if (!albumsByMusic.has(album.id_music)) albumsByMusic.set(album.id_music, []);
      albumsByMusic.get(album.id_music).push({
        id_album: album.id_album,
        name: album.name,
        type: album.type,
        pivot: {
          track: album.track
        }
      });
    }

    const lyricsByMusic = new Map();
    for (const lyric of lyricsRows) {
      const text = [lyric.lyric, lyric.aux_lyric].filter(Boolean).join(' ');
      if (!lyricsByMusic.has(lyric.id_music)) lyricsByMusic.set(lyric.id_music, []);
      if (text.trim()) lyricsByMusic.get(lyric.id_music).push(text);
    }

    const musicIndex = rows.map(row => {
      const albums = albumsByMusic.get(row.id_music) || [];
      return {
        id_music: row.id_music,
        name: row.name,
        duration: row.duration,
        has_music: row.music_file ? 1 : 0,
        has_instrumental_music: row.instrumental_file ? 1 : 0,
        albums,
        albums_names: albums.map(album => album.name).join(' '),
        lyric: (lyricsByMusic.get(row.id_music) || []).join(' ')
      };
    });

    this.saveJson(`${this.language}_musics`, musicIndex);
  }

  extractHymnals(db) {
    if (this.language !== 'pt' || this.sourceLanguage !== 'pt') return;

    const rows = db.prepare(`
      SELECT am.id_album, am.track, m.id_music, m.name,
             fim.file_name as im_file, fm.duration
      FROM albums_musics am
      JOIN musics m ON am.id_music = m.id_music
      LEFT JOIN files fm ON m.id_file_music = fm.id_file
      LEFT JOIN files fim ON m.id_file_instrumental_music = fim.id_file
      WHERE am.id_album IN (712, 629)
      ORDER BY am.id_album, am.track ASC
    `).all();
    const lyricRows = db.prepare(`
      SELECT l.id_music, l.lyric
      FROM lyrics l
      WHERE EXISTS (
        SELECT 1 FROM albums_musics am
        WHERE am.id_music = l.id_music AND am.id_album IN (712, 629)
      )
      ORDER BY l.id_music, l.\`order\` ASC
    `).all();
    const lyricsByMusic = new Map();
    for (const lyric of lyricRows) {
      if (!lyricsByMusic.has(lyric.id_music)) lyricsByMusic.set(lyric.id_music, []);
      if (lyric.lyric && lyric.lyric.trim()) lyricsByMusic.get(lyric.id_music).push(lyric.lyric);
    }
    const getHymnalData = albumId => rows
      .filter(row => row.id_album === albumId)
      .map(row => {
        const lyrics = lyricsByMusic.get(row.id_music) || [];
        return {
          id_music: row.id_music,
          name: row.name,
          track: row.track,
          has_instrumental_music: row.im_file ? 1 : 0,
          duration: row.duration,
          lyric: lyrics.length ? `${lyrics.join(' ')} ` : ''
        };
      });

    try {
      this.saveJson('pt_hymnal', getHymnalData(712));
      this.saveJson('pt_hymnal_1996', getHymnalData(629));
    } catch (error) {
      console.log('Hinarios ignorados caso nao existam:', error.message);
    }
  }
  extractBibles(db, progressCallback) {
    const books = db.prepare(`SELECT * FROM bible_book WHERE id_language = ? ORDER BY book_number ASC`).all(this.sourceLanguage);
    this.saveJson(`${this.language}_bible_book`, books);

    const versions = db.prepare(`SELECT * FROM bible_version WHERE id_language = ?`).all(this.sourceLanguage);
    this.saveJson(`${this.language}_bible_version`, versions);

    let processedChapters = 0;
    const totalChapters = books.reduce((sum, book) => sum + book.chapters, 0) * versions.length;

    for (const version of versions) {
      const verseRows = db.prepare(`
        SELECT id_bible_book, chapter, verse, text
        FROM bible_verse
        WHERE id_bible_version = ?
        ORDER BY id_bible_book, chapter, verse ASC
      `).all(version.id_bible_version);
      const chapters = new Map();
      for (const verse of verseRows) {
        const key = `${verse.id_bible_book}:${verse.chapter}`;
        if (!chapters.has(key)) chapters.set(key, {});
        chapters.get(key)[verse.verse] = verse.text;
      }

      for (const book of books) {
        for (let chapter = 1; chapter <= book.chapters; chapter++) {
          const verses = chapters.get(`${book.id_bible_book}:${chapter}`) || {};
          this.saveJson(`bible_${version.id_bible_version}_${book.id_bible_book}_${chapter}`, verses);
          processedChapters++;
          if (processedChapters % 100 === 0 || processedChapters === totalChapters) {
            const fraction = totalChapters ? processedChapters / totalChapters : 1;
            progressCallback({ text: 'Extraindo Biblias...', progress: 70 + Math.floor(fraction * 30) });
          }
        }
      }
    }
  }
}

module.exports = DbExtractor;
