/**
 * MatchO — deterministic Tailor Matching scoring.
 *
 * This module is pure and client-safe: it contains NO data access. The AI
 * Tailor Matching Agent gathers real MatchO rows on the server and passes them
 * here, so the ranking itself is transparent, reproducible and explainable.
 *
 * WEIGHTS (configurable — every component is normalised to 0..1 before it is
 * multiplied by its weight, so the final score is 0..100).
 */
export const MATCH_WEIGHTS = {
  location: 22, // same city / nearby city as the member
  specialization: 20, // specialization / category matches the requested outfit type
  portfolio: 12, // portfolio depth + relevance of portfolio titles
  rating: 18, // average rating quality
  reviewVolume: 6, // how much review evidence exists
  completed: 10, // previously completed transformations on MatchO
  verification: 8, // verified tailor / identity + portfolio verified
  experience: 4, // years of stitching experience recorded on MatchO
} as const;

export const MAX_MATCH_SCORE = Object.values(MATCH_WEIGHTS).reduce((a, b) => a + b, 0);

export type TailorCandidate = {
  tailor_id: string;
  name: string;
  studio: string | null;
  city: string | null;
  specialization: string | null;
  tailor_category?: string | null;
  languages?: string | null;
  experience_years: number | null;
  verified: boolean;
  identity_verified?: boolean;
  portfolio_verified?: boolean;
  avg_rating: number | null;
  review_count: number;
  completed_projects: number;
  portfolio_items: number;
  portfolio_titles: string[];
  portfolio_images?: string[];
};

export type ScoredTailor = TailorCandidate & {
  score: number;
  breakdown: Record<keyof typeof MATCH_WEIGHTS, number>;
  reasons: string[];
};


const norm = (s: string | null | undefined) => (s || "").toLowerCase().trim();

function textMatch(haystack: string, needles: string[]) {
  if (!haystack || !needles.length) return 0;
  const hits = needles.filter((n) => n.length > 2 && haystack.includes(n)).length;
  return Math.min(1, hits / Math.max(1, Math.min(needles.length, 3)));
}

export function scoreTailor(
  t: TailorCandidate,
  ctx: { userCity?: string | null; outfitType?: string | null; keywords?: string[] },
): ScoredTailor {
  const userCity = norm(ctx.userCity);
  const tailorCity = norm(t.city);
  const outfit = norm(ctx.outfitType);
  const keywords = (ctx.keywords || []).map(norm).filter(Boolean);
  const reasons: string[] = [];

  // Location — exact city match is full credit, partial (substring) is half.
  let location = 0;
  if (userCity && tailorCity) {
    if (userCity === tailorCity) {
      location = 1;
      reasons.push(`Based in ${t.city}, the same city as you`);
    } else if (tailorCity.includes(userCity) || userCity.includes(tailorCity)) {
      location = 0.5;
      reasons.push(`Located nearby in ${t.city}`);
    }
  } else if (tailorCity) {
    location = 0.25;
  }

  // Specialization / category vs requested outfit type / style keywords.
  const spec = norm([t.specialization, t.tailor_category].filter(Boolean).join(" "));
  const specLabel = t.specialization || t.tailor_category;
  let specialization = 0;
  if (spec) {
    if (outfit && (spec.includes(outfit) || outfit.includes(spec))) {
      specialization = 1;
      reasons.push(`Specialises in ${specLabel}`);
    } else {
      specialization = textMatch(spec, keywords) * 0.8;
      if (specialization > 0.3) reasons.push(`Specialisation (${specLabel}) fits your style brief`);
    }
  }

  // Portfolio depth (capped at 6 items) plus relevance of the titles.
  const depth = Math.min(1, t.portfolio_items / 6);
  const relevance = textMatch(norm(t.portfolio_titles.join(" ")), [outfit, ...keywords].filter(Boolean));
  const portfolio = Math.min(1, depth * 0.6 + relevance * 0.4);
  if (t.portfolio_items > 0 && portfolio > 0.3) {
    reasons.push(`${t.portfolio_items} portfolio piece${t.portfolio_items === 1 ? "" : "s"} on MatchO`);
  }

  // Rating quality — 3.0 is the neutral floor, 5.0 is full credit.
  let rating = 0;
  if (t.avg_rating !== null) {
    rating = Math.max(0, Math.min(1, (t.avg_rating - 3) / 2));
    if (t.avg_rating >= 4) reasons.push(`Rated ${t.avg_rating}★ across ${t.review_count} review${t.review_count === 1 ? "" : "s"}`);
  }
  const reviewVolume = Math.min(1, t.review_count / 8);

  const completed = Math.min(1, t.completed_projects / 5);
  if (t.completed_projects > 0) {
    reasons.push(`${t.completed_projects} completed transformation${t.completed_projects === 1 ? "" : "s"}`);
  }

  let verification = 0;
  if (t.verified) verification = 1;
  else if (t.identity_verified || t.portfolio_verified) verification = 0.5;
  if (t.verified) reasons.push("Verified tailor on MatchO");

  // Experience — 8+ recorded years is full credit.
  const experience = Math.min(1, Math.max(0, (t.experience_years || 0) / 8));
  if ((t.experience_years || 0) >= 3) {
    reasons.push(`${t.experience_years} years of tailoring experience`);
  }

  if (t.languages) reasons.push(`Speaks ${t.languages}`);

  const breakdown = {
    location: location * MATCH_WEIGHTS.location,
    specialization: specialization * MATCH_WEIGHTS.specialization,
    portfolio: portfolio * MATCH_WEIGHTS.portfolio,
    rating: rating * MATCH_WEIGHTS.rating,
    reviewVolume: reviewVolume * MATCH_WEIGHTS.reviewVolume,
    completed: completed * MATCH_WEIGHTS.completed,
    verification: verification * MATCH_WEIGHTS.verification,
    experience: experience * MATCH_WEIGHTS.experience,
  };


  const score = Math.round(Object.values(breakdown).reduce((a, b) => a + b, 0));
  return { ...t, score, breakdown, reasons };
}

export function rankTailors(
  candidates: TailorCandidate[],
  ctx: { userCity?: string | null; outfitType?: string | null; keywords?: string[] },
  limit = 5,
): ScoredTailor[] {
  return candidates
    .map((c) => scoreTailor(c, ctx))
    .sort((a, b) => b.score - a.score || (b.avg_rating || 0) - (a.avg_rating || 0))
    .slice(0, limit);
}
