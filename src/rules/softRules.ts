import type { ShiftAssignment, DutyType } from '../types';
import { shiftDateStr } from '../utils/dateUtils';

export interface SoftWarning {
  code: string;
  message: string;
}

export function checkSoftRules(params: {
  date: string;
  employeeId: string;
  dutyType: DutyType;
  employeeName: string;
  assignments: ShiftAssignment[];
}): SoftWarning[] {
  const { date, employeeId, dutyType, employeeName, assignments } = params;
  const warnings: SoftWarning[] = [];

  // 昼間当番の連続配置チェック
  if (dutyType === 'day') {
    const prevStr = shiftDateStr(date, -1);
    const nextStr = shiftDateStr(date, 1);

    const hasPrev = assignments.some(
      a => a.date === prevStr && a.employeeId === employeeId && a.dutyType === 'day'
    );
    const hasNext = assignments.some(
      a => a.date === nextStr && a.employeeId === employeeId && a.dutyType === 'day'
    );

    if (hasPrev || hasNext) {
      const dir = hasPrev && hasNext ? '前日・翌日' : hasPrev ? '前日' : '翌日';
      warnings.push({
        code: 'CONSECUTIVE',
        message: `${employeeName}さんは${dir}も昼間当番です。連続して配置しますか？`,
      });
    }
  }

  // 同日・同区分の多重配置警告（昼間当番・夜間当番のみ。特別勤は複数人配置が通常のため警告不要）
  if (dutyType === 'day' || dutyType === 'night') {
    const sameTypeSameDay = assignments.filter(
      a => a.date === date && a.dutyType === dutyType && a.employeeId !== employeeId
    );
    if (sameTypeSameDay.length >= 1) {
      const label = dutyType === 'day' ? '昼間当番' : '夜間当番';
      warnings.push({
        code: 'MULTIPLE',
        message: `この日はすでに${sameTypeSameDay.length}名が${label}に配置されています。追加配置しますか？`,
      });
    }
  }

  return warnings;
}
