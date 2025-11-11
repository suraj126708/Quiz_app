// MongoDB connection setup
require("dotenv").config();

const { MongoClient } = require("mongodb");

// Get URI from environment or use default
const uri = process.env.MONGODB_URI;

// Extract database name from URI if present, otherwise use env or default
const extractDbNameFromUri = (uriString) => {
  try {
    // Extract database name from MongoDB URI
    // Format: mongodb+srv://user:pass@host/dbname?options
    // or: mongodb://user:pass@host:port/dbname?options
    const match = uriString.match(/\/([^?\/]+)(\?|$)/);
    if (match && match[1] && match[1] !== "") {
      return match[1];
    }
  } catch (e) {
    // If URI parsing fails, continue with default
    console.log("Could not extract DB name from URI:", e.message);
  }
  return null;
};

const dbNameFromUri = extractDbNameFromUri(uri);
const dbName = process.env.DB_NAME || dbNameFromUri || "rohanDB";

let client = null;
let db = null;
let isConnecting = false;

// Connect to MongoDB
const connectDB = async (retryCount = 0) => {
  // Prevent multiple simultaneous connection attempts
  if (isConnecting && client) {
    return db;
  }

  try {
    if (!client || !db) {
      isConnecting = true;

      // Check if URI is for MongoDB Atlas (contains mongodb.net)
      const isAtlas =
        uri.includes("mongodb.net") || uri.includes("mongodb+srv://");

      // Connection options
      // Note: For mongodb+srv, TLS is automatically enabled, so we don't need to set it explicitly
      const options = {
        // Connection pool options
        maxPoolSize: 10,
        minPoolSize: 1,
        // Timeout options (increased for better reliability)
        serverSelectionTimeoutMS: isAtlas ? 30000 : 5000, // 30 seconds for Atlas
        socketTimeoutMS: 45000,
        connectTimeoutMS: 30000,
        // Retry options
        retryWrites: true,
        retryReads: true,
        // For mongodb+srv, don't set tls explicitly as it's handled automatically
        // Only set tls for regular mongodb:// connections to Atlas
        ...(isAtlas && !uri.includes("mongodb+srv://") ? { tls: true } : {}),
      };

      console.log(
        `🔌 Attempting to connect to MongoDB... (Attempt ${retryCount + 1})`
      );
      console.log(`📍 Database: ${dbName}`);
      console.log(`🌐 URI: ${uri.replace(/:[^:@]+@/, ":****@")}`); // Hide password in logs

      client = new MongoClient(uri, options);
      await client.connect();

      // Test the connection
      await client.db("admin").command({ ping: 1 });

      db = client.db(dbName);
      isConnecting = false;

      console.log("✅ Connected to MongoDB successfully");
      console.log(`📊 Using database: ${dbName}`);
      return db;
    }
    return db;
  } catch (error) {
    isConnecting = false;
    console.error("❌ MongoDB connection error:", error.message);

    // Clean up failed connection
    if (client) {
      try {
        await client.close();
      } catch (closeError) {
        // Ignore close errors
      }
      client = null;
      db = null;
    }

    // Provide helpful error messages
    if (
      error.message.includes("SSL") ||
      error.message.includes("TLS") ||
      error.message.includes("alert")
    ) {
      console.error("\n💡 SSL/TLS Connection Error - Possible Solutions:");
      console.error("   1. ✅ Check MongoDB Atlas Network Access:");
      console.error("      - Go to MongoDB Atlas → Network Access");
      console.error("      - Add your IP address (or 0.0.0.0/0 for testing)");
      console.error("   2. ✅ Verify your connection string is correct");
      console.error(
        "   3. ✅ Ensure your MongoDB Atlas cluster is running (not paused)"
      );
      console.error("   4. ✅ Check if your username/password are correct");
      console.error(
        "   5. ✅ Verify the cluster name matches in the connection string"
      );
      console.error("\n🔗 Get connection string from:");
      console.error(
        "   MongoDB Atlas → Clusters → Connect → Connect your application"
      );
    } else if (error.message.includes("authentication")) {
      console.error("\n💡 Authentication Error:");
      console.error(
        "   - Check your username and password in the connection string"
      );
      console.error(
        "   - Verify the database user has the correct permissions"
      );
    } else if (
      error.message.includes("ReplicaSetNoPrimary") ||
      error.message.includes("No primary")
    ) {
      console.error("\n💡 Cluster Connection Error:");
      console.error("   - Your MongoDB Atlas cluster might be paused");
      console.error(
        "   - Go to MongoDB Atlas → Clusters and check if it's running"
      );
      console.error("   - Wait a few minutes after resuming a paused cluster");
    }

    // Don't throw error on first few retries - let server start
    if (retryCount < 1) {
      console.log(
        "⚠️  Server will continue running. Database will reconnect on first request."
      );
      return null;
    }

    throw error;
  }
};

// Get database instance with auto-reconnect
const getDB = async () => {
  if (!db) {
    console.log("🔄 Database not connected, attempting to reconnect...");
    try {
      await connectDB(1); // Retry connection
      if (!db) {
        throw new Error(
          "Database connection failed. Please check your MongoDB connection."
        );
      }
    } catch (error) {
      throw new Error(`Database not available: ${error.message}`);
    }
  }
  return db;
};

// Get collections with auto-reconnect
const getCollection = async (collectionName) => {
  try {
    const database = await getDB();
    return database.collection(collectionName);
  } catch (error) {
    console.error(
      `❌ Error getting collection ${collectionName}:`,
      error.message
    );
    throw error;
  }
};

// Synchronous version for backward compatibility (will throw if not connected)
const getCollectionSync = (collectionName) => {
  if (!db) {
    throw new Error("Database not initialized. Call connectDB() first.");
  }
  return db.collection(collectionName);
};

module.exports = {
  connectDB,
  getDB,
  getCollection,
  getCollectionSync, // For synchronous usage (requires DB to be connected)
};
