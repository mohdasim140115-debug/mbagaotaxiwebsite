// Local MongoDB for development/tests (downloads a mongod binary once). Usage: node scripts/dev-mongo.mjs
import { MongoMemoryServer } from "mongodb-memory-server";

const server = await MongoMemoryServer.create({ instance: { port: 27018, dbPath: ".local/mongo-data", storageEngine: "wiredTiger" } });
console.log("MongoDB ready:", server.getUri());
process.on("SIGINT", async () => { await server.stop(); process.exit(0); });
setInterval(() => {}, 1 << 30);
