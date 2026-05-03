import { format, formatDistanceToNow, parseISO, isToday, isYesterday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, differenceInDays, isValid } from 'date-fns';

const parseDateValue = (value: string | Date | null | undefined): Date | null => {
  if (!value) return null;

  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) return null;

  const isoParsedDate = parseISO(trimmedValue);
  if (isValid(isoParsedDate)) return isoParsedDate;

  const fallbackParsedDate = new Date(trimmedValue);
  return isValid(fallbackParsedDate) ? fallbackParsedDate : null;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

export const formatNumber = (num: number, decimals = 0): string => {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(num);
};

export const formatDate = (date: string | Date | null | undefined): string => {
  const parsedDate = parseDateValue(date);
  return parsedDate ? format(parsedDate, 'MMM d, yyyy') : '--';
};

export const formatDateShort = (date: string | Date | null | undefined): string => {
  const parsedDate = parseDateValue(date);
  return parsedDate ? format(parsedDate, 'MMM d') : '--';
};

export const formatTime = (date: string | Date | null | undefined): string => {
  const parsedDate = parseDateValue(date);
  return parsedDate ? format(parsedDate, 'h:mm a') : '--';
};

export const formatRelative = (date: string | Date | null | undefined): string => {
  const parsedDate = parseDateValue(date);
  if (!parsedDate) return '--';
  if (isToday(parsedDate)) return 'Today';
  if (isYesterday(parsedDate)) return 'Yesterday';
  return formatDistanceToNow(parsedDate, { addSuffix: true });
};

export const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export const formatDuration = (minutes: number): string => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
};

export const getDateRange = (range: '7d' | '30d' | '90d') => {
  const end = new Date();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const start = subDays(end, days);
  return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') };
};

export const getToday = (): string => format(new Date(), 'yyyy-MM-dd');

export const formatMonth = (dateStr: string): string => {
  const parsed = parseDateValue(dateStr);
  return parsed ? format(parsed, 'MMM yyyy') : dateStr;
};

export { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, differenceInDays, parseISO, isToday, format };
