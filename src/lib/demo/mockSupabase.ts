// Tiny mock of the Supabase JS client — only supports the chained read API
// used in this repo: from().select().eq().gte().lte().order().limit().single().
//
// Writes are no-ops (return ok=true). Anything not in FIXTURE returns [].

import FIXTURE from './fixture';

interface Filter { kind: 'eq' | 'gte' | 'lte' | 'in' | 'neq' | 'is' | 'not'; key: string; value: any; }

class QueryBuilder {
  private table: string;
  private rows: any[];
  private filters: Filter[] = [];
  private orderBy: Array<{ column: string; ascending: boolean }> = [];
  private limitN: number | null = null;
  constructor(table: string) {
    this.table = table;
    this.rows = (FIXTURE[table] || []).slice();
  }
  select(_sel?: string) { return this; }
  eq(key: string, value: any)  { this.filters.push({ kind: 'eq',  key, value }); return this; }
  neq(key: string, value: any) { this.filters.push({ kind: 'neq', key, value }); return this; }
  gte(key: string, value: any) { this.filters.push({ kind: 'gte', key, value }); return this; }
  lte(key: string, value: any) { this.filters.push({ kind: 'lte', key, value }); return this; }
  in(key: string, values: any[]) { this.filters.push({ kind: 'in', key, value: values }); return this; }
  is(key: string, value: any)  { this.filters.push({ kind: 'is',  key, value }); return this; }
  not(key: string, _op: string, value: any) { this.filters.push({ kind: 'not', key, value }); return this; }
  // Supabase applies chained .order() calls in sequence (first = primary key).
  order(column: string, opts?: { ascending?: boolean }) {
    this.orderBy.push({ column, ascending: opts?.ascending ?? false });
    return this;
  }
  limit(n: number) { this.limitN = n; return this; }
  private materialize() {
    let out = this.rows;
    for (const f of this.filters) {
      // Ignore the user_id filter — fixture rows all use 'demo'.
      if (f.key === 'user_id') continue;
      out = out.filter(r => {
        const v = r[f.key];
        if (f.kind === 'eq')  return v === f.value;
        if (f.kind === 'neq') return v !== f.value;
        if (f.kind === 'gte') return v >= f.value;
        if (f.kind === 'lte') return v <= f.value;
        if (f.kind === 'in')  return f.value.includes(v);
        // .is(col, null) matches SQL IS NULL — undefined counts as null here
        // because fixture rows often just omit the column.
        if (f.kind === 'is')  return f.value === null ? (v === null || v === undefined) : v === f.value;
        if (f.kind === 'not') return f.value === null ? (v !== null && v !== undefined) : v !== f.value;
        return true;
      });
    }
    if (this.orderBy.length) {
      out = [...out].sort((a, b) => {
        for (const { column, ascending } of this.orderBy) {
          const av = a[column], bv = b[column];
          if (av === bv) continue;
          // Nulls sort last regardless of direction, like Postgres defaults.
          if (av === null || av === undefined) return 1;
          if (bv === null || bv === undefined) return -1;
          return (av < bv ? -1 : 1) * (ascending ? 1 : -1);
        }
        return 0;
      });
    }
    if (this.limitN != null) out = out.slice(0, this.limitN);
    return out;
  }
  single() {
    return Promise.resolve({ data: this.materialize()[0] ?? null, error: null });
  }
  maybeSingle() {
    return Promise.resolve({ data: this.materialize()[0] ?? null, error: null });
  }
  // Make awaitable directly
  then<T>(onFulfilled: (v: { data: any[]; error: null }) => T): Promise<T> {
    return Promise.resolve({ data: this.materialize(), error: null }).then(onFulfilled);
  }
  // Writes — no-ops
  insert(_rows: any) { return Promise.resolve({ data: null, error: null }); }
  update(_patch: any) { return this; }
  delete()             { return this; }
  upsert(_rows: any)   { return Promise.resolve({ data: null, error: null }); }
}

export const mockSupabase = {
  from(table: string) { return new QueryBuilder(table); },
  auth: {
    getUser:    async () => ({ data: { user: { id: 'demo' } }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    signInWithPassword: async () => ({ data: null, error: null }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
  },
  channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
  removeChannel: () => {},
};
