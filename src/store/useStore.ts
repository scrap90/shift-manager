import { create } from 'zustand';
import { db, initDB } from '../db/database';
import type {
  Employee, CalendarHoliday, ShiftAssignment, NightDutyBlock,
  AppSettings, UndoItem, Toast,
} from '../types';
import { getLegalHolidays } from '../utils/holidayUtils';

interface StoreState {
  employees: Employee[];
  calendarHolidays: CalendarHoliday[];
  assignments: ShiftAssignment[];
  nightDutyBlocks: NightDutyBlock[];
  settings: AppSettings;
  currentYear: number;
  currentMonth: number;
  undoStack: UndoItem[];
  redoStack: UndoItem[];
  focusedEmployeeId: string | null;
  toasts: Toast[];
  initialized: boolean;
  holidayMap: Map<string, string>;

  init: () => Promise<void>;
  buildHolidayMap: () => void;
  isHoliday: (date: string) => boolean;
  getHolidayName: (date: string) => string;
  setCurrentMonth: (year: number, month: number) => void;
  saveEmployee: (emp: Omit<Employee, 'id'> & { id?: number }) => Promise<void>;
  deactivateEmployee: (id: number) => Promise<void>;
  importCalendarCSV: (text: string) => Promise<{ added: number; overridden: number }>;
  addCalendarHoliday: (date: string, holidayName: string) => Promise<void>;
  removeCalendarHoliday: (date: string) => Promise<void>;
  addAssignment: (a: Omit<ShiftAssignment, 'id'>, block?: Omit<NightDutyBlock, 'id'>) => Promise<void>;
  removeAssignment: (assignmentId: string) => Promise<void>;
  confirmMonth: (year: number, month: number) => Promise<void>;
  clearProvisionalsForMonth: (year: number, month: number) => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  updateSettings: (s: Partial<AppSettings>) => Promise<void>;
  setFocusedEmployee: (id: string | null) => void;
  addToast: (msg: string, undoItem?: UndoItem) => void;
  removeToast: (id: string) => void;
  calcBalance: (employeeId: string) => number;
  updateLinkedSourceId: (substituteLeaveId: string, linkedSourceId: string) => Promise<void>;
  importSettingsBackup: (employees: Employee[], holidays: CalendarHoliday[], settings: AppSettings) => Promise<void>;
  importShiftBackup: (assignments: ShiftAssignment[], blocks: NightDutyBlock[]) => Promise<void>;
}

const defaultYear = new Date().getFullYear();
const DEFAULT_SETTINGS: AppSettings = {
  weekStartsOnMonday: true,
  aggregationStartDate: `${defaultYear}-01-01`,
  aggregationEndDate: `${defaultYear}-12-31`,
};

