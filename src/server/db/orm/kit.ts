/*
 * Schema + condition kit with the same surface as the drizzle-orm pieces this app uses
 * (mysqlTable, column builders, eq/and/or/..., sql), backed by MongoDB (see ./engine.ts).
 * Columns are stored under their TypeScript key (camelCase) in each document.
 */

export type OnDelete = "cascade" | "set null" | "restrict";

export class Col<T = any> {
  declare readonly _t: T;
  table!: Table;
  key!: string;
  kind: string;
  isNotNull = false;
  hasDefault = false;
  defaultValue: unknown = undefined;
  nowDefault = false;
  updateNow = false;
  isAuto = false;
  isPk = false;
  ref: { col: () => Col; onDelete?: OnDelete } | null = null;
  constructor(kind: string) {
    this.kind = kind;
  }
  notNull(): Col<Exclude<T, null>> {
    this.isNotNull = true;
    return this as unknown as Col<Exclude<T, null>>;
  }
  default(v: unknown) {
    this.hasDefault = true;
    // sql`CURRENT_TIMESTAMP` and friends mean "now"
    if (v instanceof SqlExpr) this.nowDefault = true;
    else this.defaultValue = v;
    return this;
  }
  defaultNow() {
    this.nowDefault = true;
    return this;
  }
  onUpdateNow() {
    this.updateNow = true;
    return this;
  }
  autoincrement() {
    this.isAuto = true;
    return this;
  }
  primaryKey(): Col<Exclude<T, null>> {
    this.isPk = true;
    this.isNotNull = true;
    return this as unknown as Col<Exclude<T, null>>;
  }
  references(col: () => Col, cfg?: { onDelete?: OnDelete }) {
    this.ref = { col, onDelete: cfg?.onDelete };
    return this;
  }
  $type<U>(): Col<null extends T ? U | null : U> {
    return this as any;
  }
}

export type AnyMySqlColumn = Col;

const mk = <T>(kind: string) => (_name?: string, _cfg?: unknown) => new Col<T | null>(kind);
export const bigint = mk<number>("bigint");
export const boolean = mk<boolean>("boolean");
export const char = mk<string>("char");
export const datetime = mk<Date>("datetime");
export const decimal = mk<number>("decimal");
export const int = mk<number>("int");
export const json = mk<any>("json");
export const text = mk<string>("text");
export const timestamp = mk<Date>("timestamp");
export function varchar<E extends string = string>(_name?: string, _cfg?: { length?: number; enum?: readonly E[] }): Col<E | null> {
  return new Col<E | null>("varchar");
}

export type IndexDef = { unique: boolean; cols: Col[] };
export const index = (_n: string) => ({ on: (...cols: Col[]): IndexDef => ({ unique: false, cols }) });
export const uniqueIndex = (_n: string) => ({ on: (...cols: Col[]): IndexDef => ({ unique: true, cols }) });
export const primaryKey = (cfg: { columns: Col[] }): IndexDef => ({ unique: true, cols: cfg.columns });

export const TABLE = Symbol("table");
export interface Table<T extends Record<string, Col> = Record<string, Col>> {
  [TABLE]: { name: string; cols: T; indexes: IndexDef[] };
  $inferSelect: any;
}
export type RowOf<T> = T extends Table<infer C> ? { [K in keyof C]: C[K] extends Col<infer U> ? U : never } : never;
export type Shape<F> = {
  [K in keyof F]: F[K] extends Col<infer U> ? U : F[K] extends Table ? RowOf<F[K]> : F[K] extends number ? number : any;
};
export const tableMeta = (t: Table) => t[TABLE];

export const allTables: Table[] = [];

export function mysqlTable<T extends Record<string, Col>>(name: string, cols: T, extra?: (t: T) => IndexDef[]): Table<T> & T {
  const t: any = { ...cols };
  for (const [key, c] of Object.entries(cols)) {
    c.table = t;
    c.key = key;
  }
  t[TABLE] = { name, cols, indexes: extra ? extra(cols) : [] };
  allTables.push(t);
  return t;
}

export function getTableColumns<T extends Record<string, Col>>(t: Table<T> & T): T {
  return t[TABLE].cols;
}

/* ------------------------------------------------------------------ conditions */

export class SqlExpr {
  constructor(
    public strings: readonly string[],
    public params: unknown[],
  ) {}
  get text() {
    return this.strings.reduce((a, s, i) => a + s + (i < this.params.length ? "?" : ""), "").trim();
  }
}
export type SQL = any;
export function sql<T = unknown>(strings: TemplateStringsArray, ...params: unknown[]): T {
  return new SqlExpr(strings, params) as unknown as T;
}

export type Cond =
  | { t: "cmp"; op: "eq" | "ne" | "gt" | "gte" | "lt" | "lte"; col: Col; val: unknown }
  | { t: "in"; col: Col; vals: unknown[] }
  | { t: "like"; col: Col; pat: string }
  | { t: "null"; col: Col; not: boolean }
  | { t: "and" | "or"; items: Cond[] };

const cmp = (op: "eq" | "ne" | "gt" | "gte" | "lt" | "lte") => (col: Col, val: unknown): Cond => ({ t: "cmp", op, col, val });
export const eq = cmp("eq");
export const ne = cmp("ne");
export const gt = cmp("gt");
export const gte = cmp("gte");
export const lt = cmp("lt");
export const lte = cmp("lte");
export const inArray = (col: Col, vals: unknown[]): Cond => ({ t: "in", col, vals });
export const like = (col: Col, pat: string): Cond => ({ t: "like", col, pat });
export const isNull = (col: Col): Cond => ({ t: "null", col, not: false });
export const isNotNull = (col: Col): Cond => ({ t: "null", col, not: true });
export const and = (...items: (Cond | undefined)[]): Cond | undefined => {
  const xs = items.filter(Boolean) as Cond[];
  return xs.length ? { t: "and", items: xs } : undefined;
};
export const or = (...items: (Cond | undefined)[]): Cond | undefined => {
  const xs = items.filter(Boolean) as Cond[];
  return xs.length ? { t: "or", items: xs } : undefined;
};

export class Order {
  constructor(
    public col: Col,
    public dir: 1 | -1,
  ) {}
}
export const asc = (col: Col) => new Order(col, 1);
export const desc = (col: Col) => new Order(col, -1);

/** Aggregates for select({ n: count() }). */
export class Agg {
  constructor(
    public fn: "count" | "sum",
    public col?: Col,
  ) {}
}
export const count = () => new Agg("count") as unknown as number;
export const sum = (col: Col) => new Agg("sum", col) as unknown as number;
