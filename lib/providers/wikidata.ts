import "server-only";
import { fetchJson } from "./http";

/**
 * Optional Wikidata enrichment: stable identifiers and alternate names only.
 * Never authoritative for lead-role classification or box office.
 */
export async function wikidataIdsForTmdbPerson(tmdbPersonId: number) {
  const query = `SELECT ?item ?imdb ?label WHERE { ?item wdt:P4985 "${tmdbPersonId}". OPTIONAL { ?item wdt:P345 ?imdb. } OPTIONAL { ?item rdfs:label ?label FILTER(LANG(?label) IN ("en","te")) } } LIMIT 10`;
  const data = await fetchJson<{ results: { bindings: { item: { value: string }; imdb?: { value: string }; label?: { value: string } }[] } }>(
    `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`,
    { provider: "wikidata", headers: { "user-agent": "TollywoodAnalysis/0.1 (private beta)" } },
  );
  const b = data.results.bindings;
  return {
    wikidataId: b[0]?.item.value.split("/").pop() ?? null,
    imdbNameId: b.find((x) => x.imdb)?.imdb?.value ?? null,
    labels: [...new Set(b.map((x) => x.label?.value).filter(Boolean))] as string[],
  };
}
