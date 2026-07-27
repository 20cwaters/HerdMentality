/**
 * Answer normalization.
 *
 * Two answers "match" when they normalize to the same key. The goal is to
 * forgive the differences a human would forgive when reading answers aloud
 * around a table — case, spacing, punctuation, "a"/"the", singular vs plural,
 * "3" vs "three" — without merging genuinely different answers.
 *
 * Consistency matters more than linguistic correctness here: both sides of a
 * comparison go through the same rules, so a slightly odd stem ("alway") is
 * harmless as long as it is always produced.
 */

const LEADING_ARTICLE = /^(?:a|an|the)\s+/;

const NUMBER_WORDS: Record<string, string> = {
  zero: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  ten: '10',
  eleven: '11',
  twelve: '12',
  thirteen: '13',
  fourteen: '14',
  fifteen: '15',
  sixteen: '16',
  seventeen: '17',
  eighteen: '18',
  nineteen: '19',
  twenty: '20',
  hundred: '100',
  thousand: '1000',
};

/**
 * Crude but deterministic de-pluralizer. Leaves short words and the common
 * "looks plural but isn't" endings (grass, bus, tennis) alone.
 */
export function depluralize(word: string): string {
  if (word.length <= 3) return word;
  if (/(?:ss|us|is|as|os)$/.test(word)) return word;
  if (/ies$/.test(word) && word.length > 4) return word.slice(0, -3) + 'y';
  if (/(?:ches|shes|xes|zes|ses)$/.test(word)) return word.slice(0, -2);
  if (/s$/.test(word)) return word.slice(0, -1);
  return word;
}

/**
 * Turn a raw answer into its matching key. Returns '' only for input that is
 * blank once trimmed — callers should reject those before scoring.
 */
export function normalizeAnswer(raw: string): string {
  if (!raw) return '';

  let s = raw.normalize('NFD').replace(/\p{M}/gu, ''); // strip combining accents
  s = s.toLowerCase();
  s = s.replace(/[‘’ʼ]/g, "'"); // curly apostrophes -> straight
  s = s.replace(/[^a-z0-9\s'&+-]/g, ' '); // drop punctuation, keep word joiners
  s = s.replace(/'/g, ''); // don't / dont -> dont
  s = s.replace(/[&+]/g, ' and '); // "fish & chips" -> "fish and chips"
  s = s.replace(/[-_]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();

  // Strip a leading article ("the moon" -> "moon"), but never reduce an answer
  // to nothing: "a" on its own stays "a".
  const stripped = s.replace(LEADING_ARTICLE, '');
  if (stripped.length > 0) s = stripped;

  s = s
    .split(' ')
    .map((word) => NUMBER_WORDS[word] ?? word)
    .map(depluralize)
    .join(' ');

  return s.trim();
}

/**
 * The key actually used for grouping. Falls back to a lightly-cleaned version
 * of the raw text when normalization eats everything (e.g. an answer of "?!").
 */
export function matchKey(raw: string): string {
  const normalized = normalizeAnswer(raw);
  if (normalized) return normalized;
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** True when two raw answers count as the same answer. */
export function answersMatch(a: string, b: string): boolean {
  return matchKey(a) === matchKey(b);
}

/** Tidy a raw answer for storage/display without changing its meaning. */
export function cleanAnswerText(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, 60);
}
