import * as HolidayJP from '@holiday-jp/holiday_jp';

export function getLegalHolidays(year: number): { date: string; name: string }[] {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  try {
    const holidays = HolidayJP.between(start, end);
    return holidays.map((h: { date: Date; name: string }) => ({
      date: toDateStr(h.date),
      name: h.name,
    }));
  } catch {
    return [];
  }
}

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
