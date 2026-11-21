import { searchSynonyms } from "./search-vocabulary";

export function normalizeSearch(value: string) {
  return value.replace(/\b10\s*¼/g, "10.25").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[’']/g, "").replace(/\b(?:e[\s-]*)?gift[\s-]*(?:cards?|vouchers?|certificates?)\b|\b(?:(?:grocery|fuel)\s+)?vouchers?\b/g, "gift card")
    .replace(/\bt[.\s]*j[.\s]*maxx\b/g, "tj maxx")
    .replace(/\bc[.\s]*v[.\s]*s\b/g, "cvs")
    .replace(/\boffice[ -]*max\b/g, "officemax").replace(/\bdelta air\s*lines\b/g, "delta airlines")
    .replace(/\bmc[ -]+donalds\b/g, "mcdonalds")
    .replace(/\bbestbuy\b/g, "best buy").replace(/\bhomedepot\b/g, "home depot").replace(/\bgame[\s-]+stop\b/g, "gamestop")
    .replace(/\bhome[\s-]+goods\b/g, "homegoods").replace(/\bnintendo e[\s-]*shop\b/g, "nintendo")
    .replace(/\bpack[\s-]+out\b/g, "packout").replace(/\b10\s+1\s*\/\s*4\b/g, "10.25")
    .replace(/\b(?:ten|10) and (?:a|one) quarter(?=\s*[- ]?\s*inch)/g, "10.25")
    .replace(/\b(penn battle) iv\b/g, "$1 4")
    .replace(/\b(jbl flip) seven\b/g, "$1 7").replace(/\b((?:instax )?mini) twelve\b/g, "$1 12")
    .replace(/\b(dyson\s+)v[\s-]+8\b/g, "$1v8").replace(/\bmodel(?:l)?ing clay\b/g, "modeling clay")
    .replace(/\bair[\s-]+pods\b/g, "airpods")
    .replace(/\blittle[\s-]*green\b/g, "little green").replace(/\blip[\s-]*stick\b/g, "lipstick")
    .replace(/\bblender[\s-]*bottle\b/g, "blenderbottle")
    .replace(/\btool[\s-]*box(?:es)?\b/g, "tool box")
    .replace(/\bcard[\s-]*games?\b/g, "card game")
    .replace(/\bice[\s-]*cream\b/g, "ice cream")
    .replace(/\bair[\s-]*fryer\b/g, "air fryer").replace(/\btake[\s-]*away\b/g, "takeaway")
    .replace(/\bshop[\s-]+vac(?:uum)?\b/g, "shop vacuum")
    .replace(/\b(\d+)\s*(?:x|×|by)\s*(\d+)\b/g, "$1x$2")
    .replace(/\b(\d+)[\s-]*(?:persons?|people)\b/g, "$1 person")
    .replace(/\b(\d+)[\s-]*(?:qt|quarts?)\b/g, "$1 quart")
    .replace(/\b(\d+)[\s-]*(?:(?:fl\.?|fluid)[\s-]+)?(?:oz|ounces?)\b/g, "$1 oz")
    .replace(/\b(\d+)[\s-]*(?:v|volts?)\b/g, "$1v")
    .replace(/\bover[\s-]+ear\b/g, "over ear")
    .replace(/\bwh[\s-]*1000[\s-]*xm[\s-]*5\b/g, "wh1000xm5")
    .replace(/\bo[.\s]+l[.\s]+e[.\s]+d\b/g, "oled")
    .replace(/\b(?:play[\s-]*station|p[.\s-]*s)[.\s-]*(?:5|five)\b/g, "playstation 5")
    .replace(/\bplay[\s-]+station\b/g, "playstation").replace(/\bm\s+70\s+h\b/g, "m70h")
    .replace(/(\d)\s*(?:["”″]|[- ]+inches\b|[- ]+inch\b|[- ]?in\b)(?:\s+class\b)?/g, "$1 inch")
    .replace(/\b(\d+(?:\.\d+)?)\s*(tb|gb|terabytes?|gigabytes?)\b/g, (_, size: string, unit: string) => String(Number(size) * (unit.startsWith("t") ? 1000 : 1)) + " gb")
    .replace(/\bsparkplugs?\b/g, "spark plug").replace(/\bautoparts\b/g, "auto parts")
    .replace(/\bauto\s+zone\b/g, "autozone").replace(/\bpet\s+smart\b/g, "petsmart").replace(/[^a-z0-9]+/g, " ").trim();
}

function wordForm(word: string) {
  if (word === "tvs") return "tv";
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

export const searchWords = (value: string) => normalizeSearch(value).split(/\s+/).filter(Boolean).map(wordForm);
const ignoredWords = new Set(searchWords("a an and for of or the to i im am is me my some please find show looking look want need buy get stuff thing item product"));
export const queryWords = (value: string) => [...new Set(searchWords(value
  .replace(/^\s*(?:can|could|would) you\s+(?:please\s+)?(?:show me|find|get me)\s+(?:(?:any|all)\s+)?(?:available\s+)?(?:deals?\s+for\s+)?/i, "")
  .replace(/^\s*does\s+(.+?)\s+have\s+(?:an?\s+)?/i, "$1 ")
  .replace(/\s+in the (?:list|catalog)\s*$/i, "")).filter(word => !ignoredWords.has(word)
  || (word === "buy" && normalizeSearch(value).includes("best buy"))))];
export const maxCatalogSearchLength = 512;
export const maxCatalogSearchTerms = 32;

export const invalidCatalogSearch = (query: string) => Boolean(query.trim()) && !/[\p{L}\p{N}]/u.test(query);
export const invalidCatalogSearchMessage = "Enter a product or retailer name to search.";

export const catalogSearchLimitMessage = `Shorten your search to ${maxCatalogSearchLength} characters and ${maxCatalogSearchTerms} words or fewer.`;

export function catalogSearchTooLong(query: string) {
  return query.length > maxCatalogSearchLength || queryWords(query).length > maxCatalogSearchTerms;
}
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
  if (query.length > maxCatalogSearchLength) return false;
  const tokens = queryWords(query);
  const document = new Set(searchWords(text));
  return tokens.length > 0 && tokens.length <= maxCatalogSearchTerms && tokens.every(token => searchWordScore(token, document) > 0);
}
