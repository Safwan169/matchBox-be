export interface FacebookPost {
  id: string;
  facebookPostId: string;
  postUrl: string;
  productIds: string[];
  productNames: string[];
  productCount: number;
  message: string;
  createdAt: Date;
}

export type NewFacebookPost = Omit<FacebookPost, "id" | "createdAt" | "productCount">;
