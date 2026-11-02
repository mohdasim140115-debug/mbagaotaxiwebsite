/*
 * MongoDB-backed query engine exposing the small slice of the drizzle builder API this app uses:
 * select/from/leftJoin/innerJoin/where/orderBy/limit/offset/groupBy, insert(...).values().onDuplicateKeyUpdate,
 * update().set().where, delete().where, transaction. Numeric auto-increment ids come from a counters collection
 * so every id-based URL and foreign key keeps working. Foreign-key actions (cascade / set null / restrict) are
 * applied in delete(). Transactions run sequentially (no rollback).
 */
import dns from "node:dns/promises";
import { MongoClient, type Collection, type Db, type Filter } from "mongodb";
import { Agg, Col, Order, SqlExpr, TABLE, allTables, tableMeta, type Cond, type RowOf, type Shape, type Table } from "./kit";

declare global {
  var __mbaMongo: { client: MongoClient; ready: Promise<Db> } | undefined;
}

const COLLATION = { locale: "en", strength: 2 } as const;
const name = (t: Table) => tableMeta(t).name;
const colsOf = (t: Table) => Object.values(tableMeta(t).cols) as Col[];

export function mongoDbName(url: string) {
  const path = new URL(url.replace(/^mongodb(\+srv)?:/, "http:")).pathname.replace(/^\//, "");
  return process.env.MONGODB_DB || path || "mba_travels";
}

async function setup(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (url.startsWith("mongodb+srv:")) {
    // Some networks refuse SRV lookups; fall back to public resolvers so mongodb+srv URLs still work.
    const host = new URL(url.replace("mongodb+srv:", "http:")).hostname;
    try {
      await dns.resolveSrv("_mongodb._tcp." + host);
    } catch {
      dns.setServers(["8.8.8.8", "1.1.1.1"]);
    }
  }
  const client = new MongoClient(url, { maxPoolSize: Number(process.env.DB_POOL_SIZE ?? 10), retryWrites: true });
  await client.connect();
  const db = client.db(mongoDbName(url));
  globalThis.__mbaMongo = { client, ready: Promise.resolve(db) };
  return db;
}

let readyDb: Promise<Db> | null = null;
export function getDb(): Promise<Db> {
  if (globalThis.__mbaMongo) return globalThis.__mbaMongo.ready;
  return (readyDb ??= setup());
}
export async function closeDb() {
  await globalThis.__mbaMongo?.client.close();
  globalThis.__mbaMongo = undefined;
  readyDb = null;
}

/** Creates every collection (with case-insensitive collation, like MySQL) and its indexes. Idempotent. */
export async function ensureSchema() {
  const db = await getDb();
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
  for (const t of allTables) {
    const n = name(t);
    if (!existing.has(n)) await db.createCollection(n, { collation: COLLATION });
    const col = db.collection(n);
    for (const ix of tableMeta(t).indexes) {
      const keys = Object.fromEntries(ix.cols.map((c) => [c.key, 1]));
      await col.createIndex(keys, { unique: ix.unique, collation: COLLATION });
    }
    for (const c of colsOf(t)) if (c.isPk && !tableMeta(t).indexes.some((i) => i.cols.length === 1 && i.cols[0] === c) && !c.isAuto) await col.createIndex({ [c.key]: 1 }, { unique: true, collation: COLLATION });
  }
  if (!existing.has("_counters")) await db.createCollection("_counters");
}

async function coll(t: Table): Promise<Collection> {
  return (await getDb()).collection(name(t));
}

async function nextId(t: Table): Promise<number> {
  const db = await getDb();
  const r = await db.collection<{ _id: string; seq: number }>("_counters").findOneAndUpdate({ _id: name(t) }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
  return r!.seq;
}

/* ------------------------------------------------------------------ conditions → Mongo / JS */

const colsIn = (c: Cond, out: Col[] = []): Col[] => {
  if ("items" in c) c.items.forEach((i) => colsIn(i, out));
  else {
    out.push(c.col);
    if (c.t === "cmp" && c.val instanceof Col) out.push(c.val);
  }
  return out;
};
const pushable = (c: Cond, t: Table) => colsIn(c).every((x) => x.table === t) && noColVal(c);
function noColVal(c: Cond): boolean {
  if (c.t === "and" || c.t === "or") return c.items.every(noColVal);
  return !(c.t === "cmp" && c.val instanceof Col);
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const likeRe = (pat: string) => new RegExp("^" + pat.split("%").map((p) => p.split("_").map(esc).join(".")).join(".*") + "$", "is");

export function toMongo(c: Cond): Filter<any> {
  switch (c.t) {
    case "and":
      return c.items.length ? { $and: c.items.map(toMongo) } : {};
    case "or":
      return { $or: c.items.map(toMongo) };
    case "in":
      return { [c.col.key]: { $in: c.vals } };
    case "like":
      return { [c.col.key]: { $regex: likeRe(c.pat) } };
    case "null":
      return c.not ? { [c.col.key]: { $ne: null } } : { [c.col.key]: null };
    case "cmp": {
      const k = c.col.key;
      if (c.op === "eq") return { [k]: c.val };
      return { [k]: { [`$${c.op}`]: c.val } };
    }
  }
}

type Ctx = Map<Table, Record<string, any> | null>;
const norm = (v: any) => (typeof v === "string" ? v.toLowerCase() : v instanceof Date ? v.getTime() : v);
function val(ctx: Ctx, c: Col) {
  const d = ctx.get(c.table);
  const v = d ? d[c.key] : null;
  return v === undefined ? null : v;
}
export function test(c: Cond, ctx: Ctx): boolean {
  switch (c.t) {
    case "and":
      return c.items.every((i) => test(i, ctx));
    case "or":
      return c.items.some((i) => test(i, ctx));
    case "in":
      return c.vals.map(norm).includes(norm(val(ctx, c.col)));
    case "like":
      return likeRe(c.pat).test(String(val(ctx, c.col) ?? ""));
    case "null":
      return (val(ctx, c.col) === null) !== c.not;
    case "cmp": {
      const a = norm(val(ctx, c.col));
      const b = norm(c.val instanceof Col ? val(ctx, c.val) : c.val);
      switch (c.op) {
        case "eq": return a === b;
        case "ne": return a !== b;
        case "gt": return a > b;
        case "gte": return a >= b;
        case "lt": return a < b;
        case "lte": return a <= b;
      }
    }
  }
}

function conjuncts(c: Cond | undefined): Cond[] {
  if (!c) return [];
  return c.t === "and" ? c.items.flatMap((i) => conjuncts(i)) : [c];
}

const strip = (t: Table, d: Record<string, any> | null) => {
  if (!d) return null;
  const out: Record<string, any> = {};
  for (const c of colsOf(t)) out[c.key] = d[c.key] === undefined ? null : d[c.key];
  return out;
};

/* ------------------------------------------------------------------ select */

type Join = { table: Table; on: Cond; left: boolean };

class SelectQ implements PromiseLike<any[]> {
  private main!: Table;
  private joins: Join[] = [];
  private cond?: Cond;
  private orders: Order[] = [];
  private lim?: number;
  private off = 0;
  private group?: Col;
  constructor(private fields?: Record<string, any>) {}
  from(t: Table) {
    this.main = t;
    return this;
  }
  leftJoin(t: Table, on?: Cond) {
    this.joins.push({ table: t, on: on ?? { t: "and", items: [] }, left: true });
    return this;
  }
  innerJoin(t: Table, on?: Cond) {
    this.joins.push({ table: t, on: on ?? { t: "and", items: [] }, left: false });
    return this;
  }
  where(c?: Cond) {
    this.cond = c;
    return this;
  }
  orderBy(...o: (Order | Col | undefined)[]) {
    this.orders = (o.filter(Boolean) as (Order | Col)[]).map((x) => (x instanceof Col ? new Order(x, 1) : x));
    return this;
  }
  limit(n: number) {
    this.lim = n;
    return this;
  }
  offset(n: number) {
    this.off = n;
    return this;
  }
  groupBy(c: Col) {
    this.group = c;
    return this;
  }
  then<A = any[], B = never>(ok?: ((v: any[]) => A | PromiseLike<A>) | null, err?: ((e: unknown) => B | PromiseLike<B>) | null): Promise<A | B> {
    return this.run().then(ok, err);
  }

  private aggs() {
    return Object.entries(this.fields ?? {}).filter(([, v]) => v instanceof Agg || v instanceof SqlExpr);
  }
  private aggOf(v: Agg | SqlExpr): Agg {
    if (v instanceof Agg) return v;
    const txt = v.text.toUpperCase();
    if (txt === "COUNT(*)") return new Agg("count");
    if (txt.startsWith("SUM(")) {
      const field = txt.slice(4, -1).toLowerCase().replace(/_(\w)/g, (_, x) => x.toUpperCase());
      const col = colsOf(this.main).find((c) => c.key.toLowerCase() === field.toLowerCase());
      if (col) return new Agg("sum", col);
    }
    throw new Error(`Unsupported SQL expression in select: ${v.text}`);
  }

  private async run(): Promise<any[]> {
    const main = this.main;
    const parts = conjuncts(this.cond);
    const push = parts.filter((p) => pushable(p, main));
    const residual = parts.filter((p) => !push.includes(p));
    const filter: Filter<any> = push.length ? { $and: push.map(toMongo) } : {};
    const c = await coll(main);
    const aggs = this.aggs();
    const simple = !this.joins.length && !residual.length;

    // Pure aggregate without grouping
    if (aggs.length && !this.group && simple) {
      const row: Record<string, any> = {};
      for (const [k, v] of Object.entries(this.fields!)) {
        if (v instanceof Agg || v instanceof SqlExpr) {
          const a = this.aggOf(v);
          if (a.fn === "count") row[k] = await c.countDocuments(filter, { collation: COLLATION });
          else {
            const r = await c.aggregate([{ $match: filter }, { $group: { _id: null, s: { $sum: { $cond: [`$${a.col!.key}`, 1, 0] } } } }], { collation: COLLATION }).toArray();
            row[k] = r[0]?.s ?? null;
          }
        }
      }
      return [row];
    }

    const leftOnly = this.joins.every((j) => j.left);
    const canPage = leftOnly && !residual.length && !this.group && !aggs.length && this.orders.every((o) => o.col.table === main);
    let cur = c.find(filter, { collation: COLLATION });
    if (this.orders.length && this.orders.every((o) => o.col.table === main)) cur = cur.sort(Object.fromEntries(this.orders.map((o) => [o.col.key, o.dir])) as any);
    if (canPage) {
      if (this.off) cur = cur.skip(this.off);
      if (this.lim !== undefined) cur = cur.limit(this.lim);
    }
    let rows: Ctx[] = (await cur.toArray()).map((d) => new Map<Table, any>([[main, strip(main, d)]]));

    for (const j of this.joins) rows = await this.applyJoin(rows, j);
    if (residual.length) rows = rows.filter((r) => residual.every((p) => test(p, r)));

    const otherOrders = this.orders.some((o) => o.col.table !== main);
    if (otherOrders) {
      rows.sort((a, b) => {
        for (const o of this.orders) {
          const x = norm(val(a, o.col)), y = norm(val(b, o.col));
          if (x === y) continue;
          return (x === null ? -1 : y === null ? 1 : x < y ? -1 : 1) * o.dir;
        }
        return 0;
      });
    }

    let out: Record<string, any>[];
    if (this.group) {
      const groups = new Map<unknown, Ctx[]>();
      for (const r of rows) {
        const k = norm(val(r, this.group));
        groups.set(k, [...(groups.get(k) ?? []), r]);
      }
      out = [...groups.values()].map((g) => this.shape(g[0]!, g));
    } else if (aggs.length) out = [this.shape(rows[0] ?? new Map(), rows)];
    else out = rows.map((r) => this.shape(r));

    if (!canPage) {
      if (this.off) out = out.slice(this.off);
      if (this.lim !== undefined) out = out.slice(0, this.lim);
    }
    return out;
  }

  private shape(r: Ctx, group?: Ctx[]): Record<string, any> {
    if (!this.fields) {
      if (!this.joins.length) return r.get(this.main) ?? {};
      return Object.fromEntries([...r].map(([t, d]) => [name(t), d]));
    }
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(this.fields)) {
      if (v instanceof Col) out[k] = val(r, v);
      else if (v instanceof Agg || v instanceof SqlExpr) {
        const a = this.aggOf(v);
        const g = group ?? [r];
        out[k] = a.fn === "count" ? g.length : g.reduce((s, x) => s + (Number(val(x, a.col!)) || 0), 0);
      } else out[k] = r.get(v as Table) ?? null; // whole table
    }
    return out;
  }

  private async applyJoin(rows: Ctx[], j: Join): Promise<Ctx[]> {
    const jc = await coll(j.table);
    // Fast path: on = eq(joined.col, other.col) (optionally ANDed with literal conditions on the joined table)
    const items = conjuncts(j.on);
    const lits = items.filter((i) => colsIn(i).every((x) => x.table === j.table) && noColVal(i));
    const link = items.find((i) => i.t === "cmp" && i.op === "eq" && i.val instanceof Col && (i.col.table === j.table) !== ((i.val as Col).table === j.table));
    let docs: Record<string, any>[];
    const base: Filter<any> = lits.length ? { $and: lits.map(toMongo) } : {};
    if (link && link.t === "cmp") {
      const jcol = link.col.table === j.table ? link.col : (link.val as Col);
      const other = link.col.table === j.table ? (link.val as Col) : link.col;
      const keys = [...new Set(rows.map((r) => val(r, other)).filter((v) => v !== null))];
      docs = keys.length ? await jc.find({ $and: [base, { [jcol.key]: { $in: keys } }] }, { collation: COLLATION }).toArray() : [];
    } else docs = await jc.find(base, { collation: COLLATION }).toArray();
    const stripped = docs.map((d) => strip(j.table, d)!);
    const out: Ctx[] = [];
    for (const r of rows) {
      const matches = stripped.filter((d) => {
        const ctx: Ctx = new Map(r);
        ctx.set(j.table, d);
        return test(j.on, ctx);
      });
      if (matches.length) for (const d of matches) out.push(new Map([...r, [j.table, d]]));
      else if (j.left) out.push(new Map([...r, [j.table, null]]));
    }
    return out;
  }
}

/* ------------------------------------------------------------------ writes */

const dupError = (e: any) => {
  const err: any = new Error(`Duplicate entry: ${e?.message ?? ""}`);
  err.code = "ER_DUP_ENTRY";
  err.errno = 1062;
  err.keyPattern = e?.keyPattern;
  err.cause = e;
  return err;
};

async function prepare(t: Table, row: Record<string, any>) {
  const doc: Record<string, any> = {};
  for (const c of colsOf(t)) {
    let v = row[c.key];
    if (v === undefined) {
      if (c.isAuto) v = await nextId(t);
      else if (c.nowDefault) v = new Date();
      else if (c.hasDefault) v = structuredCloneSafe(c.defaultValue);
      else v = null;
    }
    if (v === null && c.isNotNull && !c.isAuto && !c.hasDefault && !c.nowDefault) throw new Error(`Column ${name(t)}.${c.key} cannot be null`);
    doc[c.key] = v;
  }
  return doc;
}
const structuredCloneSafe = (v: unknown) => (v && typeof v === "object" ? JSON.parse(JSON.stringify(v)) : v);

class InsertQ implements PromiseLike<any[]> {
  private rows: Record<string, any>[] = [];
  private upsert?: Record<string, any>;
  constructor(private t: Table) {}
  values(v: Record<string, any> | Record<string, any>[]) {
    this.rows = Array.isArray(v) ? v : [v];
    return this;
  }
  onDuplicateKeyUpdate(cfg: { set: Record<string, any> }) {
    this.upsert = cfg.set;
    return this;
  }
  then<A = any[], B = never>(ok?: ((v: any[]) => A | PromiseLike<A>) | null, err?: ((e: unknown) => B | PromiseLike<B>) | null): Promise<A | B> {
    return this.run().then(ok, err);
  }
  private async run() {
    const c = await coll(this.t);
    let insertId = 0;
    let affected = 0;
    for (const r of this.rows) {
      const doc = await prepare(this.t, r);
      try {
        await c.insertOne({ ...doc });
        affected++;
        const idc = colsOf(this.t).find((x) => x.isAuto);
        insertId = idc ? doc[idc.key] : 0;
      } catch (e: any) {
        if (e?.code !== 11000) throw e;
        if (!this.upsert) throw dupError(e);
        const keyFields = Object.keys(e.keyPattern ?? {});
        const match = Object.fromEntries(keyFields.map((k) => [k, doc[k]]));
        const set = { ...this.upsert };
        const upd = colsOf(this.t).find((x) => x.updateNow);
        if (upd) set[upd.key] = new Date();
        await c.updateOne(match, { $set: set }, { collation: COLLATION });
        affected += 2;
      }
    }
    return [{ insertId, affectedRows: affected }];
  }
}

async function matchingDocs(t: Table, cond?: Cond): Promise<Record<string, any>[]> {
  const parts = conjuncts(cond);
  const push = parts.filter((p) => pushable(p, t));
  const rest = parts.filter((p) => !push.includes(p));
  const c = await coll(t);
  const docs = await c.find(push.length ? { $and: push.map(toMongo) } : {}, { collation: COLLATION }).toArray();
  return rest.length ? docs.filter((d) => rest.every((p) => test(p, new Map([[t, strip(t, d)]])))) : docs;
}

class UpdateQ implements PromiseLike<any[]> {
  private values: Record<string, any> = {};
  private cond?: Cond;
  constructor(private t: Table) {}
  set(v: Record<string, any>) {
    this.values = v;
    return this;
  }
  where(c?: Cond) {
    this.cond = c;
    return this;
  }
  then<A = any[], B = never>(ok?: ((v: any[]) => A | PromiseLike<A>) | null, err?: ((e: unknown) => B | PromiseLike<B>) | null): Promise<A | B> {
    return this.run().then(ok, err);
  }
  private async run() {
    const c = await coll(this.t);
    const docs = await matchingDocs(this.t, this.cond);
    if (!docs.length) return [{ affectedRows: 0 }];
    const $set: Record<string, any> = {};
    const $inc: Record<string, number> = {};
    const coalesce: string[] = [];
    for (const [k, v] of Object.entries(this.values)) {
      if (v === undefined) continue;
      if (v instanceof SqlExpr) {
        const txt = v.text;
        if (/^\?\s*\+\s*1$/.test(txt) && v.params[0] instanceof Col) $inc[(v.params[0] as Col).key] = 1;
        else if (/^COALESCE\(/i.test(txt)) coalesce.push(k);
        else throw new Error(`Unsupported SQL expression in update: ${txt}`);
      } else $set[k] = v;
    }
    const upd = colsOf(this.t).find((x) => x.updateNow);
    if (upd && !(upd.key in $set)) $set[upd.key] = new Date();
    const ids = docs.map((d) => d._id);
    const op: Record<string, any> = {};
    if (Object.keys($set).length) op.$set = $set;
    if (Object.keys($inc).length) op.$inc = $inc;
    if (Object.keys(op).length) await c.updateMany({ _id: { $in: ids } }, op);
    for (const k of coalesce) await c.updateMany({ _id: { $in: ids }, [k]: null }, { $set: { [k]: new Date() } });
    return [{ affectedRows: docs.length }];
  }
}

async function removeDocs(t: Table, docs: Record<string, any>[]): Promise<number> {
  if (!docs.length) return 0;
  // Apply foreign-key actions declared on other tables.
  for (const child of allTables) {
    for (const cc of colsOf(child)) {
      if (!cc.ref) continue;
      const parentCol = cc.ref.col();
      if (parentCol.table !== t) continue;
      const values = docs.map((d) => d[parentCol.key]).filter((v) => v !== null && v !== undefined);
      if (!values.length) continue;
      const cd = await coll(child);
      const filter = { [cc.key]: { $in: values } };
      const action = cc.ref.onDelete ?? "restrict";
      if (action === "cascade") await removeDocs(child, await cd.find(filter, { collation: COLLATION }).toArray());
      else if (action === "set null") await cd.updateMany(filter, { $set: { [cc.key]: null } });
      else if (await cd.countDocuments(filter, { collation: COLLATION })) {
        const e: any = new Error(`Cannot delete ${name(t)}: still referenced by ${name(child)}.${cc.key}`);
        e.code = "ER_ROW_IS_REFERENCED_2";
        e.errno = 1451;
        throw e;
      }
    }
  }
  const c = await coll(t);
  const r = await c.deleteMany({ _id: { $in: docs.map((d) => d._id) } });
  return r.deletedCount;
}

class DeleteQ implements PromiseLike<any[]> {
  private cond?: Cond;
  constructor(private t: Table) {}
  where(c?: Cond) {
    this.cond = c;
    return this;
  }
  then<A = any[], B = never>(ok?: ((v: any[]) => A | PromiseLike<A>) | null, err?: ((e: unknown) => B | PromiseLike<B>) | null): Promise<A | B> {
    return this.run().then(ok, err);
  }
  private async run() {
    const n = await removeDocs(this.t, await matchingDocs(this.t, this.cond));
    return [{ affectedRows: n }];
  }
}

export interface Query<R> extends PromiseLike<R[]> {
  leftJoin(t: Table, on?: Cond): Query<R>;
  innerJoin(t: Table, on?: Cond): Query<R>;
  where(c?: Cond): Query<R>;
  orderBy(...o: (Order | Col | undefined)[]): Query<R>;
  limit(n: number): Query<R>;
  offset(n: number): Query<R>;
  groupBy(c: Col): Query<R>;
}
interface FromAll {
  from<T extends Table>(t: T): Query<RowOf<T>>;
}
interface FromFields<F> {
  from(t: Table): Query<Shape<F>>;
}

export class Database {
  select(): FromAll;
  select<F extends Record<string, any>>(fields: F): FromFields<F>;
  select(fields?: Record<string, any>): any {
    return new SelectQ(fields);
  }
  insert(t: Table) {
    return new InsertQ(t);
  }
  update(t: Table) {
    return new UpdateQ(t);
  }
  delete(t: Table) {
    return new DeleteQ(t);
  }
  /** Runs sequentially against the same database (no rollback). */
  async transaction<T>(fn: (tx: Database) => Promise<T>): Promise<T> {
    return fn(this);
  }
}

export { TABLE };
