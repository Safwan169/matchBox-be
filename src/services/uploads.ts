import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { open, unlink } from "node:fs/promises";
import path from "node:path";
import multer from "multer";
import { HttpError } from "../middleware/error-handler.js";

export const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
export const UPLOAD_URL_PREFIX = "/uploads";
mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_BYTES = 5 * 1024 * 1024;

// Extension comes from the validated type, never from the user's file name. No SVG (can carry scripts).
const extensions: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export const imageUpload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${extensions[file.mimetype]}`),
  }),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (extensions[file.mimetype]) cb(null, true);
    else cb(new HttpError(400, "Only JPEG, PNG, WebP or GIF images are allowed"));
  },
});

// The declared MIME type comes from the client, so confirm the file's magic bytes too.
async function sniffImageType(filePath: string): Promise<string | null> {
  const handle = await open(filePath, "r");
  try {
    const { buffer } = await handle.read(Buffer.alloc(12), 0, 12, 0);
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
    if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
    if (buffer.toString("ascii", 0, 4) === "GIF8") return "image/gif";
    return null;
  } finally {
    await handle.close();
  }
}

/** Verifies an uploaded file and returns its public URL path. Deletes it if invalid. */
export async function finalizeUpload(file: Express.Multer.File | undefined): Promise<string> {
  if (!file) throw new HttpError(400, "No image file was uploaded (field name: image)");
  const actual = await sniffImageType(file.path);
  if (actual !== file.mimetype) {
    await unlink(file.path).catch(() => {});
    throw new HttpError(400, "The file is not a valid image");
  }
  return `${UPLOAD_URL_PREFIX}/${file.filename}`;
}
