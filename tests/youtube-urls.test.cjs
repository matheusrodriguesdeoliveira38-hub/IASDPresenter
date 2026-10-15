const { test } = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

test('renderer and runtime share YouTube URL validation and reject invalid protocols', () => {
  const runtime = loadTs('electron/YouTube.ts', {}, { URL, URLSearchParams });
  const renderer = loadTs('src/helpers/YouTube.ts', {}, { URL, URLSearchParams });
  for (const url of [
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    'https://youtube.com/shorts/dQw4w9WgXcQ',
  ]) {
    assert.equal(runtime.getYouTubeVideoId(url), 'dQw4w9WgXcQ');
    assert.equal(renderer.getYouTubeVideoId(url), runtime.getYouTubeVideoId(url));
  }
  for (const url of ['ftp://youtube.com/watch?v=dQw4w9WgXcQ', 'file://youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ', 'https://youtu.be/invalid']) {
    assert.equal(runtime.getYouTubeVideoId(url), '');
    assert.equal(renderer.getYouTubeVideoId(url), '');
  }
  const output = new URL(runtime.getYouTubeEmbedUrl('https://youtu.be/dQw4w9WgXcQ?t=90', {
    autoplay: false, muted: true, startSeconds: 0, origin: 'http://localhost:1975',
  }));
  assert.equal(output.searchParams.get('autoplay'), '0');
  assert.equal(output.searchParams.get('mute'), '1');
  assert.equal(output.searchParams.get('cc_load_policy'), '0');
  assert.equal(output.searchParams.get('start'), null);
  assert.equal(output.searchParams.get('origin'), 'http://localhost:1975');
});
