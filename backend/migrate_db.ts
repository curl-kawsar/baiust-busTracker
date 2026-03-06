import { MongoClient } from "mongodb";

// Configuration
const SOURCE_URI = "mongodb://localhost:27017";
const SOURCE_DB_NAME = "bus_tracker";

const TARGET_URI =
  "mongodb+srv://seyam:5ZGm9xyf6twx7hZH@cluster0.c8a7g.mongodb.net/baiust-transport?retryWrites=true&w=majority&appName=Cluster0";
const TARGET_DB_NAME = "baiust-transport"; // Extracted from URI typically, but explicit is better.

async function migrate() {
  console.log("🚀 Starting migration...");

  const sourceClient = new MongoClient(SOURCE_URI);
  const targetClient = new MongoClient(TARGET_URI);

  try {
    await sourceClient.connect();
    console.log("✅ Connected to SOURCE MongoDB");

    await targetClient.connect();
    console.log("✅ Connected to TARGET MongoDB");

    const sourceDb = sourceClient.db(SOURCE_DB_NAME);
    const targetDb = targetClient.db(TARGET_DB_NAME);

    // Get all collections from source
    const collections = await sourceDb.listCollections().toArray();
    console.log(
      `Found ${collections.length} collections to migrate:`,
      collections.map((c) => c.name),
    );

    for (const collectionDef of collections) {
      const collectionName = collectionDef.name;

      // Skip system collections
      if (collectionName.startsWith("system.")) continue;

      console.log(`\n📦 Migrating collection: ${collectionName}...`);

      const sourceCol = sourceDb.collection(collectionName);
      const targetCol = targetDb.collection(collectionName);

      // Fetch all documents
      const documents = await sourceCol.find({}).toArray();

      if (documents.length === 0) {
        console.log(`  - No documents found in ${collectionName}. Skipping.`);
        continue;
      }

      console.log(`  - Found ${documents.length} documents.`);

      // Clear target collection first (Optional, but safer for a clean migration)
      // await targetCol.deleteMany({});

      // Insert in chunks of 500 to stay within limits
      const CHUNK_SIZE = 500;
      for (let i = 0; i < documents.length; i += CHUNK_SIZE) {
        const chunk = documents.slice(i, i + CHUNK_SIZE);
        await targetCol.insertMany(chunk);
        console.log(
          `  - Migrated ${i + chunk.length}/${documents.length} documents...`,
        );
      }

      console.log(`✅ Collection ${collectionName} migrated successfully.`);
    }

    console.log("\n✨ Database migration complete!");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
  } finally {
    await sourceClient.close();
    await targetClient.close();
  }
}

migrate();
