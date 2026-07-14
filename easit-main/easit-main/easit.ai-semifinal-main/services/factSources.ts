/**
 * EASIT.ai — Multi-Source Fact Retrieval Service
 * 
 * Fetches authoritative facts from free APIs BEFORE the AI generates a response.
 * This pre-loaded context makes it much harder for the model to hallucinate.
 * 
 * Sources:
 * - Wikipedia REST API (no key required)
 * - Wikidata API (no key required)
 * - DuckDuckGo Instant Answer API (no key required)
 */

export interface FactSource {
  source: 'wikipedia' | 'wikidata' | 'duckduckgo';
  title: string;
  summary: string;
  url?: string;
}

export interface GroundingContext {
  facts: FactSource[];
  rawContext: string; // Combined text block for prompt injection
  fetchTimeMs: number;
}

// ─── Wikipedia REST API ───

async function fetchWikipedia(query: string): Promise<FactSource[]> {
  try {
    // Step 1: Search for relevant articles
    const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query.replace(/\s+/g, '_'))}`;
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': 'EasitAI/1.0 (https://easitai-semifinal-main.vercel.app; contact@easit.ai)' }
    });

    if (res.ok) {
      const data = await res.json();
      if (data.extract && data.extract.length > 20) {
        return [{
          source: 'wikipedia',
          title: data.title || query,
          summary: data.extract.slice(0, 1500),
          url: data.content_urls?.desktop?.page
        }];
      }
    }

    // Step 2: Fallback — search Wikipedia for the query
    const searchFallbackUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=3&format=json&origin=*`;
    const searchRes = await fetch(searchFallbackUrl);
    if (!searchRes.ok) return [];

    const searchData = await searchRes.json();
    const results: FactSource[] = [];

    for (const item of (searchData.query?.search || []).slice(0, 2)) {
      // Fetch summary for each search result
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(item.title.replace(/\s+/g, '_'))}`;
      try {
        const summaryRes = await fetch(summaryUrl, {
          headers: { 'User-Agent': 'EasitAI/1.0' }
        });
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          if (summaryData.extract) {
            results.push({
              source: 'wikipedia',
              title: summaryData.title,
              summary: summaryData.extract.slice(0, 800),
              url: summaryData.content_urls?.desktop?.page
            });
          }
        }
      } catch { /* skip failed summary fetches */ }
    }

    return results;
  } catch (err) {
    console.warn('[FactSources] Wikipedia fetch failed:', err);
    return [];
  }
}

// ─── Wikidata API ───

async function fetchWikidata(query: string): Promise<FactSource[]> {
  try {
    const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=en&limit=2&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    const results: FactSource[] = [];

    for (const entity of (data.search || []).slice(0, 2)) {
      if (entity.description) {
        results.push({
          source: 'wikidata',
          title: entity.label || query,
          summary: `${entity.label}: ${entity.description}`,
          url: entity.concepturi
        });
      }
    }

    return results;
  } catch (err) {
    console.warn('[FactSources] Wikidata fetch failed:', err);
    return [];
  }
}

// ─── DuckDuckGo Instant Answer API ───

async function fetchDuckDuckGo(query: string): Promise<FactSource[]> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    const results: FactSource[] = [];

    // Abstract (main result)
    if (data.Abstract && data.Abstract.length > 20) {
      results.push({
        source: 'duckduckgo',
        title: data.Heading || query,
        summary: data.Abstract.slice(0, 1000),
        url: data.AbstractURL
      });
    }

    // Answer (instant answer)
    if (data.Answer && typeof data.Answer === 'string' && data.Answer.length > 5) {
      results.push({
        source: 'duckduckgo',
        title: `Answer: ${query}`,
        summary: data.Answer,
        url: data.AbstractURL
      });
    }

    // Related topics (as additional context)
    if (data.RelatedTopics) {
      for (const topic of data.RelatedTopics.slice(0, 2)) {
        if (topic.Text && topic.Text.length > 20) {
          results.push({
            source: 'duckduckgo',
            title: topic.Text.split(' - ')[0] || 'Related',
            summary: topic.Text.slice(0, 500),
            url: topic.FirstURL
          });
        }
      }
    }

    return results;
  } catch (err) {
    console.warn('[FactSources] DuckDuckGo fetch failed:', err);
    return [];
  }
}

// ─── Main Orchestrator ───

/**
 * Gathers grounding context from all free sources in parallel.
 * Returns a combined context block ready for prompt injection.
 */
export async function gatherGroundingContext(query: string): Promise<GroundingContext> {
  const startTime = performance.now();

  // Fetch from all sources in parallel (race condition-safe)
  const [wikiResults, wikidataResults, ddgResults] = await Promise.allSettled([
    fetchWikipedia(query),
    fetchWikidata(query),
    fetchDuckDuckGo(query),
  ]);

  const facts: FactSource[] = [
    ...(wikiResults.status === 'fulfilled' ? wikiResults.value : []),
    ...(wikidataResults.status === 'fulfilled' ? wikidataResults.value : []),
    ...(ddgResults.status === 'fulfilled' ? ddgResults.value : []),
  ];

  // Build combined context block for prompt injection
  let rawContext = '';
  if (facts.length > 0) {
    rawContext = `\n\n## PRE-VERIFIED REFERENCE DATA (from authoritative sources)\nThe following facts were retrieved from Wikipedia, Wikidata, and DuckDuckGo BEFORE you generated this response. Use them as ground truth. If your response contradicts this data, you MUST correct yourself.\n\n`;
    for (const fact of facts) {
      rawContext += `### [${fact.source.toUpperCase()}] ${fact.title}\n${fact.summary}\n${fact.url ? `Source: ${fact.url}` : ''}\n\n`;
    }
    rawContext += `---\nIMPORTANT: Prioritize the above reference data over your training data for any conflicting claims.\n`;
  }

  return {
    facts,
    rawContext,
    fetchTimeMs: Math.round(performance.now() - startTime),
  };
}
