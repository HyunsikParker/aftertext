import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBulletin, serializeBulletin, deserializeBulletin, compileBulletin, wrapText, measureWidth } from '../src/core.js';
import { sample } from '../src/sample.js';

// Initial contract cases were written before reading Kiro's validator output.
// Later regression and mixed-text cases exercise the reviewed implementation.
const make = (body='  A notice.\n\nKeep these spaces.  \n') => ({schemaVersion:1,name:'Example',issuedAt:'2026-11-02T00:00:00+09:00',articles:[{page:899,category:'Local',title:'Hello',body}]});

test('calendar validation rejects normalization and impossible offsets',() => {
  for (const date of ['2026-02-29T00:00:00Z','2026-04-31T12:00:00Z','2024-02-30T00:00:00Z','2026-01-01T24:00:00Z','2026-01-01T12:60:00Z','2026-01-01T12:00:61Z','2026-01-01T12:00:00+25:00','2026-01-01T12:00:00+09:60','2026-11-02']) {
    const b=make(); b.issuedAt=date; assert.equal(validateBulletin(b).ok,false,date);
  }
  for (const date of ['2024-02-29T12:59:59.123Z','2026-11-02T00:00:00-03:30']) {
    const b=make(); b.issuedAt=date; assert.equal(validateBulletin(b).ok,true,date);
  }
});

test('no unsupported object shape or hidden extra key is imported',() => {
  for (const raw of [null,[],true,42,'text',{...make(),extra:1},JSON.parse('{"schemaVersion":1,"name":"Example","issuedAt":"2026-11-02T00:00:00Z","articles":[],"__proto__":{"polluted":true}}')]) {
    assert.equal(validateBulletin(raw).ok,false);
  }
  const b=make(); b.articles[0].other='unexpected'; assert.equal(validateBulletin(b).ok,false);
  assert.equal({}.polluted,undefined);
});

test('whitespace, multibyte graphemes and actual line breaks round-trip',() => {
  const texts=[' \nA  B\n\nC \n','한글 가나다 中文 日本語','Cafe\u0301 e\u0301\u0327 family 👩‍👩‍👧‍👦 flags 🇰🇷 🇬🇧','x'.repeat(6000),'\n'.repeat(100)+'visible','a\u200db   \nend\n'];
  for (const body of texts) {
    const b=make(body); const result=deserializeBulletin(serializeBulletin(b));
    assert.equal(result.ok,true); assert.deepEqual(result.bulletin,b);
    const rows=wrapText(body,40); assert.equal(rows.map(r=>r.text+r.breakAfter).join(''),body);
    const compiled=compileBulletin(b); const pages=compiled.pages.filter(p=>p.pageNumber===899);
    assert.equal(pages.flatMap(p=>p.sourceRows).filter(r=>r.field==='body').map(r=>r.text+r.breakAfter).join(''),body);
    for (const p of compiled.pages) { assert.ok(p.rows.length<=25); for (const row of p.rows) assert.equal(measureWidth(row),40); }
  }
});

test('all sample notices survive compile and source reconstruction',() => {
  const input=JSON.stringify(sample); const compiled=compileBulletin(sample); assert.equal(JSON.stringify(sample),input);
  assert.deepEqual(compiled,compileBulletin(sample));
  for (const a of sample.articles) for (const field of ['title','body']) {
    assert.equal(compiled.pages.filter(p=>p.pageNumber===a.page).flatMap(p=>p.sourceRows).filter(r=>r.field===field).map(r=>r.text+r.breakAfter).join(''),a[field]);
  }
});

test('URL validation checks parsed scheme and credentials without overblocking a path',() => {
  for (const url of ['javascript:alert(1)','data:text/html,hello','https://user:pass@example.com/','//example.com/','https://exam\nple.com/']) { const b=make();b.articles[0].sourceUrl=url;assert.equal(validateBulletin(b).ok,false); }
  const b=make();b.articles[0].sourceUrl='https://example.com/javascript:guide?q=hello';assert.equal(validateBulletin(b).ok,true);
});

test('oversized and malformed imported files produce bounded errors',() => {
  for (const text of ['{','x'.repeat(256001),'"'+ '界'.repeat(100000)+'"']) { const r=deserializeBulletin(text); assert.equal(r.ok,false); assert.ok(r.errors.length>0&&r.errors.length<100); }
});

test('32 notices and long index fields create reachable index subpages',() => {
  const b=make();b.articles=Array.from({length:32},(_,i)=>({page:101+i,category:'Category '.repeat(8),title:'Long title '.repeat(7),body:'The notice.'}));
  const compiled=compileBulletin(b);const index=compiled.pages.filter(p=>p.pageNumber===100);
  assert.ok(index.length>1);assert.equal(new Set(compiled.pages.filter(p=>p.kind==='article').map(p=>p.pageNumber)).size,32);
  const source=index.flatMap(p=>p.sourceRows).map(r=>r.text+r.breakAfter).join('');for(const a of b.articles) assert.ok(source.includes(a.title));
});

test('bounded mixed-text properties preserve source across every wrap width',() => {
  const alphabet=['a',' ','界','한','e\u0301','👩‍👩‍👧‍👦','🇰🇷','\n','©','x\u200d'];
  let seed=90571;
  const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
  for(let n=0;n<150;n++) {
    let text='';for(let i=0,length=1+next()%300;i<length;i++)text+=alphabet[next()%alphabet.length];
    const width=2+next()%39;const rows=wrapText(text,width);
    assert.equal(rows.map(r=>r.text+r.breakAfter).join(''),text);
    for(const row of rows)assert.ok(measureWidth(row.text)<=width);
  }
});

test('blank strings, malformed Unicode and oversized edited bulletin are rejected',() => {
  for(const text of ['   ','\n\n','bad\u0000text','bad\u202etext','bad\ud800text'])assert.equal(validateBulletin(make(text)).ok,false);
  const b=make();b.articles=Array.from({length:32},(_,i)=>({...b.articles[0],page:101+i,body:'界'.repeat(6000)}));
  assert.throws(()=>compileBulletin(b),/exceeds/);
});
