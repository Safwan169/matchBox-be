/** Store-wide contact details shown on the website. Edited by admins. */
export interface StoreSettings {
  phone: string; // "01XXXXXXXXX" or ""
  whatsapp: string; // "01XXXXXXXXX" or ""
  email: string;
  address: string;
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  deliveryTiers: DeliveryTier[];
  updatedAt: Date | null;
}

export interface DeliveryTier {
  minItems: number;
  insideDhakaFee: number;
  message: string;
}

export type StoreSettingsUpdate = Partial<Omit<StoreSettings, "updatedAt">>;

export const DEFAULT_SETTINGS: StoreSettings = {
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  facebookUrl: "",
  instagramUrl: "",
  tiktokUrl: "",
  deliveryTiers: [
    { minItems: 1, insideDhakaFee: 6000, message: "" },
    { minItems: 2, insideDhakaFee: 4000, message: "Add {remaining} more product(s) to get reduced delivery." },
    { minItems: 3, insideDhakaFee: 0, message: "Add {remaining} more product(s) to unlock free delivery." },
  ],
  updatedAt: null,
};
