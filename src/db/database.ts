import Dexie, { type EntityTable } from 'dexie';
import type { Employee, CalendarHoliday, ShiftAssignment, NightDutyBlock, AppSettings } from '../types';

const db = new Dexie('ShiftManagerDB') as Dexie & {
  employees: EntityTable<Employee, 'id'>;
  calendarHolidays: EntityTable<CalendarHoliday, 'id'>;
  assignments: EntityTable<ShiftAssignment, 'id'>;
  nightDutyBlocks: EntityTable<NightDutyBlock, 'id'>;
  settings: EntityTable<AppSettings, 'id'>;
};

db.version(1).stores({
  employees: '++id, employeeId, isActive',
  calendarHolidays: '++id, date',
  assignments: '++id, assignmentId, date, employeeId, dutyType, status',
  nightDutyBlocks: '++id, blockId, blockedDate, employeeId, originAssignmentId',
  settings: '++id',
});

// linkedSourceId インデックスを追加（代休リンク機能）
db.version(2).stores({
  employees: '++id, employeeId, isActive',
  calendarHolidays: '++id, date',
  assignments: '++id, assignmentId, date, employeeId, dutyType, status, linkedSourceId',
  nightDutyBlocks: '++id, blockId, blockedDate, employeeId, originAssignmentId',
  settings: '++id',
});

export { db };

export async function initDB() {
  const count = await db.settings.count();
  if (count === 0) {
    const year = new Date().getFullYear();
    await db.settings.add({
      weekStartsOnMonday: true,
      aggregationStartDate: `${year}-01-01`,
      aggregationEndDate: `${year}-12-31`,
    } as AppSettings);
  }
}
