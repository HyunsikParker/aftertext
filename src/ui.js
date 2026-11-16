import { LIMITS, compileBulletin, serializeBulletin, deserializeBulletin, validateBulletin } from './core.js';
import { sample } from './sample.js';
import { buildAnnouncementMessage, focusReadingHeading, shouldMoveFocus } from './reading.js';

const $ = id => document.getElementById(id);
const clone = value => JSON.parse(JSON.stringify(value));
const STORAGE = 'aftertext:bulletin:v1';
const bytes = value => new TextEncoder().encode(value).length;
const state = { bulletin:clone(sample), compiled:null, page:0, format:matchMedia('(max-width:767px)').matches ? 'text' : 'grid', mode:'reader', source:'Example bulletin', draft:null, selected:0, dirty:false, preview:[], previewIndex:0, buffer:'' };
let previewTimer;

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function notice(text = '', error = false) {
  $('message').textContent = text;
  $('message').classList.toggle('error', error);
}
function age(timestamp, now = Date.now()) {
  const diff = now - new Date(timestamp).getTime();
  if (diff < -60000) return 'Future issue date';
  if (diff < 60000) return 'Issued just now';
  if (diff < 3600000) return `Issued ${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `Issued ${Math.floor(diff / 3600000)} h ago`;
  const days = Math.floor(diff / 86400000);
  return `Issued ${days} ${days === 1 ? 'day' : 'days'} ago`;
}
function dateLabel(timestamp) {
  return new Intl.DateTimeFormat('en', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', timeZoneName:'short' }).format(new Date(timestamp));
}
function localDateValue(timestamp) {
  const d = new Date(timestamp);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0,19);
}
function persist(bulletin) {
  try { localStorage.setItem(STORAGE, serializeBulletin(bulletin)); return true; }
  catch { return false; }
}
function setBulletin(bulletin, source) {
  const compiled = compileBulletin(bulletin);
  state.bulletin = clone(bulletin);
  state.compiled = compiled;
  state.source = source;
  state.page = 0;
  state.buffer = '';
  $('number-buffer').textContent = '';
  renderContents();
  renderReader();
}
function go(number, subpage = 0, announce = true, initiated = true) {
  const index = state.compiled.pages.findIndex(p => p.pageNumber === number && p.subpageIndex === subpage);
  if (index < 0) { notice(`Page ${number} is not in this bulletin. Choose a page from the contents.`, true); return false; }
  state.page = index;
  renderReader();
  if (announce) {
    const fullMessage = buildAnnouncementMessage(state.compiled.pages[state.page], state.compiled.articles, state.format);
    notice(fullMessage);
  }
  if (shouldMoveFocus({ mode: state.mode, format: state.format, initiated })) {
    focusReadingHeading($('reading-text'));
  }
  return true;
}
function step(direction) {
  let next = state.page + direction;
  if (state.format === 'text') {
    const currentNumber = state.compiled.pages[state.page].pageNumber;
    while (next >= 0 && next < state.compiled.pages.length && state.compiled.pages[next].pageNumber === currentNumber) next += direction;
    if (direction < 0 && next >= 0) {
      const targetNumber = state.compiled.pages[next].pageNumber;
      next = state.compiled.pages.findIndex(p => p.pageNumber === targetNumber);
    }
  }
  if (next < 0 || next >= state.compiled.pages.length) return;
  state.page = next;
  renderReader();
  const p = state.compiled.pages[next];
  if (state.format === 'text') {
    const fullMessage = buildAnnouncementMessage(p, state.compiled.articles, state.format);
    notice(fullMessage);
  } else {
    notice(`Page ${p.pageNumber}, subpage ${p.subpageIndex + 1} of ${p.subpageCount}.`);
  }
  if (shouldMoveFocus({ mode: state.mode, format: state.format, initiated: true })) {
    focusReadingHeading($('reading-text'));
  }
}
function renderGrid(container, page, linkIndex = false) {
  container.replaceChildren();
  if (!page) { container.append(el('p','Fix the fields to preview this notice.')); return; }
  page.rows.forEach((row, i) => {
    const match = linkIndex && page.kind === 'index' && row.match(/^\s*(\d{3})\b/);
    const target = match && Number(match[1]);
    const canLink = target && state.compiled.articles.some(a => a.page === target);
    const line = el(canLink ? 'button' : 'span',row,`line ${page.sourceRows?.[i]?.field === 'title' ? 'title' : ''}`);
    if (canLink) { line.type = 'button'; line.addEventListener('click',() => go(target)); }
    container.append(line);
  });
}
function renderReading(page) {
  const host = $('reading-text'); host.replaceChildren();
  if (page.kind === 'index') {
    host.append(el('p','Page 100','topic'),el('h2','In this bulletin'));
    const list = el('div',undefined,'index-list');
    state.compiled.articles.forEach(a => {
      const button = el('button'); button.type = 'button';
      button.append(el('span',String(a.page)),el('span',a.title));
      button.addEventListener('click',() => go(a.page)); list.append(button);
    });
    host.append(list);
  } else {
    const a = page.article;
    host.append(el('p',a.category,'topic'),el('h2',a.title));
    for (const paragraph of a.body.split('\n\n')) host.append(el('p',paragraph));
    if (a.sourceUrl) {
      const source = el('a','Read the source'); source.href = a.sourceUrl;
      source.target = '_blank'; source.rel = 'noopener noreferrer'; host.append(source);
    }
  }
}
function renderReader() {
  const page = state.compiled.pages[state.page];
  const reading = state.format === 'text';
  $('page-label').textContent = `Page ${page.pageNumber}`;
  $('subpage-label').textContent = reading ? page.kind === 'index' ? 'Index' : 'Full notice' : page.subpageCount > 1 ? `${page.subpageIndex + 1} / ${page.subpageCount}` : '';
  $('screen-page').textContent = String(page.pageNumber);
  $('page-input').value = String(page.pageNumber);
  $('channel-name').textContent = state.bulletin.name;
  $('sample-label').hidden = !state.bulletin.name.includes('· Example');
  $('issued').textContent = dateLabel(state.bulletin.issuedAt);
  $('age').textContent = age(state.bulletin.issuedAt);
  $('grid').hidden = reading; $('reading-text').hidden = !reading;
  $('grid-mode').setAttribute('aria-pressed',String(!reading));
  $('text-mode').setAttribute('aria-pressed',String(reading));
  renderGrid($('grid'),page,true); renderReading(page);
  $('previous').disabled = reading ? page.pageNumber === 100 : state.page === 0;
  $('next').disabled = reading ? page.pageNumber === state.compiled.articles.at(-1).page : state.page === state.compiled.pages.length - 1;
  $('copy-state').textContent = state.source;
  $('payload').textContent = `${bytes(serializeBulletin(state.bulletin)).toLocaleString('en')} bytes · ${state.bulletin.articles.length} notices`;
  for (const button of $('contents').querySelectorAll('button')) {
    if (Number(button.dataset.page) === page.pageNumber) button.setAttribute('aria-current','page');
    else button.removeAttribute('aria-current');
  }
}
function renderContents() {
  $('contents').replaceChildren();
  const entries = [{ page:100, title:'Index' }, ...state.compiled.articles];
  for (const a of entries) {
    const button = el('button'); button.type = 'button'; button.dataset.page = a.page;
    button.append(el('span',String(a.page)),el('span',a.title));
    button.addEventListener('click',() => go(a.page)); $('contents').append(button);
  }
  $('article-count').textContent = `${state.bulletin.articles.length} notices`;
}
function digit(value) {
  if (value === 'clear') state.buffer = '';
  else if (value === 'back') state.buffer = state.buffer.slice(0,-1);
  else state.buffer += value;
  $('number-buffer').textContent = state.buffer.padEnd(3,'_');
  if (state.buffer.length === 3) {
    const n = Number(state.buffer); state.buffer = ''; go(n);
    $('number-buffer').textContent = '';
  }
}
function switchMode(mode) {
  if (state.mode === 'editor') syncDraft();
  state.mode = mode;
  $('reader').hidden = mode !== 'reader'; $('editor').hidden = mode !== 'editor';
  for (const key of ['reader','editor']) {
    $(key+'-mode').classList.toggle('selected',mode === key);
    $(key+'-mode').setAttribute('aria-pressed',String(mode === key));
  }
  if (mode === 'editor') {
    if (!state.draft) { state.draft = clone(state.bulletin); state.selected = 0; }
    populateEditor();
  }
  notice();
}
function markDirty() { state.dirty = true; $('dirty').textContent = 'Unsaved changes'; }
function syncDraft() {
  if (!state.draft) return;
  state.draft.name = $('bulletin-name').value;
  const date = $('bulletin-date').value;
  state.draft.issuedAt = date && Number.isFinite(new Date(date).getTime()) ? new Date(date).toISOString() : '';
  const a = state.draft.articles[state.selected];
  if (!a) return;
  a.page = $('article-page').value === '' ? null : Number($('article-page').value);
  a.category = $('article-category').value; a.title = $('article-title').value; a.body = $('article-body').value;
  const source = $('article-source').value;
  if (source) a.sourceUrl = source; else delete a.sourceUrl;
}
function populateEditor() {
  $('bulletin-name').value = state.draft.name;
  $('bulletin-date').value = state.draft.issuedAt && Number.isFinite(new Date(state.draft.issuedAt).getTime()) ? localDateValue(state.draft.issuedAt) : '';
  const a = state.draft.articles[state.selected];
  $('notice-fields').hidden = !a;
  if (a) {
    $('article-page').value = a.page ?? ''; $('article-category').value = a.category;
    $('article-title').value = a.title; $('article-body').value = a.body; $('article-source').value = a.sourceUrl || '';
    $('notice-legend').textContent = `Notice ${state.selected + 1}`;
  }
  $('dirty').textContent = state.dirty ? 'Unsaved changes' : 'No unsaved changes';
  renderEditorList(); updatePreview();
}
function renderEditorList() {
  $('editor-articles').replaceChildren();
  state.draft.articles.forEach((a,i) => {
    const button = el('button',String(a.page ?? 'New')); button.type = 'button';
    button.setAttribute('aria-label',`Edit notice ${i + 1}: ${a.title || 'Untitled'}`);
    button.setAttribute('aria-current',String(state.selected === i));
    button.addEventListener('click',() => { syncDraft(); state.selected = i; state.previewIndex = 0; populateEditor(); });
    $('editor-articles').append(button);
  });
  $('add-article').disabled = state.draft.articles.length >= LIMITS.articles;
}
function showErrors(errors = []) {
  for (const input of $('editor-form').querySelectorAll('[aria-invalid]')) input.removeAttribute('aria-invalid');
  for (const node of $('editor-form').querySelectorAll('[data-error]')) node.textContent = '';
  const map = { name:'bulletin-name', issuedAt:'bulletin-date', page:'article-page', category:'article-category', title:'article-title', body:'article-body', sourceUrl:'article-source' };
  for (const error of errors) {
    const articleMatch = error.field.match(/^articles(?:\[(\d+)\]|\.(\d+))\.(\w+)$/);
    const field = articleMatch && Number(articleMatch[1] ?? articleMatch[2]) === state.selected ? articleMatch[3] : !articleMatch ? error.field : '';
    const input = map[field] && $(map[field]);
    if (input) {
      input.setAttribute('aria-invalid','true');
      const target = $('editor-form').querySelector(`[data-error="${field}"]`);
      if (target) { target.textContent = error.message; target.id = `error-${field}`; input.setAttribute('aria-describedby',target.id); }
    }
  }
  $('editor-errors').replaceChildren(...errors.slice(0,8).map(e => el('div',`${e.field}: ${e.message}`)));
}
function updatePreview() {
  syncDraft();
  $('body-count').textContent = `${Array.from($('article-body').value).length.toLocaleString('en')} / ${LIMITS.body.toLocaleString('en')} characters`;
  const result = validateBulletin(state.draft); showErrors(result.ok ? [] : result.errors);
  if (!result.ok) { state.preview = []; $('preview-size').textContent = 'Fix the fields to export'; renderPreview(); return; }
  try {
    const compiled = compileBulletin(result.bulletin);
    const page = state.draft.articles[state.selected]?.page ?? 100;
    state.preview = compiled.pages.filter(p => p.pageNumber === page);
    state.previewIndex = Math.min(state.previewIndex, state.preview.length-1);
    $('preview-size').textContent = `${bytes(serializeBulletin(result.bulletin)).toLocaleString('en')} bytes`;
    renderPreview();
  } catch (error) {
    state.preview = []; renderPreview(); $('editor-errors').textContent = error.message;
  }
}
function renderPreview() {
  const p = state.preview[state.previewIndex];
  renderGrid($('preview-grid'),p);
  $('preview-page').textContent = p ? String(p.pageNumber) : '';
  $('preview-position').textContent = p ? `${p.subpageIndex+1} / ${p.subpageCount}` : '';
  $('preview-prev').disabled = !p || state.previewIndex <= 0;
  $('preview-next').disabled = !p || state.previewIndex >= state.preview.length-1;
}
function confirmReplace() {
  return !state.dirty || confirm('There are unsaved changes in the editor. Discard them and open this bulletin?');
}

$('reader-mode').addEventListener('click',() => switchMode('reader'));
$('editor-mode').addEventListener('click',() => switchMode('editor'));
$('grid-mode').addEventListener('click',() => { state.format = 'grid'; try { localStorage.setItem('aftertext:format:v1', 'grid'); } catch { } renderReader(); });
$('text-mode').addEventListener('click',() => { state.format = 'text'; try { localStorage.setItem('aftertext:format:v1', 'text'); } catch { } renderReader(); if (shouldMoveFocus({ mode: state.mode, format: state.format, initiated: true })) { focusReadingHeading($('reading-text')); } });
$('previous').addEventListener('click',() => step(-1)); $('next').addEventListener('click',() => step(1));
$('jump-form').addEventListener('submit',event => { event.preventDefault(); go(Number($('page-input').value)); });
document.querySelector('.wordmark').addEventListener('click',event => { event.preventDefault(); switchMode('reader'); go(100, 0, true, false); });
for (const key of ['1','2','3','4','5','6','7','8','9','clear','0','back']) {
  const button = el('button',key === 'clear' ? 'Clear' : key === 'back' ? '⌫' : key, key.length>1 ? 'utility' : '');
  button.type = 'button'; button.setAttribute('aria-label',key === 'back' ? 'Delete last digit' : key === 'clear' ? 'Clear page digits' : `Digit ${key}`);
  button.addEventListener('click',() => digit(key)); $('keypad').append(button);
}
if (matchMedia('(max-width:767px)').matches) $('keypad-details').open = false;
document.addEventListener('keydown',event => {
  if (state.mode !== 'reader' || event.ctrlKey || event.altKey || event.metaKey || event.target.closest('input,textarea,select,[contenteditable=true]')) return;
  if (/^[0-9]$/.test(event.key)) { event.preventDefault(); digit(event.key); }
  else if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
  else if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
  else if (event.key === 'Home') { event.preventDefault(); go(100); }
  else if (event.key === 'Escape') digit('clear');
  else if (event.key === 'Backspace' && state.buffer) { event.preventDefault(); digit('back'); }
});
$('save-local').addEventListener('click',() => {
  const saved = persist(state.bulletin);
  if (saved) state.source = 'Saved on this device';
  renderReader(); notice(saved ? 'Bulletin saved on this device.' : 'The bulletin is open for this session. Device storage is unavailable; export a file to keep it.',!saved);
});
$('load-example').addEventListener('click',() => {
  if (!confirmReplace()) return;
  if (!confirm('Open the fictional example? Your saved bulletin stays on this device until you save or import another. Export any copy you want to keep.')) return;
  state.draft = null; state.dirty = false; setBulletin(clone(sample),'Example bulletin'); switchMode('reader');
});
$('import').addEventListener('click',() => $('file').click());
$('file').addEventListener('change',async event => {
  const file = event.target.files[0]; event.target.value = ''; if (!file) return;
  if (file.size > LIMITS.fileBytes) { notice('File exceeds the 256,000-byte limit. Choose a smaller bulletin.',true); return; }
  try {
    const result = deserializeBulletin(await file.text());
    if (!result.ok) { notice(result.errors.map(e => e.message).slice(0,3).join(' '),true); return; }
    if (!confirmReplace()) return;
    const saved = persist(result.bulletin); state.draft = null; state.dirty = false;
    setBulletin(result.bulletin,saved ? 'Imported file · saved here' : 'Imported file · this session'); switchMode('reader');
    notice(saved ? 'Bulletin opened and saved on this device.' : 'Bulletin opened for this session. Device storage is unavailable; keep the original file.',!saved);
  } catch { notice('The file could not be opened. Choose a valid Aftertext JSON bulletin.',true); }
});
$('export').addEventListener('click',() => {
  try {
    if (state.mode === 'editor') syncDraft();
    const bulletin = state.mode === 'editor' ? state.draft : state.bulletin;
    const data = serializeBulletin(bulletin);
    const url = URL.createObjectURL(new Blob([data],{type:'application/json'}));
    const link = el('a'); link.href = url; link.download = 'aftertext-bulletin.json'; link.hidden = true;
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url),1000);
    notice(`Download requested: aftertext-bulletin.json (${bytes(data).toLocaleString('en')} bytes).`);
  } catch (error) { notice(`Export unavailable. ${error.message}`,true); if (state.mode === 'editor') updatePreview(); }
});
$('editor-form').addEventListener('input',() => { markDirty(); clearTimeout(previewTimer); previewTimer = setTimeout(updatePreview,140); });
$('editor-form').addEventListener('submit',event => {
  event.preventDefault(); clearTimeout(previewTimer); syncDraft();
  const result = validateBulletin(state.draft); showErrors(result.ok ? [] : result.errors);
  if (!result.ok) { notice('The bulletin has not been saved. Fix the fields marked below.',true); $('editor-form').querySelector('[aria-invalid=true]')?.focus(); return; }
  try {
    compileBulletin(result.bulletin); const saved = persist(result.bulletin);
    setBulletin(result.bulletin,saved ? 'Saved on this device' : 'Edited bulletin · this session');
    state.draft = clone(state.bulletin); state.dirty = !saved; populateEditor();
    notice(saved ? 'Bulletin saved. Open Read bulletin to browse it.' : 'Changes are open for this session. Device storage is unavailable; export a file to keep them.',!saved);
  } catch (error) { notice(error.message,true); }
});
$('add-article').addEventListener('click',() => {
  syncDraft(); if (state.draft.articles.length >= LIMITS.articles) return;
  let page = 101; const used = new Set(state.draft.articles.map(a => a.page)); while (used.has(page)) page++;
  state.draft.articles.push({page,category:'Community',title:'',body:''}); state.selected = state.draft.articles.length-1; state.previewIndex = 0;
  markDirty(); populateEditor(); $('article-title').focus();
});
$('delete-article').addEventListener('click',() => {
  if (!confirm('Remove this notice from the draft? Save the bulletin to keep that change.')) return;
  syncDraft(); state.draft.articles.splice(state.selected,1); state.selected = Math.max(0,state.selected-1); state.previewIndex = 0; markDirty(); populateEditor();
});
$('discard-draft').addEventListener('click',() => {
  if (state.dirty && !confirm('Discard unsaved editor changes?')) return;
  state.draft = clone(state.bulletin); state.selected = 0; state.dirty = false; state.previewIndex = 0; populateEditor(); notice('Editor restored to the current bulletin.');
});
$('preview-prev').addEventListener('click',() => { state.previewIndex--; renderPreview(); });
$('preview-next').addEventListener('click',() => { state.previewIndex++; renderPreview(); });
window.addEventListener('beforeunload',event => { if (state.dirty) { event.preventDefault(); event.returnValue = ''; } });

try {
  const stored = localStorage.getItem(STORAGE);
  if (stored) {
    const parsed = deserializeBulletin(stored);
    if (parsed.ok) { state.bulletin = parsed.bulletin; state.source = 'Saved on this device'; }
    else notice('The saved file could not be read. The example is open; the saved file has not been replaced.',true);
  }
} catch { notice('Device storage is unavailable. You can read, edit and export a file for this session.',true); }
try {
  const saved = localStorage.getItem('aftertext:format:v1');
  if (saved === 'grid' || saved === 'text') state.format = saved;
} catch { }
setBulletin(state.bulletin,state.source);
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then(() => navigator.serviceWorker.ready).then(() => {
    $('offline-status').textContent = 'App available offline on this device';
  }).catch(() => { $('offline-status').textContent = 'Offline app cache unavailable. Keep an exported bulletin file.'; });
} else $('offline-status').textContent = 'This browser does not support offline app caching.';
