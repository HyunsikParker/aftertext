import { validateBulletin, serializeBulletin } from './validate.js';
export { LIMITS, validateBulletin, serializeBulletin, deserializeBulletin } from './validate.js';

const segmenter = new Intl.Segmenter('en', { granularity:'grapheme' });
const invisible = /[\p{Mark}\u200b\u200c\u200d\ufe00-\ufe0f]/u;
const emoji = /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u;

// A declared cell-width approximation, not a font shaping engine. Original text
// remains separate from padding; the reading view does not use these widths.
function wide(code) {
  return (code >= 0x1100 && code <= 0x115f) || code === 0x2329 || code === 0x232a ||
    (code >= 0x2e80 && code <= 0xa4cf && code !== 0x303f) ||
    (code >= 0xac00 && code <= 0xd7a3) || (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe10 && code <= 0xfe19) || (code >= 0xfe30 && code <= 0xfe6f) ||
    (code >= 0xff01 && code <= 0xff60) || (code >= 0xffe0 && code <= 0xffe6) ||
    (code >= 0x20000 && code <= 0x3fffd);
}
function clusterWidth(cluster) {
  if (emoji.test(cluster) || cluster.includes('\ufe0f') || cluster.includes('\u20e3')) return 2;
  let width = 0;
  for (const char of cluster) {
    if (invisible.test(char) || char === '\n') continue;
    width = Math.max(width, wide(char.codePointAt(0)) ? 2 : 1);
  }
  return width;
}
export function measureWidth(text) {
  let width = 0;
  for (const part of segmenter.segment(text)) width += clusterWidth(part.segment);
  return width;
}
export function wrapText(text, cols = 40) {
  if (typeof text !== 'string' || !Number.isInteger(cols) || cols < 2) throw new Error('Wrapping needs text and an integer width of at least two columns.');
  const rows = [];
  const paragraphs = text.split('\n');
  paragraphs.forEach((paragraph, paragraphIndex) => {
    const clusters = Array.from(segmenter.segment(paragraph), p => ({ text:p.segment, width:clusterWidth(p.segment) }));
    if (!clusters.length) rows.push({ text:'', breakAfter:'' });
    let start = 0;
    while (start < clusters.length) {
      let end = start, width = 0, boundary = -1;
      while (end < clusters.length && width + clusters[end].width <= cols) {
        width += clusters[end].width;
        if (/^\s+$/u.test(clusters[end].text)) boundary = end + 1;
        end++;
      }
      if (end === start) throw new Error('A text cluster is wider than this page. Use the reading view.');
      if (end < clusters.length && boundary > start) end = boundary;
      rows.push({ text:clusters.slice(start,end).map(c => c.text).join(''), breakAfter:'' });
      start = end;
    }
    if (paragraphIndex < paragraphs.length-1) rows[rows.length-1].breakAfter = '\n';
  });
  return rows;
}
function source(text, field) { return wrapText(text).map(row => ({...row,field})); }
function paginate(records, metadata) {
  const pages = [];
  const subpageCount = Math.max(1,Math.ceil(records.length / 25));
  for (let subpageIndex=0; subpageIndex<subpageCount; subpageIndex++) {
    const sourceRows = records.slice(subpageIndex*25,subpageIndex*25+25);
    const rows = sourceRows.map(row => row.text + ' '.repeat(40-measureWidth(row.text)));
    pages.push({...metadata,subpageIndex,subpageCount,rows,sourceRows});
  }
  return pages;
}
export function compileBulletin(raw) {
  const result = validateBulletin(raw);
  if (!result.ok) throw new Error(result.errors[0]?.message || 'The bulletin is not valid.');
  const bulletin = result.bulletin;
  serializeBulletin(bulletin);
  const articles = [...bulletin.articles].sort((a,b) => a.page-b.page);
  const indexText = 'BULLETIN INDEX\n'+bulletin.name+'\n\n'+articles.map(a => `${a.page}  ${a.category}\n     ${a.title}`).join('\n\n');
  const pages = paginate(source(indexText,'index'),{pageNumber:100,kind:'index',title:'Index',category:'Contents',article:null});
  for (const article of articles) {
    const records = [...source(article.title,'title'),{text:'',breakAfter:'',field:'separator'},...source(article.body,'body')];
    pages.push(...paginate(records,{pageNumber:article.page,kind:'article',title:article.title,category:article.category,article}));
  }
  return {bulletin,articles,pages};
}
