import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./db/index.js";
import { storage } from "./services/uploads.js";

async function main() {
  try {
    await connectDatabase();
  } catch (err) {
    console.error("[db] Connection failed:", (err as Error).message);
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`[server] MatchBox API running on http://localhost:${env.PORT}`);
    console.log(`[uploads] Images are stored ${storage === "cloudinary" ? "on Cloudinary" : "in backend/uploads (local)"}`);
  });

  const shutdown = async () => {
    server.close();
    await disconnectDatabase();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main();
