import { shiftDateStr } from './dateUtils';

export function resolveDayDutySubtype(
  dateStr: string,
  isHolidayFn: (d: string) => boolean
): string {
  const date = new Date(dateStr + 'T00:00:00');
  const dow = date.getDay();
  const nextStr = shiftDateStr(dateStr, 1);

  if (isHolidayFn(dateStr)) return '休日昼間当番';
  if (dow === 0) return '休日昼間当番';
  if (dow === 6) return '休日前昼間当番';
  if (isHolidayFn(nextStr)) return '休日前昼間当番';
  return '平日昼間当番';
}

export function resolveNightDutySubtype(
  dateStr: string,
  isHolidayFn: (d: string) => boolean
): string {
  const date = new Date(dateStr + 'T00:00:00');
  const dow = date.getDay();
  const nextStr = shiftDateStr(dateStr, 1);

  if (isHolidayFn(dateStr)) return '休日夜間当番';
  if (dow === 0) return '休日夜間当番';
  if (dow === 6) return '休日前夜間当番';
  if (isHolidayFn(nextStr)) return '週末前夜間当番';
  if (dow === 5) return '週末前夜間当番';
  return '平日夜間当番';
}

/** 夜間当番の翌日（ブロック対象日）を返す */
export function getBlockedDate(dateStr: string): string {
  return shiftDateStr(dateStr, 1);
}
