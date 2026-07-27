import { describe, expect, it } from 'vitest';
import { answersMatch, depluralize, matchKey, normalizeAnswer } from '../shared/normalize';

describe('normalizeAnswer', () => {
  it('ignores case and surrounding whitespace', () => {
    expect(normalizeAnswer('  Apple ')).toBe('apple');
    expect(answersMatch('APPLE', 'apple')).toBe(true);
  });

  it('collapses internal whitespace', () => {
    expect(normalizeAnswer('ice    cream')).toBe('ice cream');
    expect(answersMatch('ice cream', 'ice  cream')).toBe(true);
  });

  it('drops punctuation and apostrophes', () => {
    expect(answersMatch("don't!", 'dont')).toBe(true);
    expect(answersMatch('fish & chips', 'fish and chips')).toBe(true);
    expect(answersMatch('salt-and-vinegar', 'salt and vinegar')).toBe(true);
  });

  it('strips accents', () => {
    expect(answersMatch('café', 'cafe')).toBe(true);
  });

  it('strips a leading article', () => {
    expect(normalizeAnswer('The Moon')).toBe('moon');
    expect(answersMatch('a dog', 'dog')).toBe(true);
    expect(answersMatch('an apple', 'apple')).toBe(true);
  });

  it('never reduces an answer to nothing', () => {
    expect(normalizeAnswer('the')).toBe('the');
    expect(normalizeAnswer('a')).toBe('a');
  });

  it('matches number words to digits', () => {
    expect(answersMatch('two', '2')).toBe(true);
    expect(answersMatch('Two Dogs', '2 dog')).toBe(true);
  });

  it('treats singular and plural as the same answer', () => {
    expect(answersMatch('dogs', 'dog')).toBe(true);
    expect(answersMatch('puppies', 'puppy')).toBe(true);
    expect(answersMatch('boxes', 'box')).toBe(true);
    expect(answersMatch('glasses', 'glass')).toBe(true);
  });

  it('leaves words that only look plural alone', () => {
    expect(depluralize('grass')).toBe('grass');
    expect(depluralize('bus')).toBe('bus');
    expect(depluralize('gas')).toBe('gas');
    expect(depluralize('cow')).toBe('cow');
  });

  it('keeps genuinely different answers apart', () => {
    expect(answersMatch('cat', 'cats and dogs')).toBe(false);
    expect(answersMatch('red', 'dark red')).toBe(false);
    expect(answersMatch('apple', 'apple pie')).toBe(false);
  });

  it('falls back to the raw text when normalization empties the answer', () => {
    expect(matchKey('?!')).toBe('?!');
    expect(answersMatch('???', '???')).toBe(true);
  });
});
