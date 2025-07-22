import { MongoClient, Db } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

const uri = process.env.MONGODB_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

// Function to connect to the database and return both db and client
export async function connectToDatabase(databaseName: string) {
  const connectedClient = await clientPromise;
  const db = connectedClient.db(databaseName);
  console.log("connectToDatabase: Connected to database:", db.databaseName); // Log for debugging
  return { db, client: connectedClient };
}

// Function to get just the database instance (for backwards compatibility)
export async function getDb() {
  const { db } = await connectToDatabase("learning_platform");
  return db;
}