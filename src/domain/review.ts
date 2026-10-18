export type ReviewStatus = "published" | "hidden";

export interface Review {
  id: string;
  productId: string;
  userId: string;
  authorName: string; // display name snapshot, e.g. "Rahim U."
  rating: number; // 1–5
  comment: string;
  status: ReviewStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface RatingSummary {
  average: number; // 0 when there are no reviews; one decimal place
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

/** "Rahim Uddin" → "Rahim U." (keeps reviewers' full names private). */
export function reviewerName(fullName: string) {
  const [first, ...rest] = fullName.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}
