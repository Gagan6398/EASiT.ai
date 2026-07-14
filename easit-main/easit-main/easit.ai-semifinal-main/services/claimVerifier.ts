/**
 * EASIT.ai — Deterministic Claim Verification Service
 * 
 * After the AI generates a response, this service extracts factual claims
 * (dates, numbers, names, statistics) and cross-checks them against the
 * pre-fetched source data from factSources.ts.
 * 
 * This is NOT the AI checking itself — it's deterministic code-level verification.
 */

import type { FactSource } from './factSources.ts';

export interface ClaimVerification {
  claim: string;
  verified: boolean;
  matchedSource?: string;
  matchedText?: string;
}

export interface VerificationReport {
  totalClaims: number;
  verifiedClaims: number;
  unverifiedClaims: number;
  verificationRate: number; // 0-100 percentage
  claims: ClaimVerification[];
  adjustedConfidence: number; // 0-100
}

// ─── Claim Extraction ───

/**
 * Extracts verifiable factual claims from AI-generated text.
 * Focuses on: numbers, dates, proper nouns, statistics, percentages.
 */
export function extractClaims(text: string): string[] {
  const claims: string[] = [];
  const sentences = text.split(/[.!?]\s+/).filter(s => s.trim().length > 10);

  for (const sentence of sentences) {
    const trimmed = sentence.trim();

    // Skip markdown headers, code blocks, meta-commentary
    if (trimmed.startsWith('#') || trimmed.startsWith('```') || trimmed.startsWith('>')) continue;
    if (trimmed.startsWith('**Confidence') || trimmed.includes('UNVERIFIED')) continue;

    // Contains a number (year, statistic, quantity, percentage)
    const hasNumber = /\b\d{2,}\b/.test(trimmed);
    // Contains a percentage
    const hasPercentage = /\d+(\.\d+)?%/.test(trimmed);
    // Contains what looks like a proper noun (capitalized word mid-sentence)
    const hasProperNoun = /\s[A-Z][a-z]{2,}/.test(trimmed);
    // Contains a date pattern
    const hasDate = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{4}\b/i.test(trimmed)
      || /\b\d{4}\b/.test(trimmed);

    if (hasNumber || hasPercentage || hasProperNoun || hasDate) {
      // Clean up markdown formatting
      const cleaned = trimmed
        .replace(/\*\*/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .trim();

      if (cleaned.length > 15 && cleaned.length < 500) {
        claims.push(cleaned);
      }
    }
  }

  // Deduplicate similar claims
  const unique: string[] = [];
  for (const claim of claims) {
    const isDuplicate = unique.some(existing =>
      existing.toLowerCase().includes(claim.toLowerCase().slice(0, 30)) ||
      claim.toLowerCase().includes(existing.toLowerCase().slice(0, 30))
    );
    if (!isDuplicate) unique.push(claim);
  }

  return unique.slice(0, 15); // Cap at 15 claims to check
}

// ─── Claim Verification ───

/**
 * Verifies a single claim against the pre-fetched source data.
 * Uses fuzzy string matching — checks if key terms from the claim
 * appear in any of the source texts.
 */
function verifySingleClaim(claim: string, sources: FactSource[]): ClaimVerification {
  const claimLower = claim.toLowerCase();

  // Extract key terms: numbers, proper nouns, important words
  const numbers = claimLower.match(/\b\d[\d,.]*\b/g) || [];
  const words = claimLower
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3)
    .filter(w => !['this', 'that', 'with', 'from', 'have', 'been', 'also', 'more', 'than', 'which', 'their', 'about', 'would', 'could', 'should', 'there', 'where', 'what', 'when', 'were', 'they', 'some', 'into', 'over', 'such', 'only', 'very', 'most', 'many'].includes(w));

  for (const source of sources) {
    const sourceLower = source.summary.toLowerCase();

    // Check if numbers from the claim appear in the source
    let numberMatches = 0;
    for (const num of numbers) {
      if (sourceLower.includes(num)) numberMatches++;
    }

    // Check if significant words from the claim appear in the source
    let wordMatches = 0;
    for (const word of words) {
      if (sourceLower.includes(word)) wordMatches++;
    }

    // Verification threshold: at least 30% of key terms must match,
    // OR at least one number matches along with 2+ words
    const totalTerms = numbers.length + words.length;
    const totalMatches = numberMatches + wordMatches;
    const matchRate = totalTerms > 0 ? totalMatches / totalTerms : 0;

    if (matchRate >= 0.3 || (numberMatches >= 1 && wordMatches >= 2)) {
      return {
        claim,
        verified: true,
        matchedSource: `${source.source}: ${source.title}`,
        matchedText: source.summary.slice(0, 200),
      };
    }
  }

  return { claim, verified: false };
}

// ─── Full Verification Pipeline ───

/**
 * Runs the complete verification pipeline on a generated response.
 * Returns a structured report with verified/unverified claims.
 */
export function verifyResponse(
  responseText: string,
  sources: FactSource[]
): VerificationReport {
  const claims = extractClaims(responseText);

  if (claims.length === 0 || sources.length === 0) {
    return {
      totalClaims: 0,
      verifiedClaims: 0,
      unverifiedClaims: 0,
      verificationRate: sources.length > 0 ? 100 : 0, // No claims = nothing to fail
      claims: [],
      adjustedConfidence: sources.length > 0 ? 75 : 50,
    };
  }

  const verifiedClaims: ClaimVerification[] = claims.map(claim =>
    verifySingleClaim(claim, sources)
  );

  const verified = verifiedClaims.filter(c => c.verified).length;
  const unverified = verifiedClaims.filter(c => !c.verified).length;
  const verificationRate = Math.round((verified / claims.length) * 100);

  // Adjusted confidence: starts at 85 for search-grounded, modified by verification rate
  let adjustedConfidence = 60;
  if (sources.length > 0) adjustedConfidence += 15; // Bonus for having reference data
  adjustedConfidence += Math.round(verificationRate * 0.25); // Up to +25 from verification
  adjustedConfidence = Math.min(99, Math.max(10, adjustedConfidence));

  return {
    totalClaims: claims.length,
    verifiedClaims: verified,
    unverifiedClaims: unverified,
    verificationRate,
    claims: verifiedClaims,
    adjustedConfidence,
  };
}
