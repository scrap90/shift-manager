import type { ShiftAssignment, NightDutyBlock, Employee, DutyType } from '../types';
import { shiftDateStr } from '../utils/dateUtils';

export interface HardViolation {
  code: string;
  message: string;
}

const SPECIAL_TYPES: DutyType[] = ['holiday_work', 'substitute_leave', 'vacation', 'shift_work'];

export function checkHardRules(params: {
  date: string;
  employeeId: string;
  dutyType: DutyType;
  isHoliday: boolean;
  assignments: ShiftAssignment[];
  blocks: NightDutyBlock[];
  employee: Employee;
  currentBalance: number;
}): HardViolation | null {
  const { date, employeeId, dutyType, isHoliday, assignments, blocks, employee, currentBalance } = params;

  // 夜勤明けブロック（前日に夜間当番がある日は配置不可）
  if (blocks.some(b => b.blockedDate === date && b.employeeId === employeeId)) {
    return { code: 'NIGHT_BLOCK', message: '前日に夜間当番があるため、この日は配置できません。' };
  }

  // 担当区分チェック
  if (dutyType === 'day' && employee.dayDutyClass === 'none') {
    return { code: 'NO_DAY_CLASS', message: 'この方は昼間当番の対象外です。' };
  }
  if (dutyType === 'night' && employee.nightDutyClass === 'none') {
    return { code: 'NO_NIGHT_CLASS', message: 'この方は夜間当番の対象外です。' };
  }

  // 夜間当番の翌日チェック（翌日にすでに当番・特別勤務がある場合は配置不可）
  if (dutyType === 'night') {
    const nextDay = shiftDateStr(date, 1);
    const nextDayHasDuty = assignments.some(
      a => a.date === nextDay && a.employeeId === employeeId && a.dutyType !== 'substitute_leave'
    );
    if (nextDayHasDuty) {
      return { code: 'NIGHT_NEXT_OCCUPIED', message: '翌日にすでに当番または特別勤務が配置されているため、夜間当番を配置できません。' };
    }
  }

  const sameDayOwn = assignments.filter(a => a.date === date && a.employeeId === employeeId);

  // 同日・同区分の重複
  if (sameDayOwn.some(a => a.dutyType === dutyType)) {
    return { code: 'EXACT_DUPLICATE', message: 'この方はすでに同日・同区分に配置されています。' };
  }

  // 同日に別の勤務区分がある場合はすべてブロック（1人1日1区分）
  if (sameDayOwn.length > 0) {
    return { code: 'DUPLICATE', message: '同日にすでに別の勤務区分が配置されています。' };
  }

  // 休日勤務は社内休日のみ
  if (dutyType === 'holiday_work' && !isHoliday) {
    return { code: 'WRONG_DATE', message: '休日勤務は社内休日のみ設定できます。' };
  }

  // 代休は平日のみ
  if (dutyType === 'substitute_leave' && isHoliday) {
    return { code: 'WRONG_DATE', message: '代休は平日（社内休日以外）のみ設定できます。' };
  }

  // 休暇は休日には設定不可
  if (dutyType === 'vacation' && isHoliday) {
    return { code: 'VACATION_ON_HOLIDAY', message: '休暇は社内休日には設定できません。' };
  }

  // 代休残数上限チェック（20日を超える配置は不可）
  // holiday_work は休日のみ配置可能なので必ず +1。day/night も休日配置で +1。
  const wouldEarnByDrop =
    dutyType === 'holiday_work' ||
    ((dutyType === 'day' || dutyType === 'night') && isHoliday);
  if (wouldEarnByDrop && currentBalance >= 20) {
    return {
      code: 'MAX_BALANCE',
      message: '休日勤務の設定が多すぎるため、先に代休を取得してください。（代休残数が20日を超えます）',
    };
  }

  return null;
}

export { SPECIAL_TYPES };
