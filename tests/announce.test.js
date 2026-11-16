import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileBulletin } from '../src/core.js';
import { sample } from '../src/sample.js';
import { buildAnnouncementMessage } from '../src/reading.js';

const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');

test('notice position follows page order when the bulletin stores notices in another order', () => {
  const bulletin = { ...sample, articles: [...sample.articles].reverse() };
  const compiled = compileBulletin(bulletin);
  const last = compiled.pages.at(-1);
  const total = compiled.articles.length;
  assert.equal(
    buildAnnouncementMessage(last, bulletin.articles),
    `Page ${last.pageNumber}, ${last.title}, notice ${total} of ${total}`
  );
});

test('in the Teletext grid the announcement keeps the subpage of a long notice', () => {
  const compiled = compileBulletin(sample);
  const long = compiled.pages.find(page => page.subpageCount > 1);
  assert.ok(long, 'the sample has a notice with more than one subpage');
  const position = compiled.articles.findIndex(article => article.page === long.pageNumber) + 1;
  const base = `Page ${long.pageNumber}, ${long.title}, notice ${position} of ${compiled.articles.length}`;
  assert.equal(
    buildAnnouncementMessage(long, sample.articles, 'grid'),
    `${base}, subpage ${long.subpageIndex + 1} of ${long.subpageCount}`
  );
  assert.equal(buildAnnouncementMessage(long, sample.articles, 'text'), base);
  assert.equal(buildAnnouncementMessage(long, sample.articles), base);
});

test('src/ui.js tells the announcement which format is shown', () => {
  assert.match(ui, /buildAnnouncementMessage\([^;]*state\.format/);
});
