import "server-only";
import { Database } from "./orm";
import * as schema from "./schema";

export const db = new Database();
export type DB = Database;
export type Tx = Database;
export { schema };
