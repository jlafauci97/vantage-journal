const EPOCH = new Date("2024-01-01").getTime() / 1000;

/**
 * Calculate a ranking score for an article.
 *
 * Factors:
 *  - voteScore (logarithmic, 2x weight)
 *  - viewCount (logarithmic)
 *  - commentCount (0.5x weight)
 *  - repostCount (0.3x weight)
 *  - time decay (recency)
 *  - followBoost (if author is followed by viewer)
 */
export function calculateFeedScore(article: {
  voteScore: number;
  viewCount: number;
  commentCount: number;
  repostCount: number;
  createdAt: Date;
  isFollowed?: boolean;
}): number {
  const votePart = Math.log10(Math.max(Math.abs(article.voteScore), 1)) * 2;
  const viewPart = Math.log10(Math.max(article.viewCount, 1));
  const commentPart = article.commentCount * 0.5;
  const repostPart = article.repostCount * 0.3;
  const seconds = article.createdAt.getTime() / 1000 - EPOCH;
  const timePart = seconds / 45000;
  const followBoost = article.isFollowed ? 5 : 0;

  return votePart + viewPart + commentPart + repostPart + timePart + followBoost;
}

/**
 * SQL expression for trending score used in raw queries.
 * Includes voteScore weighting.
 */
export const FEED_SCORE_SQL = `
  (ln(GREATEST(ABS("Article"."voteScore"), 1)) / ln(10)) * 2
  + (ln(GREATEST("Article"."viewCount", 1)) / ln(10))
  + COALESCE((SELECT COUNT(*) FROM "Comment" WHERE "Comment"."articleId" = "Article"."id"), 0) * 0.5
  + "Article"."repostCount" * 0.3
  + (EXTRACT(EPOCH FROM "Article"."createdAt") - ${EPOCH}) / 45000
`;
