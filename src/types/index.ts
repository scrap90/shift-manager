export type DayDutyClass = 'none' | 'assisted' | 'solo';
export type NightDutyClass = 'none' | 'assisted' | 'solo';
export type DutyType = 'day' | 'night' | 'holiday_work' | 'substitute_leave' | 'vacation' | 'shift_work';
export type AssignmentStatus = 'provisional' | 'confirmed' | 're_editing';

export interface Employee {
  id?: number;
  employeeId: string;
  name: string;
  address: string;
  dayDutyClass: DayDutyClass;
  nightDutyClass: NightDutyClass;
  isActive: boolean;
  carryOverBalance: number;
}

export interface CalendarHoliday {
  id?: number;
  date: string;
  isHoliday: boolean;
  holidayName: string;
  source: 'legal' | 'company' | 'override';
}

export interface ShiftAssignment {
  id?: number;
  assignmentId: string;
  date: string;
  employeeId: string;
  dutyType: DutyType;
  dutySubtype: string;
  linkedSourceId?: string; // 代休の場合、元勤務（holiday_work/shift_work）のassignmentId
  status: AssignmentStatus;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface NightDutyBlock {
  id?: number;
  blockId: string;
  originAssignmentId: string;
  blockedDate: string;
  employeeId: string;
}

export type IconName =
  | 'sun' | 'moon' | 'star' | 'briefcase' | 'bed' | 'umbrella' | 'clock'
  | 'heart' | 'home' | 'coffee' | 'plane' | 'zap' | 'building' | 'activity'
  | 'map-pin' | 'award';

export interface DutyTheme {
  color: string;       // hex (#rrggbb)
  iconName: IconName;
}

export interface AppTheme {
  headerBg: string;               // メニューバー背景
  calDowRowBg: string;            // 曜日行背景
  calDowWeekdayText: string;      // 平日 曜日文字
  calDowSaturdayText: string;     // 土曜 曜日文字
  calDowSundayText: string;       // 日曜 曜日文字
  calWeekdayHeaderBg: string;     // 平日 日付セル背景
  calSaturdayHeaderBg: string;    // 土曜 日付セル背景
  calSundayHeaderBg: string;      // 日曜 日付セル背景
  calHolidayHeaderBg: string;     // 祝日 日付セル背景
  calWeekdayNumColor: string;     // 平日 日付数字色
  calSaturdayNumColor: string;    // 土曜 日付数字色
  calSundayHolidayNumColor: string; // 日曜・祝日 日付数字色
  duties: Record<DutyType, DutyTheme>;
}

export interface AppSettings {
  id?: number;
  weekStartsOnMonday: boolean;
  aggregationStartDate: string;
  aggregationEndDate: string;
  theme?: AppTheme;
}

export interface UndoItem {
  action: 'add' | 'remove';
  assignment: ShiftAssignment;
  block?: NightDutyBlock;
  cascadedAssignments?: ShiftAssignment[]; // 元勤務削除時に連動削除された代休（複数対応）
}

export interface Toast {
  id: string;
  message: string;
  undoItem?: UndoItem;
}

export interface EmployeeCounts {
  day: { weekday: number; holidayEve: number; holiday: number; total: number; provisional: number };
  night: { weekday: number; weekendEve: number; holidayEve: number; holiday: number; total: number; provisional: number };
  holidayWork: number;
  holidayWorkProvisional: number;
  substituteLeave: number;
  vacation: number;
  shiftWork: number;
  shiftWorkWithLeave: number;
  carryOverBalance: number;
}
