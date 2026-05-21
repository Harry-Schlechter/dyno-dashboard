// Tiny mock of the Supabase JS client — only supports the chained read API
// used in this repo: from().select().eq().gte().lte().order().limit().single().
//
// Writes are no-ops (return ok=true). Anything not in FIXTURE returns [].

import FIXTURE from './fixture';

interface Filter { kind: 'eq' | 'gte' | 'lte' | 'in' | 'neq'; key: string; value: any; }

class QueryBuilder {
  private table: string;
  private rows: any[];
  private filters: Filter[] = [];
  private orderCfg: { column: string; ascending: boolean } | null = null;
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
  order(column: string, opts?: { ascending?: boolean }) { this.orderCfg = { column, ascending: opts?.ascending ?? false }; return this; }
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
        return true;
      });
    }
    if (this.orderCfg) {
      const { column, ascending } = this.orderCfg;
      out = [...out].sort((a, b) => {
        const av = a[column], bv = b[column];
        if (av === bv) return 0;
        const cmp = av < bv ? -1 : 1;
        return ascending ? cmp : -cmp;
      });
    }
    if (this.limitN != null) out = out.slice(0, this.limitN);
    return out;
  }
  single() {
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
  },
  channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
  removeChannel: () => {},
};
