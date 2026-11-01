export const LIMITS = {
  fileBytes: 256000,
  articles: 32,
  body: 6000,
  title: 80,
  category: 80,
  name: 100
};

const REQUIRED_BULLETIN_KEYS = ['schemaVersion', 'name', 'issuedAt', 'articles'];
const REQUIRED_ARTICLE_KEYS = ['page', 'category', 'title', 'body'];
const OPTIONAL_ARTICLE_KEYS = ['sourceUrl'];

function hasExactKeys(obj, required, optional = []) {
  const keys = Object.keys(obj);
  const allowed = new Set([...required, ...optional]);
  if (keys.length < required.length || keys.length > required.length + optional.length) return false;
  for (const key of keys) {
    if (!allowed.has(key)) return false;
  }
  for (const key of required) {
    if (!Object.hasOwn(obj, key)) return false;
  }
  return true;
}

function isString(value) {
  return typeof value === 'string';
}

function isInteger(value) {
  return Number.isInteger(value);
}

function isArray(value) {
  return Array.isArray(value);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function codepointLength(str) {
  return [...str].length;
}

function hasControlChars(str, allowLF = false) {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x20 && !(allowLF && code === 0x0A)) return true;
    if (code >= 0x7F && code <= 0x9F) return true;
  }
  return false;
}

function hasBidiControls(str) {
  const bidiChars = [0x061C, 0x200E, 0x200F, 0x202A, 0x202B, 0x202C, 0x202D, 0x202E, 0x2066, 0x2067, 0x2068, 0x2069];
  for (let i = 0; i < str.length; i++) {
    if (bidiChars.includes(str.charCodeAt(i))) return true;
  }
  return false;
}

function hasLoneSurrogates(str) {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 0xD800 && code <= 0xDFFF) {
      if (code >= 0xD800 && code <= 0xDBFF) {
        if (i + 1 >= str.length) return true;
        const next = str.charCodeAt(i + 1);
        if (next < 0xDC00 || next > 0xDFFF) return true;
        i++;
      } else {
        return true;
      }
    }
  }
  return false;
}

function validateString(value, field, maxCodepoints, allowLF = false) {
  const errors = [];
  if (!isString(value)) {
    errors.push({ field, message: 'must be a string' });
    return errors;
  }
  if (value.trim().length === 0) {
    errors.push({ field, message: 'must not be blank' });
  }
  if (codepointLength(value) > maxCodepoints) {
    errors.push({ field, message: `exceeds ${maxCodepoints} codepoints` });
  }
  if (hasControlChars(value, allowLF)) {
    errors.push({ field, message: 'contains invalid control characters' });
  }
  if (hasBidiControls(value)) {
    errors.push({ field, message: 'contains bidi control characters' });
  }
  if (hasLoneSurrogates(value)) {
    errors.push({ field, message: 'contains lone surrogates' });
  }
  return errors;
}

