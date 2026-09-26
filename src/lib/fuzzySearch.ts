/**
 * Lightweight, zero-dependency fuzzy search engine tailored for construction calculators.
 * Supports:
 * - Typo tolerance (Levenshtein distance)
 * - Stemming & plural normalization (e.g., pavers -> paver, decking -> deck)
 * - Subsequence & abbreviation matching (e.g., sqft -> square footage, cf -> conduit fill)
 * - Multi-field weighted scoring (name > keywords > category > summary)
 * - Safe HTML match highlighting
 */

export interface SearchableItem {
  slug: string;
  name: string;
  category: string;
  categoryName?: string;
  summary: string;
  keywords?: string[];
}

export interface FuzzySearchResult<T = SearchableItem> {
  item: T;
  score: number;
  highlightedName: string;
  highlightedSummary: string;
  matchedKeyword?: string;
  matchedField: 'name' | 'keyword' | 'category' | 'summary';
}

/**
 * Calculates Levenshtein distance between two strings with early exit optimization.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const al = a.length;
  const bl = b.length;
  let prev = Array.from({ length: bl + 1 }, (_, i) => i);
  let curr = new Array(bl + 1);

  for (let i = 1; i <= al; i++) {
    curr[0] = i;
    const ac = a.charCodeAt(i - 1);
    for (let j = 1; j <= bl; j++) {
      const cost = ac === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,       // insertion
        prev[j] + 1,           // deletion
        prev[j - 1] + cost     // substitution
      );
    }
    const temp = prev;
    prev = curr;
    curr = temp;
  }
  return prev[bl];
}

/**
 * Normalizes text for search comparison (lowercase, trimmed, standard spaces).
 */
export function normalize(text: string): string {
  return (text || '').toLowerCase().trim().replace(/[_\W]+/g, ' ');
}

/**
 * Basic English stemming to unify plurals and common suffixes.
 */
export function stem(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('ies') && word.length > 4) return word.slice(0, -3) + 'y';
  if (word.endsWith('es') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  if (word.endsWith('ing') && word.length > 5) return word.slice(0, -3);
  return word;
}

/**
 * Checks if query `q` is a subsequence of string `target`.
 */
