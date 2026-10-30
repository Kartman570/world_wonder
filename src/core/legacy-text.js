import { LEGACY_TEXT } from './legacy-text-data.js';

// Read legacy display text without changing seeds, identifiers, inventory or world geometry.
const legacyLetters = /[\u0400-\u04ff]/;
const wordBoundary = /[\s.,!?;:()\[\]{}«»—–/]/;
const transliteration = [
  'a',
  'b',
  'v',
  'g',
  'd',
  'e',
  'zh',
  'z',
  'i',
  'y',
  'k',
  'l',
  'm',
  'n',
  'o',
  'p',
  'r',
  's',
  't',
  'u',
  'f',
  'kh',
  'ts',
  'ch',
  'sh',
  'shch',
  '',
  'y',
  '',
  'e',
  'yu',
  'ya',
];
const maxLength = Math.max(...Object.keys(LEGACY_TEXT).map((key) => Number(key.split(':')[0])));

function key(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return `${text.length}:${(hash >>> 0).toString(16)}`;
}

function romanize(char) {
  const code = char.toLowerCase().charCodeAt(0);
  let result = code === 0x451 ? 'yo' : transliteration[code - 0x430];
  if (result === undefined) return char;
  if (char !== char.toLowerCase()) result = result.charAt(0).toUpperCase() + result.slice(1);
  return result;
}

export function englishLegacyText(text) {
  if (!legacyLetters.test(text)) return text;
  const exact = LEGACY_TEXT[key(text)];
  if (exact !== undefined) return exact;
  let result = '';
  for (let start = 0; start < text.length; ) {
    if (!legacyLetters.test(text[start])) {
      result += text[start++];
      continue;
    }
    // Saved event lines combine known phrases with names and counts. Match the longest
    // phrase at a word boundary; unfamiliar generated names retain their pronunciation.
    let hash = 2166136261;
    let endMatch = start;
    let replacement;
    const limit = Math.min(text.length, start + maxLength);
    for (let end = start; end < limit; end++) {
      hash = Math.imul(hash ^ text.charCodeAt(end), 16777619);
      if (end + 1 < text.length && !wordBoundary.test(text[end + 1])) continue;
      const match = LEGACY_TEXT[`${end + 1 - start}:${(hash >>> 0).toString(16)}`];
      if (match !== undefined) {
        replacement = match;
        endMatch = end + 1;
      }
    }
    if (replacement !== undefined) {
      result += replacement;
      start = endMatch;
    } else result += romanize(text[start++]);
  }
  return result;
}

export function migrateSaveText(value) {
  if (!value || typeof value !== 'object') return value;
  for (const [field, child] of Object.entries(value)) {
    // A seed is opaque user input and must remain byte-for-byte identical.
    if (field === 'seed') continue;
    if (typeof child === 'string') value[field] = englishLegacyText(child);
    else if (child && typeof child === 'object') migrateSaveText(child);
  }
  return value;
}