function validateRFC3339(value, field) {
  const errors = [];
  if (!isString(value)) {
    errors.push({ field, message: 'must be a string' });
    return errors;
  }
  const rfc3339 = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
  const match = value.match(rfc3339);
  if (!match) {
    errors.push({ field, message: 'invalid RFC3339 format' });
    return errors;
  }
  const [, year, month, day, hour, min, sec, , tz] = match;
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  const h = parseInt(hour, 10);
  const mn = parseInt(min, 10);
  const s = parseInt(sec, 10);

  if (m < 1 || m > 12) {
    errors.push({ field, message: 'invalid month' });
  }
  if (h > 23) {
    errors.push({ field, message: 'invalid hour' });
  }
  if (mn > 59) {
    errors.push({ field, message: 'invalid minute' });
  }
  if (s > 59) {
    errors.push({ field, message: 'invalid second' });
  }

  const daysInMonth = [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (d < 1 || d > (daysInMonth[m - 1] || 31)) {
    errors.push({ field, message: 'invalid day' });
  }

  if (tz !== 'Z') {
    const tzMatch = tz.match(/^([+-])(\d{2}):(\d{2})$/);
    if (tzMatch) {
      const tzh = parseInt(tzMatch[2], 10);
      const tzm = parseInt(tzMatch[3], 10);
      if (tzh > 23 || tzm > 59) {
        errors.push({ field, message: 'invalid timezone offset' });
      }
    }
  }
  return errors;
}

function validateSourceUrl(value, field) {
  const errors = [];
  if (!isString(value) || !value.length) return [{field,message:'Source link must be a nonempty URL.'}];
  if (value.length > 2048) return [{field,message:'Source link must be at most 2048 characters.'}];
  if (/\s/u.test(value) || hasControlChars(value) || hasBidiControls(value) || hasLoneSurrogates(value)) return [{field,message:'Source link contains unsupported whitespace or characters.'}];
  try {
    const url = new URL(value);
    if (!['http:','https:'].includes(url.protocol) || !/^https?:\/\//i.test(value)) errors.push({field,message:'Source link must use http or https.'});
    if (url.username || url.password) errors.push({field,message:'Source link must not contain login credentials.'});
    if (!url.hostname) errors.push({field,message:'Source link must include a hostname.'});
  } catch {
    errors.push({field,message:'Source link must be a valid absolute URL.'});
  }
  return errors;
}

export function validateBulletin(raw) {
  const errors = [];

  if (!isPlainObject(raw)) {
    return { ok: false, errors: [{ field: 'bulletin', message: 'must be a plain object' }] };
  }

  if (!hasExactKeys(raw, REQUIRED_BULLETIN_KEYS)) {
    errors.push({ field: 'bulletin', message: 'has invalid keys' });
    return { ok: false, errors };
  }

  if (raw.schemaVersion !== 1) {
    errors.push({ field: 'schemaVersion', message: 'must be 1' });
  }

  errors.push(...validateString(raw.name, 'name', LIMITS.name));
  errors.push(...validateRFC3339(raw.issuedAt, 'issuedAt'));

  if (!isArray(raw.articles)) {
    errors.push({ field: 'articles', message: 'must be an array' });
    return { ok: false, errors };
  }

  if (raw.articles.length < 1 || raw.articles.length > LIMITS.articles) {
    errors.push({ field: 'articles', message: `must contain 1 to ${LIMITS.articles} articles` });
  }

  const seenPages = new Set();

  for (let i = 0; i < raw.articles.length && errors.length < 64; i++) {
    const article = raw.articles[i];
    const prefix = `articles[${i}]`;

    if (!isPlainObject(article)) {
      errors.push({ field: prefix, message: 'must be a plain object' });
      continue;
    }

    if (!hasExactKeys(article, REQUIRED_ARTICLE_KEYS, OPTIONAL_ARTICLE_KEYS)) {
      errors.push({ field: prefix, message: 'has invalid keys' });
      continue;
    }

    if (!isInteger(article.page)) {
      errors.push({ field: `${prefix}.page`, message: 'must be an integer' });
    } else if (article.page < 101 || article.page > 899) {
      errors.push({ field: `${prefix}.page`, message: 'must be between 101 and 899' });
    } else if (seenPages.has(article.page)) {
      errors.push({ field: `${prefix}.page`, message: 'must be unique' });
    } else {
      seenPages.add(article.page);
    }

    errors.push(...validateString(article.category, `${prefix}.category`, LIMITS.category));
    errors.push(...validateString(article.title, `${prefix}.title`, LIMITS.title));
    errors.push(...validateString(article.body, `${prefix}.body`, LIMITS.body, true));

    if ('sourceUrl' in article) {
      errors.push(...validateSourceUrl(article.sourceUrl, `${prefix}.sourceUrl`));
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors: errors.slice(0, 64) };
  }

  const bulletin = {
    schemaVersion: raw.schemaVersion,
    name: raw.name,
    issuedAt: raw.issuedAt,
    articles: raw.articles.map(a => {
      const article = {
        page: a.page,
        category: a.category,
        title: a.title,
        body: a.body
      };
      if ('sourceUrl' in a) {
        article.sourceUrl = a.sourceUrl;
      }
      return article;
    })
  };

  return { ok: true, bulletin };
}

export function serializeBulletin(raw) {
  const result = validateBulletin(raw);
  if (!result.ok) {
    throw new Error(`Invalid bulletin: ${result.errors[0].field} ${result.errors[0].message}`);
  }
  const json = JSON.stringify(result.bulletin);
  const utf8Bytes = new TextEncoder().encode(json).length;
  if (utf8Bytes > LIMITS.fileBytes) {
    throw new Error(`Serialized bulletin exceeds ${LIMITS.fileBytes} bytes`);
  }
  return json;
}

export function deserializeBulletin(text) {
  if (!isString(text)) {
    return { ok: false, errors: [{ field: 'input', message: 'must be a string' }] };
  }
  const utf8Bytes = new TextEncoder().encode(text).length;
  if (utf8Bytes > LIMITS.fileBytes) {
    return { ok: false, errors: [{ field: 'input', message: `exceeds ${LIMITS.fileBytes} bytes` }] };
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, errors: [{ field: 'input', message: 'invalid JSON' }] };
  }
  return validateBulletin(parsed);
}