export function isSubsequence(q: string, target: string): boolean {
  if (q.length > target.length || q.length < 2) return false;
  let qi = 0;
  for (let ti = 0; ti < target.length && qi < q.length; ti++) {
    if (target[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

/**
 * Scores a single query word against a candidate target word or phrase.
 * Returns a score between 0 and 100.
 */
export function scoreWord(queryWord: string, targetPhrase: string): { score: number; isFuzzy: boolean } {
  const qw = queryWord.toLowerCase();
  const targetWords = normalize(targetPhrase).split(/\s+/).filter(Boolean);
  const targetNorm = targetWords.join(' ');

  // 1. Exact phrase match
  if (targetNorm === qw) {
    return { score: 100, isFuzzy: false };
  }

  // 2. Starts with query
  if (targetNorm.startsWith(qw)) {
    return { score: 85, isFuzzy: false };
  }

  // 3. Substring match
  if (targetNorm.includes(qw)) {
    return { score: 70, isFuzzy: false };
  }

  // 4. Stem matching (plurals/verb forms)
  const qStem = stem(qw);
  for (const tw of targetWords) {
    if (tw === qw) return { score: 95, isFuzzy: false };
    if (tw.startsWith(qw)) return { score: 80, isFuzzy: false };
    if (stem(tw) === qStem) return { score: 75, isFuzzy: false };
  }

  // 5. Acronym / Subsequence match (e.g. 'sqft' -> 'square footage')
  if (isSubsequence(qw, targetNorm.replace(/\s+/g, ''))) {
    return { score: 60, isFuzzy: false };
  }

  // 6. Typo tolerance (Levenshtein distance against each word in target)
  if (qw.length >= 3) {
    let bestDist = Infinity;
    let bestTargetWord = '';
    for (const tw of targetWords) {
      if (Math.abs(tw.length - qw.length) > 2) continue;
      const d = levenshtein(qw, tw);
      if (d < bestDist) {
        bestDist = d;
        bestTargetWord = tw;
      }
    }

    const maxAllowedDist = qw.length <= 4 ? 1 : qw.length <= 7 ? 2 : 3;
    if (bestDist <= maxAllowedDist) {
      const similarity = 1 - bestDist / Math.max(qw.length, bestTargetWord.length);
      if (similarity >= 0.6) {
        return { score: Math.round(55 * similarity), isFuzzy: true };
      }
    }
  }

  return { score: 0, isFuzzy: false };
}

/**
 * Escapes characters for HTML output.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Wraps matched query tokens in `<mark>` tags in text for highlighting.
 */
export function highlightMatches(text: string, queryTokens: string[]): string {
  if (!text || !queryTokens.length) return escapeHtml(text || '');
  const escapedTokens = queryTokens
    .map(t => t.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .filter(Boolean);
  if (!escapedTokens.length) return escapeHtml(text);

  // Match all tokens case-insensitively
  const regex = new RegExp(`(${escapedTokens.join('|')})`, 'gi');
  const parts = text.split(regex);

  return parts
    .map((part, i) => (i % 2 === 1 ? `<mark>${escapeHtml(part)}</mark>` : escapeHtml(part)))
    .join('');
}

/**
 * Performs fuzzy search on a list of searchable calculator items.
 */
export function fuzzySearch<T extends SearchableItem>(
  query: string,
  items: T[],
  categoryFilter?: string,
  options: { limit?: number; threshold?: number } = {}
): FuzzySearchResult<T>[] {
  const rawQuery = (query || '').trim();
  if (!rawQuery) {
    if (categoryFilter) {
      return items
        .filter(item => item.category === categoryFilter)
        .map(item => ({
          item,
          score: 1,
          highlightedName: escapeHtml(item.name),
          highlightedSummary: escapeHtml(item.summary),
          matchedField: 'category' as const,
        }));
    }
    return [];
  }

  const queryTokens = normalize(rawQuery).split(/\s+/).filter(Boolean);
  if (!queryTokens.length) return [];

  const limit = options.limit ?? 50;
  const threshold = options.threshold ?? 20;
  const results: FuzzySearchResult<T>[] = [];

  for (const item of items) {
    if (categoryFilter && item.category !== categoryFilter) {
      continue;
    }

    let totalScore = 0;
    let allTokensMatched = true;
    let bestMatchedField: 'name' | 'keyword' | 'category' | 'summary' = 'summary';
    let highestFieldScore = 0;
    let matchedKeyword: string | undefined;

    for (const q of queryTokens) {
      // 1. Check item name (weight: 1.0)
      const nameMatch = scoreWord(q, item.name);
      const nameScore = nameMatch.score * 1.0;

      // 2. Check keywords (weight: 0.85)
      let bestKeywordScore = 0;
      let matchedKwName: string | undefined;
      if (item.keywords?.length) {
        for (const kw of item.keywords) {
          const kwMatch = scoreWord(q, kw);
          if (kwMatch.score > bestKeywordScore) {
            bestKeywordScore = kwMatch.score;
            matchedKwName = kw;
          }
        }
      }
      const keywordWeightedScore = bestKeywordScore * 0.85;

      // 3. Check category (weight: 0.5)
      const catMatch = scoreWord(q, item.categoryName || item.category);
      const catScore = catMatch.score * 0.5;

      // 4. Check summary (weight: 0.35)
      const summaryMatch = scoreWord(q, item.summary);
      const summaryScore = summaryMatch.score * 0.35;

      // Best match for this query token
      const bestTokenScore = Math.max(nameScore, keywordWeightedScore, catScore, summaryScore);

      if (bestTokenScore < threshold) {
        allTokensMatched = false;
        break;
      }

      totalScore += bestTokenScore;

      // Track highest field
      if (nameScore > highestFieldScore) {
        highestFieldScore = nameScore;
        bestMatchedField = 'name';
      }
      if (keywordWeightedScore > highestFieldScore) {
        highestFieldScore = keywordWeightedScore;
        bestMatchedField = 'keyword';
        matchedKeyword = matchedKwName;
      }
      if (catScore > highestFieldScore) {
        highestFieldScore = catScore;
        bestMatchedField = 'category';
        matchedKeyword = undefined;
      }
      if (summaryScore > highestFieldScore) {
        highestFieldScore = summaryScore;
        bestMatchedField = 'summary';
        matchedKeyword = undefined;
      }
    }

    if (allTokensMatched && totalScore >= threshold) {
      // Early match bonus (if first word of item name matches query)
      const firstWordOfName = item.name.split(' ')[0].toLowerCase();
      if (firstWordOfName.startsWith(queryTokens[0])) {
        totalScore += 20;
      }

      results.push({
        item,
        score: Math.round(totalScore),
        highlightedName: highlightMatches(item.name, queryTokens),
        highlightedSummary: highlightMatches(item.summary, queryTokens),
        matchedKeyword,
        matchedField: bestMatchedField,
      });
    }
  }

  // Sort descending by score
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, limit);
}
