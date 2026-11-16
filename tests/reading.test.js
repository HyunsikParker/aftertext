import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAnnouncementMessage, findNoticePosition } from '../src/reading.js';

test('buildAnnouncementMessage returns correct format for an index page', () => {
  const pageData = { pageNumber: 100, kind: 'index', title: 'Index' };
  const articles = [
    { page: 101, title: 'First' },
    { page: 201, title: 'Second' },
    { page: 301, title: 'Third' },
    { page: 401, title: 'Fourth' },
    { page: 501, title: 'Fifth' },
    { page: 601, title: 'Sixth' },
    { page: 701, title: 'Seventh' },
    { page: 801, title: 'Eighth' },
    { page: 899, title: 'Ninth' }
  ];
  assert.equal(buildAnnouncementMessage(pageData, articles), 'Page 100, index, 9 notices');
});

test('buildAnnouncementMessage returns correct format for an article page', () => {
  const pageData = { pageNumber: 201, kind: 'article', title: 'Library hours' };
  const articles = [
    { page: 101, title: 'First' },
    { page: 201, title: 'Library hours' },
    { page: 301, title: 'Third' },
    { page: 401, title: 'Fourth' },
    { page: 501, title: 'Fifth' },
    { page: 601, title: 'Sixth' },
    { page: 701, title: 'Seventh' }
  ];
  assert.equal(buildAnnouncementMessage(pageData, articles), 'Page 201, Library hours, notice 2 of 7');
});

test('buildAnnouncementMessage handles bulletin with one notice', () => {
  const pageData = { pageNumber: 100, kind: 'index', title: 'Index' };
  const articles = [{ page: 101, title: 'Only notice' }];
  assert.equal(buildAnnouncementMessage(pageData, articles), 'Page 100, index, 1 notice');
});

test('buildAnnouncementMessage uses plural "notices" when appropriate', () => {
  const pageData = { pageNumber: 100, kind: 'index', title: 'Index' };
  const articles = [
    { page: 101, title: 'First' },
    { page: 201, title: 'Second' }
  ];
  assert.equal(buildAnnouncementMessage(pageData, articles), 'Page 100, index, 2 notices');
});

test('findNoticePosition returns 1-based position of a notice', () => {
  const articles = [
    { page: 101, title: 'First' },
    { page: 105, title: 'Second' },
    { page: 200, title: 'Third' }
  ];
  assert.equal(findNoticePosition(101, articles), 1);
  assert.equal(findNoticePosition(105, articles), 2);
  assert.equal(findNoticePosition(200, articles), 3);
});

test('findNoticePosition returns 0 for missing page number', () => {
  const articles = [
    { page: 101, title: 'First' },
    { page: 105, title: 'Second' },
    { page: 200, title: 'Third' }
  ];
  assert.equal(findNoticePosition(999, articles), 0);
  assert.equal(findNoticePosition(100, articles), 0);
});
