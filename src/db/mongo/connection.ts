import mongoose from "mongoose";

export async function connectMongo(uri: string | undefined) {
  if (!uri) throw new Error("MONGO_URI is required when DB_CLIENT=mongo");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log("[db] Connected to MongoDB");
}

export async function disconnectMongo() {
  await mongoose.disconnect();
}

export function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}
