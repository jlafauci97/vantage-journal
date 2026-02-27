const EPOCH = new Date("2024-01-01").getTime() / 1000;

export function calculateTrendingScore(
  viewCount: number,
  createdAt: Date
): number {
  const order = Math.log10(Math.max(Math.abs(viewCount), 1));
  const seconds = createdAt.getTime() / 1000 - EPOCH;
  return order + seconds / 45000;
}

export const TRENDING_SQL = `
  (ln(GREATEST("Article"."viewCount", 1)) / ln(10))
  + (EXTRACT(EPOCH FROM "Article"."createdAt") - ${EPOCH}) / 45000
`;
