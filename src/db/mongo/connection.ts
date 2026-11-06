import mongoose from "mongoose";

export async function connectMongo(uri: string | undefined) {
  if (!uri) throw new Error("MONGO_URI is required when DB_CLIENT=mongo");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  const users = mongoose.connection.db!.collection("users");
  const indexes = await users.listIndexes().toArray();
  for (const index of indexes) {
    if (index.key?.email === 1 && index.unique && !index.partialFilterExpression) {
      await users.dropIndex(index.name);
    }
  }
  await users.createIndex({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: "string" } } });
  console.log("[db] Connected to MongoDB");
}

export async function disconnectMongo() {
  await mongoose.disconnect();
}

export function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}
