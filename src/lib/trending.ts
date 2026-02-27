const EPOCH = new Date("2024-01-01").getTime() / 1000;

export function calculateTrendingScore(
  viewCount: number,
  voteScore: number,
  createdAt: Date
): number {
  const viewOrder = Math.log10(Math.max(Math.abs(viewCount), 1));
  const voteOrder = Math.log10(Math.max(Math.abs(voteScore), 1)) * 2;
  const seconds = createdAt.getTime() / 1000 - EPOCH;
  return viewOrder + voteOrder + seconds / 45000;
}

export const TRENDING_SQL = `
  (ln(GREATEST("Article"."viewCount", 1)) / ln(10))
  + (ln(GREATEST(ABS("Article"."voteScore"), 1)) / ln(10)) * 2
  + (EXTRACT(EPOCH FROM "Article"."createdAt") - ${EPOCH}) / 45000
`;
