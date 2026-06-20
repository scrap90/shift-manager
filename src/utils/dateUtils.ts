const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

/** Date オブジェクトをローカルタイムゾーンで YYYY-MM-DD 文字列に変換する */
export function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** YYYY-MM-DD の日付文字列を n 日ずらして返す（ローカルタイムゾーン使用） */
export function shiftDateStr(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toLocalDateStr(d);
}

export function getWeekDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return DAY_LABELS[d.getDay()];
}

export function getDaysInMonth(year: number, month: number): string[] {
  const days: string[] = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    days.push(toLocalDateStr(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

export function getCalendarGrid(
  year: number,
  month: number,
  startMonday: boolean
): (string | null)[][] {
  const days = getDaysInMonth(year, month);
  const firstDow = new Date(days[0] + 'T00:00:00').getDay();
  const offset = startMonday ? (firstDow === 0 ? 6 : firstDow - 1) : firstDow;

  const cells: (string | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  days.forEach(d => cells.push(d));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function toDisplayDate(dateStr: string): string {
  return dateStr.replace(/-/g, '/');
}

export function formatYearMonth(year: number, month: number): string {
  return `${year}年${month}月`;
}