export const useStore = create<StoreState>((set, get) => ({
  employees: [],
  calendarHolidays: [],
  assignments: [],
  nightDutyBlocks: [],
  settings: DEFAULT_SETTINGS,
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth() + 1,
  undoStack: [],
  redoStack: [],
  focusedEmployeeId: null,
  toasts: [],
  initialized: false,
  holidayMap: new Map(),

  init: async () => {
    await initDB();
    const [employees, calendarHolidays, assignments, nightDutyBlocks, settingsArr] =
      await Promise.all([
        db.employees.toArray(),
        db.calendarHolidays.toArray(),
        db.assignments.toArray(),
        db.nightDutyBlocks.toArray(),
        db.settings.toArray(),
      ]);
    const settings = settingsArr[0] ?? DEFAULT_SETTINGS;
    set({ employees, calendarHolidays, assignments, nightDutyBlocks, settings, initialized: true });
    get().buildHolidayMap();
  },

  buildHolidayMap: () => {
    const { calendarHolidays, currentYear } = get();
    const map = new Map<string, string>();
    for (let y = currentYear - 1; y <= currentYear + 1; y++) {
      getLegalHolidays(y).forEach(h => map.set(h.date, h.name));
    }
    calendarHolidays.forEach(h => {
      if (h.source === 'override' && !h.isHoliday) {
        map.delete(h.date);
      } else if (h.isHoliday) {
        map.set(h.date, h.holidayName || '社内休日');
      }
    });
    set({ holidayMap: map });
  },

  isHoliday: (date: string) => get().holidayMap.has(date),
  getHolidayName: (date: string) => get().holidayMap.get(date) ?? '',

  setCurrentMonth: (year, month) => {
    set({ currentYear: year, currentMonth: month });
    get().buildHolidayMap();
  },

  saveEmployee: async (emp) => {
    if (emp.id != null) {
      await db.employees.update(emp.id, emp as Employee);
    } else {
      await db.employees.add(emp as Employee);
    }
    const employees = await db.employees.toArray();
    set({ employees });
  },

  deactivateEmployee: async (id) => {
    await db.employees.update(id, { isActive: false });
    const employees = await db.employees.toArray();
    set({ employees });
  },

  importCalendarCSV: async (text: string) => {
    // BOM除去・CRLF正規化・空行除去
    const lines = text.replace(/^﻿/, '').trim().split(/\r?\n/).filter(l => l.trim());
    let added = 0, overridden = 0;
    for (const line of lines) {
      const commaIdx = line.indexOf(',');
      const datePart = (commaIdx >= 0 ? line.slice(0, commaIdx) : line).trim();
      const mark = commaIdx >= 0 ? line.slice(commaIdx + 1).trim() : '';
      const rawDate = datePart.replace(/\//g, '-');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) continue;
      await db.calendarHolidays.where('date').equals(rawDate).delete();
      if (mark === '○') {
        // 法定祝日を出勤日として扱うオーバーライド
        await db.calendarHolidays.add({ date: rawDate, isHoliday: false, holidayName: '', source: 'override' } as CalendarHoliday);
        overridden++;
      } else if (mark !== '') {
        // 空欄以外はすべて社内休日として登録（休・×・数字など何でも可）
        await db.calendarHolidays.add({ date: rawDate, isHoliday: true, holidayName: '社内休日', source: 'company' } as CalendarHoliday);
        added++;
      }
    }
    const calendarHolidays = await db.calendarHolidays.toArray();
    set({ calendarHolidays });
    get().buildHolidayMap();
    return { added, overridden };
  },

  addCalendarHoliday: async (date, holidayName) => {
    await db.calendarHolidays.where('date').equals(date).delete();
    await db.calendarHolidays.add({ date, isHoliday: true, holidayName: holidayName || '社内休日', source: 'company' } as CalendarHoliday);
    const calendarHolidays = await db.calendarHolidays.toArray();
    set({ calendarHolidays });
    get().buildHolidayMap();
  },

  removeCalendarHoliday: async (date) => {
    await db.calendarHolidays.where('date').equals(date).delete();
    const calendarHolidays = await db.calendarHolidays.toArray();
    set({ calendarHolidays });
    get().buildHolidayMap();
  },

  addAssignment: async (a, block) => {
    const id = await db.assignments.add(a as ShiftAssignment);
    const newA = { ...a, id: id as number } as ShiftAssignment;
    let newBlock: NightDutyBlock | undefined;
    if (block) {
      const bid = await db.nightDutyBlocks.add(block as NightDutyBlock);
      newBlock = { ...block, id: bid as number } as NightDutyBlock;
    }
    const undoItem: UndoItem = { action: 'add', assignment: newA, block: newBlock };
    set(state => ({
      assignments: [...state.assignments, newA],
      nightDutyBlocks: newBlock ? [...state.nightDutyBlocks, newBlock] : state.nightDutyBlocks,
      undoStack: [...state.undoStack.slice(-19), undoItem],
      redoStack: [],
    }));
  },

  removeAssignment: async (assignmentId: string) => {
    const { assignments, nightDutyBlocks } = get();
    const target = assignments.find(a => a.assignmentId === assignmentId);
    if (!target) return;
    const relatedBlock = nightDutyBlocks.find(b => b.originAssignmentId === assignmentId);

    // 代休元（holiday_work / 代休ありshift_work / 休日の day・night）を削除するとき、紐付いた代休を全件連動削除
    const isLeaveSource =
      target.dutyType === 'holiday_work' ||
      (target.dutyType === 'shift_work' && (target.dutySubtype ?? '').includes('（代休あり）')) ||
      ((target.dutyType === 'day' || target.dutyType === 'night') && get().isHoliday(target.date));
    const cascadedLeaves = isLeaveSource
      ? assignments.filter(a => a.linkedSourceId === assignmentId && a.dutyType === 'substitute_leave')
      : [];

    await db.assignments.where('assignmentId').equals(assignmentId).delete();
    if (relatedBlock) {
      await db.nightDutyBlocks.where('blockId').equals(relatedBlock.blockId).delete();
    }
    for (const cl of cascadedLeaves) {
      await db.assignments.where('assignmentId').equals(cl.assignmentId).delete();
    }

    const cascadedAssignments = cascadedLeaves.length > 0 ? cascadedLeaves : undefined;
    const undoItem: UndoItem = { action: 'remove', assignment: target, block: relatedBlock, cascadedAssignments };
    const cascadedIds = new Set(cascadedLeaves.map(cl => cl.assignmentId));
    set(state => ({
      assignments: state.assignments.filter(a =>
        a.assignmentId !== assignmentId && !cascadedIds.has(a.assignmentId)
      ),
      nightDutyBlocks: relatedBlock
        ? state.nightDutyBlocks.filter(b => b.blockId !== relatedBlock.blockId)
        : state.nightDutyBlocks,
      undoStack: [...state.undoStack.slice(-19), undoItem],
      redoStack: [],
    }));

    if (cascadedLeaves.length > 0) {
      get().addToast(
        `代休 ${cascadedLeaves.length} 件も連動して削除しました（元に戻す: Ctrl+Z）`
      );
    }
  },

  clearProvisionalsForMonth: async (year, month) => {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const { assignments, nightDutyBlocks } = get();
    const targets = assignments.filter(a => a.date.startsWith(prefix) && a.status === 'provisional');
    for (const a of targets) {
      await db.assignments.where('assignmentId').equals(a.assignmentId).delete();
      const block = nightDutyBlocks.find(b => b.originAssignmentId === a.assignmentId);
      if (block) await db.nightDutyBlocks.where('blockId').equals(block.blockId).delete();
    }
    const updatedAssignments = await db.assignments.toArray();
    const updatedBlocks = await db.nightDutyBlocks.toArray();
    set({ assignments: updatedAssignments, nightDutyBlocks: updatedBlocks, undoStack: [], redoStack: [] });
  },

  confirmMonth: async (year, month) => {
    const { assignments } = get();
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const targets = assignments.filter(a => a.date.startsWith(prefix) && a.status !== 'confirmed');
    for (const a of targets) {
      await db.assignments.update(a.id!, { status: 'confirmed', updatedAt: new Date().toISOString() });
    }
    const updated = await db.assignments.toArray();
    set({ assignments: updated });
  },

  undo: async () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return;
    const item = undoStack[undoStack.length - 1];
    if (item.action === 'add') {
      await db.assignments.where('assignmentId').equals(item.assignment.assignmentId).delete();
      if (item.block) await db.nightDutyBlocks.where('blockId').equals(item.block.blockId).delete();
      set(state => ({
        assignments: state.assignments.filter(a => a.assignmentId !== item.assignment.assignmentId),
        nightDutyBlocks: item.block
          ? state.nightDutyBlocks.filter(b => b.blockId !== item.block!.blockId)
          : state.nightDutyBlocks,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, item],
      }));
    } else {
      // remove の undo → 元のレコードを復元（連動削除された代休も含む）
      await db.assignments.add(item.assignment);
      if (item.block) await db.nightDutyBlocks.add(item.block);
      for (const ca of item.cascadedAssignments ?? []) {
        await db.assignments.add(ca);
      }
      set(state => ({
        assignments: [
          ...state.assignments,
          item.assignment,
          ...(item.cascadedAssignments ?? []),
        ],
        nightDutyBlocks: item.block ? [...state.nightDutyBlocks, item.block] : state.nightDutyBlocks,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, item],
      }));
    }
  },

  redo: async () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return;
    const item = redoStack[redoStack.length - 1];
    if (item.action === 'add') {
      await db.assignments.add(item.assignment);
      if (item.block) await db.nightDutyBlocks.add(item.block);
      set(state => ({
        assignments: [...state.assignments, item.assignment],
        nightDutyBlocks: item.block ? [...state.nightDutyBlocks, item.block] : state.nightDutyBlocks,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, item],
      }));
    } else {
      // remove の redo → 再削除（連動削除された代休も含む）
      await db.assignments.where('assignmentId').equals(item.assignment.assignmentId).delete();
      if (item.block) await db.nightDutyBlocks.where('blockId').equals(item.block.blockId).delete();
      for (const ca of item.cascadedAssignments ?? []) {
        await db.assignments.where('assignmentId').equals(ca.assignmentId).delete();
      }
      const cascadedIds = new Set((item.cascadedAssignments ?? []).map(ca => ca.assignmentId));
      set(state => ({
        assignments: state.assignments.filter(a =>
          a.assignmentId !== item.assignment.assignmentId && !cascadedIds.has(a.assignmentId)
        ),
        nightDutyBlocks: item.block
          ? state.nightDutyBlocks.filter(b => b.blockId !== item.block!.blockId)
          : state.nightDutyBlocks,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, item],
      }));
    }
  },

  updateSettings: async (partial) => {
    const { settings } = get();
    const updated = { ...settings, ...partial };
    if (settings.id != null) {
      await db.settings.update(settings.id, updated);
    } else {
      await db.settings.add(updated);
    }
    set({ settings: updated });
  },

  setFocusedEmployee: (id) => set({ focusedEmployeeId: id }),

  addToast: (msg, undoItem) => {
    const id = crypto.randomUUID();
    set(state => ({ toasts: [...state.toasts, { id, message: msg, undoItem }] }));
    setTimeout(() => get().removeToast(id), 5000);
  },

  removeToast: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),

  updateLinkedSourceId: async (substituteLeaveId, linkedSourceId) => {
    const { assignments } = get();
    const target = assignments.find(a => a.assignmentId === substituteLeaveId);
    if (!target?.id) return;
    const updatedAt = new Date().toISOString();
    await db.assignments.update(target.id, { linkedSourceId, updatedAt });
    set(state => ({
      assignments: state.assignments.map(a =>
        a.assignmentId === substituteLeaveId ? { ...a, linkedSourceId, updatedAt } : a
      ),
    }));
  },

  importSettingsBackup: async (employees, holidays, settings) => {
    await db.employees.clear();
    await db.calendarHolidays.clear();
    // DB の auto-increment id を除いて再登録
    await db.employees.bulkAdd(employees.map(({ id: _id, ...e }) => e) as Employee[]);
    await db.calendarHolidays.bulkAdd(holidays.map(({ id: _id, ...h }) => h) as CalendarHoliday[]);
    // settings は既存レコードを上書き
    const { id: _sid, ...settingsData } = settings;
    const { settings: cur } = get();
    if (cur.id != null) {
      await db.settings.update(cur.id, settingsData);
    } else {
      await db.settings.add(settingsData as AppSettings);
    }
    const [newEmployees, newHolidays, settingsArr] = await Promise.all([
      db.employees.toArray(),
      db.calendarHolidays.toArray(),
      db.settings.toArray(),
    ]);
    const newSettings = settingsArr[0] ?? DEFAULT_SETTINGS;
    set({ employees: newEmployees, calendarHolidays: newHolidays, settings: newSettings });
    get().buildHolidayMap();
  },

  importShiftBackup: async (assignments, blocks) => {
    await db.assignments.clear();
    await db.nightDutyBlocks.clear();
    await db.assignments.bulkAdd(assignments.map(({ id: _id, ...a }) => a) as ShiftAssignment[]);
    await db.nightDutyBlocks.bulkAdd(blocks.map(({ id: _id, ...b }) => b) as NightDutyBlock[]);
    const [newAssignments, newBlocks] = await Promise.all([
      db.assignments.toArray(),
      db.nightDutyBlocks.toArray(),
    ]);
    set({ assignments: newAssignments, nightDutyBlocks: newBlocks, undoStack: [], redoStack: [] });
  },

  calcBalance: (employeeId: string) => {
    const { employees, assignments, isHoliday } = get();
    const emp = employees.find(e => e.employeeId === employeeId);
    if (!emp) return 0;
    const earned = assignments
      .filter(a => a.employeeId === employeeId)
      .reduce((sum, a) => {
        let pts = 0;
        if (['day', 'night', 'holiday_work'].includes(a.dutyType) && isHoliday(a.date)) pts++;
        if (a.dutyType === 'shift_work') {
          const parts = a.date.split('-');
          const dow = new Date(+parts[0], +parts[1] - 1, +parts[2]).getDay();
          const isOffDay = isHoliday(a.date) || dow === 0 || dow === 6;
          if (isOffDay) pts++;
          if ((a.dutySubtype ?? '').includes('（代休あり）')) pts++;
        }
        return sum + pts;
      }, 0);
    const taken = assignments.filter(
      a => a.employeeId === employeeId && a.dutyType === 'substitute_leave'
    ).length;
    return emp.carryOverBalance + earned - taken;
  },
}));
