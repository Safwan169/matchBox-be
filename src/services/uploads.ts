import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import multer from "multer";
import { env } from "../config/env.js";
import { HttpError } from "../middleware/error-handler.js";

export const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
export const UPLOAD_URL_PREFIX = "/uploads";
mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_BYTES = 4 * 1024 * 1024; // under Vercel's ~4.5 MB request limit (uploads pass through the shop's proxy)
// Originals larger than this are scaled down by Cloudinary before storing.
const MAX_DIMENSION = 2400;

export const storage = env.CLOUDINARY_URL ? "cloudinary" : "local";

if (env.CLOUDINARY_URL) {
  const { username: apiKey, password: apiSecret, hostname: cloudName } = new URL(env.CLOUDINARY_URL);
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: decodeURIComponent(apiSecret), secure: true });
}

// Extension comes from the validated type, never from the user's file name. No SVG (can carry scripts).
const extensions: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

// Kept in memory (max 4 MB) so it can be checked before it's stored anywhere.
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (extensions[file.mimetype]) cb(null, true);
    else cb(new HttpError(400, "Only JPEG, PNG, WebP or GIF images are allowed"));
  },
});

// The declared MIME type comes from the client, so confirm the file's magic bytes too.
function sniffImageType(buffer: Buffer): string | null {
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buffer.toString("ascii", 0, 4) === "GIF8") return "image/gif";
  return null;
}

function uploadToCloudinary(buffer: Buffer): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: env.CLOUDINARY_FOLDER,
          public_id: randomUUID(),
          resource_type: "image",
          overwrite: false,
          transformation: [{ width: MAX_DIMENSION, height: MAX_DIMENSION, crop: "limit" }],
        },
        (error, result) => (error || !result ? reject(error ?? new Error("Empty Cloudinary response")) : resolve(result)),
      )
      .end(buffer);
  });
}

/** Verifies an uploaded image, stores it, and returns its public URL (Cloudinary) or path (local). */
export async function finalizeUpload(file: Express.Multer.File | undefined): Promise<string> {
  if (!file) throw new HttpError(400, "No image file was uploaded (field name: image)");
  if (sniffImageType(file.buffer) !== file.mimetype) throw new HttpError(400, "The file is not a valid image");

  if (storage === "cloudinary") {
    try {
      const result = await uploadToCloudinary(file.buffer);
      return result.secure_url;
    } catch (err) {
      console.error("Cloudinary upload failed:", err);
      throw new HttpError(502, "The image could not be uploaded. Please try again.");
    }
  }

  const filename = `${randomUUID()}${extensions[file.mimetype]}`;
  await writeFile(path.join(UPLOAD_DIR, filename), file.buffer);
  return `${UPLOAD_URL_PREFIX}/${filename}`;
}
