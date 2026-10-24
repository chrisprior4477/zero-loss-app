import { searchSynonyms } from "./search-vocabulary";

export function normalizeSearch(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[’']/g, "").replace(/\bgift\s*cards?\b/g, "gift card")
    .replace(/\bsparkplugs?\b/g, "spark plug").replace(/\bautoparts\b/g, "auto parts")
    .replace(/\bpet\s+smart\b/g, "petsmart").replace(/[^a-z0-9]+/g, " ").trim();
}

function wordForm(word: string) {
  if (word === "tvs") return "tv";
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

export const searchWords = (value: string) => normalizeSearch(value).split(/\s+/).filter(Boolean).map(wordForm);
const ignoredWords = new Set(searchWords("a an and for of or the to i im am is me my some please find show looking look want need buy get stuff thing item product"));
export const queryWords = (value: string) => [...new Set(searchWords(value).filter(word => !ignoredWords.has(word)
  || (word === "buy" && normalizeSearch(value).includes("best buy"))))];
const synonyms = new Map(searchSynonyms.flatMap(group => group.map(term => [wordForm(term), group.map(wordForm)] as const)));

// One edit, including a swapped pair ("atuo") or missing letter ("plgs").
// Known words and amounts stay exact; two short words cannot be fuzzy matches.
function nearWord(left: string, right: string) {
  if (Math.min(left.length, right.length) < 3 || Math.max(left.length, right.length) < 4 || /\d/.test(left + right) || Math.abs(left.length - right.length) > 1) return false;
  let index = 0;
  while (index < Math.min(left.length, right.length) && left[index] === right[index]) index++;
  if (left.length === right.length) return left.slice(index + 1) === right.slice(index + 1)
    || (left[index] === right[index + 1] && left[index + 1] === right[index] && left.slice(index + 2) === right.slice(index + 2));
  return left.length > right.length ? left.slice(index + 1) === right.slice(index) : left.slice(index) === right.slice(index + 1);
}

export function searchWordScore(token: string, document: ReadonlySet<string>, vocabulary?: ReadonlySet<string>) {
  const alternatives = synonyms.get(token) ?? [token];
  if (document.has(token)) return 4;
  if (alternatives.some(word => document.has(word))) return 3;
  // Correct toward a known shopping concept before fuzzy-matching descriptive
  // prose: "atuo" means auto, not a TV's Atmos; "batery" means battery.
  if (!vocabulary?.has(token) && !synonyms.has(token)) {
    const concepts = [...synonyms].filter(([word]) => nearWord(token, word)).map(([, words]) => words);
    const conceptKeys = new Set(concepts.map(words => words[0]));
    if (conceptKeys.size === 1) return concepts[0].some(word => document.has(word)) ? 1 : 0;
  }
  // A complete known word is never expanded into a different brand or topic.
  if (token.length >= 3 && !/\d/.test(token) && !vocabulary?.has(token) && !synonyms.has(token)
    && [...document].some(word => word.startsWith(token))) return 2;
  if (!vocabulary?.has(token) && !synonyms.has(token) && [...document].some(word => nearWord(token, word)
    || (synonyms.get(word) ?? []).some(alias => nearWord(token, alias)))) return 1;
  return 0;
}

export function searchTextMatches(text: string, query: string) {
  if (query.length > 512) return false;
  const tokens = queryWords(query);
  const document = new Set(searchWords(text));
  return tokens.length > 0 && tokens.length <= 32 && tokens.every(token => searchWordScore(token, document) > 0);
}
