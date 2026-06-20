import type { ShiftAssignment, Employee } from '../types';
import { toDisplayDate } from './dateUtils';

const BOM = '﻿';

// エクスポート列定義（day_of_week 削除・linked_substitute_date 追加）
const EXPORT_HEADERS = [
  'date', 'is_holiday', 'duty_type', 'duty_subtype',
  'employee_id', 'employee_name', 'status', 'carry_over_balance',
  'linked_substitute_date', 'note',
];

// インポート時に必須な列（linked_substitute_date は不要）
const REQUIRED_IMPORT_HEADERS = [
  'date', 'duty_type', 'duty_subtype', 'employee_id', 'status', 'note',
];

function q(v: string): string {
  return `"${v.replace(/"/g, '""')}"`;
}

export function exportCSV(
  assignments: ShiftAssignment[],
  employees: Employee[],
  isHolidayFn: (d: string) => boolean,
  calcBalanceFn: (empId: string) => number
): string {
  const empMap = new Map(employees.map(e => [e.employeeId, e]));

  // 代休のリンク元 assignmentId → 代休取得日の一覧
  const linkedSubMap = new Map<string, string[]>();
  for (const a of assignments) {
    if (a.dutyType === 'substitute_leave' && a.linkedSourceId) {
      const list = linkedSubMap.get(a.linkedSourceId) ?? [];
      list.push(toDisplayDate(a.date));
      linkedSubMap.set(a.linkedSourceId, list);
    }
  }

  const rows = assignments.map(a => {
    const emp = empMap.get(a.employeeId);
    const linkedDates = linkedSubMap.get(a.assignmentId)?.join(' / ') ?? '';
    return [
      toDisplayDate(a.date),
      isHolidayFn(a.date) ? 'true' : 'false',
      a.dutyType,
      a.dutySubtype,
      a.employeeId,
      emp?.name ?? '',
      a.status,
      String(calcBalanceFn(a.employeeId)),
      linkedDates,
      a.note,
    ].map(q).join(',');
  });
  return BOM + [EXPORT_HEADERS.join(','), ...rows].join('\n');
}

export function validateCSVHeaders(text: string): boolean {
  const firstLine = text.replace(/^﻿/, '').split('\n')[0].trim();
  const cols = firstLine.split(',').map(c => c.replace(/"/g, '').trim());
  return REQUIRED_IMPORT_HEADERS.every(h => cols.includes(h));
}

export function parseShiftCSV(text: string): Partial<ShiftAssignment>[] {
  const lines = text.replace(/^﻿/, '').trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.replace(/^"|"$/g, '').trim());
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
    return {
      date: obj.date?.replace(/\//g, '-') ?? '',
      employeeId: obj.employee_id ?? '',
      dutyType: obj.duty_type as ShiftAssignment['dutyType'],
      dutySubtype: obj.duty_subtype ?? '',
      status: obj.status as ShiftAssignment['status'],
      note: obj.note ?? '',
    };
  });
}
