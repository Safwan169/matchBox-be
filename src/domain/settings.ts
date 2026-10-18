/** Store-wide contact details shown on the website. Edited by admins. */
export interface StoreSettings {
  phone: string; // "01XXXXXXXXX" or ""
  whatsapp: string; // "01XXXXXXXXX" or ""
  email: string;
  address: string;
  facebookUrl: string;
  updatedAt: Date | null;
}

export type StoreSettingsUpdate = Partial<Omit<StoreSettings, "updatedAt">>;

export const DEFAULT_SETTINGS: StoreSettings = {
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  facebookUrl: "",
  updatedAt: null,
};
