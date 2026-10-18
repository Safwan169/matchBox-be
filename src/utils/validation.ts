import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);

/**
 * Bangladeshi mobile number. Accepts "01712345678", "+8801712345678", "8801712345678"
 * with optional spaces/dashes, and normalises to "01712345678".
 */
export const bdPhone = z
  .string({ error: "Phone number is required" })
  .trim()
  .min(1, "Phone number is required")
  .transform((v) => v.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^(?:\+?88)?01[3-9]\d{8}$/, "Enter a valid Bangladeshi mobile number (01XXXXXXXXX)"))
  .transform((v) => v.slice(-11));

/** Same as bdPhone, but an empty string is allowed (meaning "not set"). */
export const optionalBdPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .refine((v) => v === "" || /^(?:\+?88)?01[3-9]\d{8}$/.test(v), "Enter a valid Bangladeshi mobile number (01XXXXXXXXX)")
  .transform((v) => v.slice(-11));

/** Delivery address saved on the customer's account (name/phone live on the account itself). */
export const savedAddressSchema = z.object({
  addressLine: text(200).min(5, "Address is too short"),
  area: text(80).default(""),
  city: text(60).min(2),
  postalCode: text(12).default(""),
});
