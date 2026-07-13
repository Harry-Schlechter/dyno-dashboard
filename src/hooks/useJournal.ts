import { useMemo } from 'react';
import { useSupabase } from './useSupabase';
import { differenceInCalendarDays, format } from 'date-fns';

export interface JournalEntry {
  id: string;
  date: string;
  raw_text: string;
  word_count: number | null;
  mood: number | null;
  energy: number | null;
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed' | null;
  topics: string[];
  people: string[];
  highlights: string[];
  one_liner: string | null;
}

export interface Recurrence {
  name: string;
  count: number;
  dates: string[];
}

// All journal insights are scoped to "within your journal" — counts + recurrence,
// never "first appeared"/life-origin claims, because the journal is partial.
export const useJournal = () => {
  const result = useSupabase<JournalEntry>({
    table: 'journal_entries',
    order: { column: 'date', ascending: false },
    limit: 1000,
  });

  const entries = result.data;

  // "On this day": prior entries sharing today's MM-DD.
  const onThisDay = useMemo(() => {
    const todayMMDD = format(new Date(), 'MM-dd');
    const todayISO = format(new Date(), 'yyyy-MM-dd');
    return entries
      .filter((e) => e.date.slice(5) === todayMMDD && e.date < todayISO)
      .map((e) => ({ ...e, daysAgo: differenceInCalendarDays(new Date(), new Date(e.date + 'T00:00:00')) }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [entries]);

  // Journaling streak: consecutive days back from the most recent entry.
  const streak = useMemo(() => {
    if (entries.length === 0) return { current: 0, journaledToday: false, lastDate: null as string | null };
    const dates = new Set(entries.map((e) => e.date));
    const todayISO = format(new Date(), 'yyyy-MM-dd');
    const journaledToday = dates.has(todayISO);
    // Count back from today (or yesterday if not yet journaled today).
    let cursor = new Date();
    if (!journaledToday) cursor.setDate(cursor.getDate() - 1);
    let count = 0;
    for (;;) {
      const key = format(cursor, 'yyyy-MM-dd');
      if (dates.has(key)) { count++; cursor.setDate(cursor.getDate() - 1); }
      else break;
    }
    return { current: count, journaledToday, lastDate: entries[0]?.date ?? null };
  }, [entries]);

  const recurrence = useMemo(() => {
    const tally = (key: 'people' | 'topics') => {
      const map = new Map<string, string[]>();
      for (const e of entries) {
        for (const v of e[key] || []) {
          const norm = v.trim();
          if (!norm) continue;
          if (!map.has(norm)) map.set(norm, []);
          map.get(norm)!.push(e.date);
        }
      }
      return [...map.entries()]
        .map(([name, dates]) => ({ name, count: dates.length, dates }))
        .filter((r) => r.count >= 2) // recurrence = mentioned in 2+ entries
        .sort((a, b) => b.count - a.count);
    };
    return { people: tally('people'), topics: tally('topics') };
  }, [entries]);

  // Mood arc (chronological), only entries with a mood.
  const moodArc = useMemo(
    () => [...entries]
      .filter((e) => e.mood != null)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => ({ date: e.date, mood: e.mood as number, energy: e.energy ?? null })),
    [entries],
  );

  // Highlights timeline (entries that have highlights), most recent first.
  const highlights = useMemo(
    () => entries
      .filter((e) => e.highlights && e.highlights.length > 0)
      .flatMap((e) => e.highlights.map((h) => ({ date: e.date, text: h }))),
    [entries],
  );

  return { ...result, entries, onThisDay, streak, recurrence, moodArc, highlights };
};
