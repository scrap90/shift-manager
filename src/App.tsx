import { useEffect, useState, useCallback, useRef } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor,
  useSensor, useSensors, pointerWithin,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { useStore } from './store/useStore';
import { CalendarGrid } from './components/Calendar/CalendarGrid';
import { EmployeePanel } from './components/EmployeePanel/EmployeePanel';
import { SummaryBar } from './components/SummaryBar';
import { ToastContainer } from './components/Toast';
import { HardBlockDialog } from './components/Dialogs/HardBlockDialog';
import { SoftRuleDialog } from './components/Dialogs/SoftRuleDialog';
import { MinStaffingDialog } from './components/Dialogs/MinStaffingDialog';
import { AssistantCheckDialog, type AssistantCheckItem } from './components/Dialogs/AssistantCheckDialog';
import { ShiftWorkDialog } from './components/Dialogs/ShiftWorkDialog';
import { SubstituteLeaveDialog } from './components/Dialogs/SubstituteLeaveDialog';
import { ReverseLinkDialog } from './components/Dialogs/ReverseLinkDialog';
import { ManualLinkDialog } from './components/Dialogs/ManualLinkDialog';
import { SpecialDutySelectDialog } from './components/Dialogs/SpecialDutySelectDialog';
import { Modal } from './components/Dialogs/Modal';
import { DutyIcon } from './components/Icons';
import { SettingsModal } from './components/Settings/SettingsModal';
import { checkHardRules } from './rules/hardRules';
import { checkSoftRules } from './rules/softRules';
import { resolveDayDutySubtype, resolveNightDutySubtype, getBlockedDate } from './utils/dutyResolver';
import { exportCSV } from './utils/csvUtils';
import { getDaysInMonth, getWeekDayLabel } from './utils/dateUtils';
import type { DutyType, ShiftAssignment, NightDutyBlock } from './types';

const DUTY_LABELS: Record<DutyType, string> = {
  day: '昼間当番', night: '夜間当番', holiday_work: '休日勤務',
  substitute_leave: '代休', vacation: '休暇', shift_work: 'シフト勤務',
};

type DragData =
  | { type: 'new'; employeeId: string; dutyType: DutyType }
  | { type: 'move'; assignmentId: string; employeeId: string; dutyType: DutyType }
  | { type: 'name'; employeeId: string }
  | { employeeId: string; dutyType: DutyType };

export default function App() {
  const {
    init, initialized,
    currentYear, currentMonth,
    isHoliday, getHolidayName,
    removeAssignment, confirmMonth, clearProvisionalsForMonth, undo, redo,
    setCurrentMonth, addToast,
    focusedEmployeeId,
  } = useStore();

  const [activeDragInfo, setActiveDragInfo] = useState<{ employeeName: string; dutyType: DutyType | null } | null>(null);

  const [hardMsg, setHardMsg] = useState<string | null>(null);
  const [softWarnings, setSoftWarnings] = useState<string[] | null>(null);
  const [minStaffingDates, setMinStaffingDates] = useState<string[] | null>(null);
  const [assistantItems, setAssistantItems] = useState<AssistantCheckItem[] | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [shiftWorkPending, setShiftWorkPending] = useState<{
    date: string; employeeId: string; balanceBefore: number;
  } | null>(null);
  const [substituteLeavePending, setSubstituteLeavePending] = useState<{
    date: string;
    employeeId: string;
    originalAssignmentId?: string;
    existingLinkedSourceId?: string;
  } | null>(null);
  // 代休を設置するとマイナスになる場合の確認
  const [substituteLeaveNegativeConfirm, setSubstituteLeaveNegativeConfirm] = useState<{
    date: string;
    employeeId: string;
    originalAssignmentId?: string;
    linkedSourceId: string | null;
  } | null>(null);
  // 残数マイナス時に新規勤務から既存リンクなし代休へ逆リンク（複数枠に対応）
  const [reverseLinkPending, setReverseLinkPending] = useState<{
    newAssignmentId: string;
    newAssignmentDate: string;
    newAssignmentType: DutyType;
    newAssignmentSubtype?: string;
    employeeId: string;
    totalLinks: number;
    linksCompleted: number;
  } | null>(null);
  const [showManualLink, setShowManualLink] = useState(false);
  const [nameDragSelectPending, setNameDragSelectPending] = useState<{
    date: string;
    employeeId: string;
    isHoliday: boolean;
  } | null>(null);

  const pendingAssignment = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo(); }
      if (e.ctrlKey && e.shiftKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const { assignments } = useStore.getState();
      if (assignments.some(a => a.status === 'provisional')) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = (e: DragStartEvent) => {
    const d = e.active.data.current as DragData | undefined;
    if (!d) return;
    const { employees } = useStore.getState();
    const emp = employees.find(em => em.employeeId === d.employeeId);
    const dutyType = 'dutyType' in d ? d.dutyType : null;
    setActiveDragInfo({ employeeName: emp?.name ?? '', dutyType });
  };

  // dutySubtype・linkedSourceId を外部から指定できるよう拡張。新規 assignmentId を返す。
  const executeAssignment = useCallback(async (
    date: string,
    employeeId: string,
    dutyType: DutyType,
    originalAssignmentId?: string,
    overrideDutySubtype?: string,
    linkedSourceId?: string,
  ): Promise<string> => {
    const state = useStore.getState();
    const employee = state.employees.find(e => e.employeeId === employeeId);
    if (!employee) return '';

    const assignmentId = crypto.randomUUID();
    const now = new Date().toISOString();

    let dutySubtype = overrideDutySubtype !== undefined ? overrideDutySubtype : '';
    if (overrideDutySubtype === undefined) {
      if (dutyType === 'day') dutySubtype = resolveDayDutySubtype(date, state.isHoliday);
      else if (dutyType === 'night') dutySubtype = resolveNightDutySubtype(date, state.isHoliday);
    }

    let block: Omit<NightDutyBlock, 'id'> | undefined;
    if (dutyType === 'night') {
      block = {
        blockId: crypto.randomUUID(),
        originAssignmentId: assignmentId,
        blockedDate: getBlockedDate(date),
        employeeId,
      };
    }

    if (originalAssignmentId) {
      await state.removeAssignment(originalAssignmentId);
    }

    await state.addAssignment(
      { assignmentId, date, employeeId, dutyType, dutySubtype, linkedSourceId, status: 'provisional', note: '', createdAt: now, updatedAt: now },
      block,
    );
    addToast(`${employee.name} を ${date.replace(/-/g, '/')} ${DUTY_LABELS[dutyType]} に${originalAssignmentId ? '移動' : '配置'}`);
    return assignmentId;
  }, [addToast]);

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setActiveDragInfo(null);
    if (!e.over) return;

    const drag = e.active.data.current as DragData | undefined;
    const drop = e.over.data.current as { date: string; dutyType: DutyType } | undefined;
    if (!drag || !drop) return;

    // ── 名前ドラッグ ─────────────────────────────────────────
    if ('type' in drag && drag.type === 'name') {
      const { date, dutyType: dropDutyType } = drop;
      const nameDragEmpId = drag.employeeId;
      const state = useStore.getState();
      const employee = state.employees.find(emp => emp.employeeId === nameDragEmpId);
      if (!employee) return;
      const isHolDrop = state.isHoliday(date);

      if (dropDutyType === 'day' || dropDutyType === 'night') {
        // day/night レーンへドロップ → ルールチェックして直接配置
        const currentBalance = state.calcBalance(nameDragEmpId);
        const hard = checkHardRules({
          date, employeeId: nameDragEmpId, dutyType: dropDutyType, isHoliday: isHolDrop,
          assignments: state.assignments, blocks: state.nightDutyBlocks,
          employee, currentBalance,
        });
        if (hard) { setHardMsg(hard.message); return; }

        const soft = checkSoftRules({
          date, employeeId: nameDragEmpId, dutyType: dropDutyType,
          employeeName: employee.name, assignments: state.assignments,
        });

        const doExecName = async () => {
          const newId = await executeAssignment(date, nameDragEmpId, dropDutyType);
          const earnsLeave = (dropDutyType === 'day' || dropDutyType === 'night') && isHolDrop;
          if (currentBalance < 0 && earnsLeave && newId) {
            setReverseLinkPending({
              newAssignmentId: newId, newAssignmentDate: date,
              newAssignmentType: dropDutyType, employeeId: nameDragEmpId,
              totalLinks: 1, linksCompleted: 0,
            });
          }
        };

        if (soft.length > 0) {
          pendingAssignment.current = doExecName;
          setSoftWarnings(soft.map(w => w.message));
        } else {
          doExecName();
        }
      } else {
        // 特別勤務レーンへドロップ → 種別選択ダイアログを表示
        setNameDragSelectPending({ date, employeeId: nameDragEmpId, isHoliday: isHolDrop });
      }
      return;
    }

    // ── 通常ドラッグ ──────────────────────────────────────────
    const isMove = 'type' in drag && drag.type === 'move';
    const { date } = drop;
    const employeeId = drag.employeeId;
    const dutyType = (drag as { dutyType: DutyType }).dutyType;
    const originalAssignmentId = isMove && 'assignmentId' in drag ? drag.assignmentId : undefined;

    if (isMove && originalAssignmentId) {
      const { assignments } = useStore.getState();
      const orig = assignments.find(a => a.assignmentId === originalAssignmentId);
      if (orig && orig.date === date && orig.dutyType === dutyType) return;
    }

    const state = useStore.getState();
    const { assignments, nightDutyBlocks, employees } = state;

    const employee = employees.find(emp => emp.employeeId === employeeId);
    if (!employee) return;

    const isHol = state.isHoliday(date);

    const assignmentsForCheck: ShiftAssignment[] = isMove && originalAssignmentId
      ? assignments.filter(a => a.assignmentId !== originalAssignmentId)
      : assignments;
    const blocksForCheck: NightDutyBlock[] = isMove && originalAssignmentId
      ? nightDutyBlocks.filter(b => b.originAssignmentId !== originalAssignmentId)
      : nightDutyBlocks;

    let currentBalance = state.calcBalance(employeeId);
    if (isMove && originalAssignmentId) {
      const orig = assignments.find(a => a.assignmentId === originalAssignmentId);
      if (orig?.dutyType === 'substitute_leave') currentBalance += 1;
    }

    const hard = checkHardRules({
      date, employeeId, dutyType, isHoliday: isHol,
      assignments: assignmentsForCheck,
      blocks: blocksForCheck,
      employee,
      currentBalance,
    });
    if (hard) { setHardMsg(hard.message); return; }

    const soft = checkSoftRules({
      date, employeeId, dutyType, employeeName: employee.name,
      assignments: assignmentsForCheck,
    });

    // 各区分に応じてダイアログ表示 or 直接配置
    const doExecute = async () => {
      if (dutyType === 'shift_work' && !originalAssignmentId) {
        // balanceBefore を一緒に保存して handleShiftWorkConfirm で逆リンク判定に使う
        setShiftWorkPending({ date, employeeId, balanceBefore: currentBalance });
      } else if (dutyType === 'shift_work' && originalAssignmentId) {
        const orig = state.assignments.find(a => a.assignmentId === originalAssignmentId);
        await executeAssignment(date, employeeId, dutyType, originalAssignmentId, orig?.dutySubtype ?? '');
      } else if (dutyType === 'substitute_leave') {
        // 代休は常にダイアログで元勤務を選択（移動時は既存リンクを初期選択）
        const existingLinkedSourceId = originalAssignmentId
          ? state.assignments.find(a => a.assignmentId === originalAssignmentId)?.linkedSourceId
          : undefined;
        setSubstituteLeavePending({ date, employeeId, originalAssignmentId, existingLinkedSourceId });
      } else {
        // holiday_work / day / night / vacation
        const newId = await executeAssignment(date, employeeId, dutyType, originalAssignmentId);
        // 新規配置 + 代休獲得あり + 配置前残数マイナス → 逆リンクダイアログ
        const earnsLeave =
          dutyType === 'holiday_work' ||
          ((dutyType === 'day' || dutyType === 'night') && isHol);
        if (!originalAssignmentId && currentBalance < 0 && earnsLeave && newId) {
          setReverseLinkPending({
            newAssignmentId: newId,
            newAssignmentDate: date,
            newAssignmentType: dutyType,
            employeeId,
            totalLinks: 1,
            linksCompleted: 0,
          });
        }
      }
    };

    if (soft.length > 0) {
      pendingAssignment.current = doExecute;
      setSoftWarnings(soft.map(w => w.message));
    } else {
      doExecute();
    }
  }, [executeAssignment]);

  const handleSoftConfirm = async () => {
    setSoftWarnings(null);
    if (pendingAssignment.current) { await pendingAssignment.current(); pendingAssignment.current = null; }
  };

  const handleSoftCancel = () => {
    setSoftWarnings(null);
    pendingAssignment.current = null;
  };

  const handleShiftWorkConfirm = async (shiftType: '早出' | '遅出', earnLeave: boolean) => {
    if (!shiftWorkPending) return;
    const { date, employeeId, balanceBefore } = shiftWorkPending;
    const state = useStore.getState();

    // 取得予定の代休ポイントを計算して上限チェック
    const parts = date.split('-');
    const dow = new Date(+parts[0], +parts[1] - 1, +parts[2]).getDay();
    const isOffDay = state.isHoliday(date) || dow === 0 || dow === 6;
    const wouldEarn = (isOffDay ? 1 : 0) + (earnLeave ? 1 : 0);
    const currentBalance = state.calcBalance(employeeId);
    if (currentBalance + wouldEarn > 20) {
      setHardMsg('休日勤務の設定が多すぎるため、先に代休を取得してください。（代休残数が20日を超えます）');
      setShiftWorkPending(null);
      return;
    }

    const sub = earnLeave ? `${shiftType}（代休あり）` : shiftType;
    const newId = await executeAssignment(date, employeeId, 'shift_work', undefined, sub);
    setShiftWorkPending(null);

    // 配置前残数マイナス + 代休獲得あり → 逆リンクダイアログ（複数枠対応）
    if (balanceBefore < 0 && wouldEarn > 0 && newId) {
      setReverseLinkPending({
        newAssignmentId: newId,
        newAssignmentDate: date,
        newAssignmentType: 'shift_work',
        newAssignmentSubtype: sub,
        employeeId,
        totalLinks: wouldEarn,
        linksCompleted: 0,
      });
    }
  };

  const handleShiftWorkCancel = () => setShiftWorkPending(null);

  const handleSubstituteLeaveConfirm = async (linkedSourceId: string | null) => {
    if (!substituteLeavePending) return;
    const { date, employeeId, originalAssignmentId } = substituteLeavePending;

    // 移動の場合は元代休を除いた残数で判定
    const state = useStore.getState();
    let balance = state.calcBalance(employeeId);
    if (originalAssignmentId) {
      const orig = state.assignments.find(a => a.assignmentId === originalAssignmentId);
      if (orig?.dutyType === 'substitute_leave') balance += 1;
    }

    // 設置後にマイナスになる場合は確認ダイアログへ
    if (balance - 1 < 0) {
      setSubstituteLeaveNegativeConfirm({ date, employeeId, originalAssignmentId, linkedSourceId });
      setSubstituteLeavePending(null);
      return;
    }

    await executeAssignment(date, employeeId, 'substitute_leave', originalAssignmentId, '', linkedSourceId ?? undefined);
    setSubstituteLeavePending(null);
  };

  const handleSubstituteLeaveCancel = () => setSubstituteLeavePending(null);

  const handleNegativeBalanceConfirmYes = async () => {
    if (!substituteLeaveNegativeConfirm) return;
    const { date, employeeId, originalAssignmentId, linkedSourceId } = substituteLeaveNegativeConfirm;
    await executeAssignment(date, employeeId, 'substitute_leave', originalAssignmentId, '', linkedSourceId ?? undefined);
    setSubstituteLeaveNegativeConfirm(null);
  };

  const handleNegativeBalanceConfirmNo = () => setSubstituteLeaveNegativeConfirm(null);

  const handleReverseLinkConfirm = async (substituteLeaveAssignmentId: string | null) => {
    if (!reverseLinkPending) return;
    if (substituteLeaveAssignmentId) {
      await useStore.getState().updateLinkedSourceId(substituteLeaveAssignmentId, reverseLinkPending.newAssignmentId);
    }
    const nextCompleted = reverseLinkPending.linksCompleted + 1;
    if (nextCompleted < reverseLinkPending.totalLinks) {
      // まだ残枠があるので同じ配置に対して次のダイアログを開く
      setReverseLinkPending({ ...reverseLinkPending, linksCompleted: nextCompleted });
    } else {
      setReverseLinkPending(null);
    }
  };

  const handleReverseLinkCancel = () => setReverseLinkPending(null);

  // 名前ドラッグ → 特別勤務選択ダイアログの確定
  const handleNameDragSelect = async (selectedDutyType: DutyType) => {
    if (!nameDragSelectPending) return;
    const { date, employeeId, isHoliday: isHol } = nameDragSelectPending;
    setNameDragSelectPending(null);

    const state = useStore.getState();
    const employee = state.employees.find(emp => emp.employeeId === employeeId);
    if (!employee) return;

    const currentBalance = state.calcBalance(employeeId);

    const hard = checkHardRules({
      date, employeeId, dutyType: selectedDutyType, isHoliday: isHol,
      assignments: state.assignments, blocks: state.nightDutyBlocks,
      employee, currentBalance,
    });
    if (hard) { setHardMsg(hard.message); return; }

    const soft = checkSoftRules({
      date, employeeId, dutyType: selectedDutyType,
      employeeName: employee.name, assignments: state.assignments,
    });

    const doExec = async () => {
      if (selectedDutyType === 'shift_work') {
        setShiftWorkPending({ date, employeeId, balanceBefore: currentBalance });
      } else if (selectedDutyType === 'substitute_leave') {
        setSubstituteLeavePending({ date, employeeId, originalAssignmentId: undefined, existingLinkedSourceId: undefined });
      } else {
        // holiday_work / vacation
        const newId = await executeAssignment(date, employeeId, selectedDutyType);
        if (selectedDutyType === 'holiday_work' && currentBalance < 0 && newId) {
          setReverseLinkPending({
            newAssignmentId: newId, newAssignmentDate: date,
            newAssignmentType: selectedDutyType, employeeId,
            totalLinks: 1, linksCompleted: 0,
          });
        }
      }
    };

    if (soft.length > 0) {
      pendingAssignment.current = doExec;
      setSoftWarnings(soft.map(w => w.message));
    } else {
      await doExec();
    }
  };

  const handleConfirmMonth = useCallback(() => {
    const state = useStore.getState();
    const { assignments, employees } = state;
    const days = getDaysInMonth(currentYear, currentMonth);
    const missing: string[] = [];
    for (const date of days) {
      const isHol = state.isHoliday(date);
      const dayOk  = assignments.some(a => a.date === date && a.dutyType === 'day');
      const nightOk = assignments.some(a => a.date === date && a.dutyType === 'night');
      const holOk   = !isHol || assignments.some(a => a.date === date && a.dutyType === 'holiday_work');
      if (!dayOk || !nightOk || !holOk) missing.push(date);
    }
    if (missing.length > 0) { setMinStaffingDates(missing); return; }

    const prefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    const monthA = assignments.filter(a => a.date.startsWith(prefix));
    const items: AssistantCheckItem[] = [];
    for (const a of monthA) {
      if (a.dutyType !== 'day' && a.dutyType !== 'night') continue;
      const emp = employees.find(e => e.employeeId === a.employeeId);
      if (!emp) continue;
      const isAssisted =
        (a.dutyType === 'day' && emp.dayDutyClass === 'assisted') ||
        (a.dutyType === 'night' && emp.nightDutyClass === 'assisted');
      if (!isAssisted) continue;
      const others = monthA.filter(b => b.date === a.date && b.dutyType === a.dutyType && b.employeeId !== a.employeeId);
      if (others.length === 0) {
        items.push({ key: a.assignmentId, date: a.date, dayLabel: getWeekDayLabel(a.date), employeeName: emp.name, dutyLabel: DUTY_LABELS[a.dutyType] });
      }
    }
    if (items.length > 0) { setAssistantItems(items); return; }

    confirmMonth(currentYear, currentMonth).then(() => {
      addToast(`${currentYear}年${currentMonth}月のシフトを確定しました`);
    });
  }, [currentYear, currentMonth, confirmMonth, addToast]);

  const handleAssistantConfirmAll = () => {
    setAssistantItems(null);
    confirmMonth(currentYear, currentMonth).then(() => {
      addToast(`${currentYear}年${currentMonth}月のシフトを確定しました`);
    });
  };

  const handleClearProvisionals = () => {
    if (!confirm(`${currentYear}年${currentMonth}月の未確定（仮）の予定をすべてクリアしますか？\nこの操作は元に戻せません。`)) return;
    clearProvisionalsForMonth(currentYear, currentMonth).then(() => {
      addToast(`${currentYear}年${currentMonth}月の未確定予定をクリアしました`);
    });
  };

  const handleExportCSV = () => {
    const state = useStore.getState();
    const csv = exportCSV(state.assignments, state.employees, state.isHoliday, state.calcBalance);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shift_${currentYear}_${String(currentMonth).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const prevMonth = () => {
    if (currentMonth === 1) setCurrentMonth(currentYear - 1, 12);
    else setCurrentMonth(currentYear, currentMonth - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 12) setCurrentMonth(currentYear + 1, 1);
    else setCurrentMonth(currentYear, currentMonth + 1);
  };

  const storeState = useStore();
  const { employees, assignments, settings: sett } = storeState;
  const headerBg = useStore(s => (s.settings.theme?.headerBg) ?? '#0f172a');
  const employeeNames = new Map(employees.map(e => [e.employeeId, e.name]));
  const hasProvisional = assignments.some(a => a.status === 'provisional');

  if (!initialized) {
    return <div className="h-screen flex items-center justify-center text-gray-400 text-sm">読み込み中...</div>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="h-screen flex flex-col overflow-hidden bg-gray-50">

        <header style={{ backgroundColor: headerBg }} className="text-white h-11 px-4 flex items-center gap-3 shadow-lg flex-shrink-0">
          {/* ロゴ */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 bg-indigo-500 rounded-md flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
              </svg>
            </div>
            <span className="font-semibold text-sm tracking-wide text-white/90 whitespace-nowrap">シフト管理</span>
          </div>

          <div className="w-px h-5 bg-white/20 shrink-0" />

          {/* 月ナビゲーション */}
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={prevMonth}
              className="w-7 h-7 rounded-md flex items-center justify-center
                         text-white/70 hover:text-white hover:bg-white/10 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <span className="text-[15px] font-bold text-white tracking-tight min-w-[7.5rem] text-center">
              {currentYear}年{currentMonth}月
            </span>
            <button onClick={nextMonth}
              className="w-7 h-7 rounded-md flex items-center justify-center
                         text-white/70 hover:text-white hover:bg-white/10 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>

          <div className="flex-1" />

          {/* 副アクション群 */}
          <div className="flex items-center gap-0.5">
            <button onClick={() => setShowManualLink(true)}
              className="h-7 px-2.5 rounded-md text-xs font-medium text-white/70
                         hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              リンク管理
            </button>

            <div className="w-px h-4 bg-white/15 mx-1 shrink-0" />

            <button onClick={undo} title="元に戻す (Ctrl+Z)"
              className="w-7 h-7 rounded-md flex items-center justify-center
                         text-white/70 hover:text-white hover:bg-white/10 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 .49-3.53"/>
              </svg>
            </button>
            <button onClick={redo} title="やり直し (Ctrl+Shift+Z)"
              className="w-7 h-7 rounded-md flex items-center justify-center
                         text-white/70 hover:text-white hover:bg-white/10 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-.49-3.53"/>
              </svg>
            </button>

            <div className="w-px h-4 bg-white/15 mx-1 shrink-0" />

            <button onClick={handleExportCSV}
              className="h-7 px-2.5 rounded-md text-xs font-medium text-white/70
                         hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              CSV
            </button>

            <button onClick={() => setShowSettings(true)}
              className="w-7 h-7 rounded-md flex items-center justify-center
                         text-white/70 hover:text-white hover:bg-white/10 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06
                         a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09
                         A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83
                         l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09
                         A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83
                         l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09
                         a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83
                         l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09
                         a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          </div>

          <div className="w-px h-5 bg-white/20 shrink-0" />

          {/* 主アクション群 */}
          <div className="flex items-center gap-2">
            {hasProvisional && (
              <button onClick={handleClearProvisionals}
                className="h-7 px-3 rounded-md text-xs font-semibold
                           bg-rose-500/20 text-rose-300 border border-rose-500/30
                           hover:bg-rose-500/30 hover:text-rose-200 transition-all">
                未確定クリア
              </button>
            )}
            <button onClick={handleConfirmMonth}
              className={`h-7 px-4 rounded-md text-xs font-bold tracking-wide
                          transition-all duration-150 shadow-sm
                          ${hasProvisional
                            ? 'bg-amber-500 text-white hover:bg-amber-400 shadow-amber-500/30'
                            : 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-emerald-500/30'
                          }`}>
              {currentMonth}月を確定
            </button>
          </div>
        </header>

        <SummaryBar year={currentYear} month={currentMonth} />

        <div className="flex flex-1 overflow-hidden">
          <CalendarGrid
            year={currentYear}
            month={currentMonth}
            weekStartsOnMonday={sett.weekStartsOnMonday}
            assignments={assignments}
            focusedEmployeeId={focusedEmployeeId}
            employeeNames={employeeNames}
            isHolidayFn={isHoliday}
            getHolidayName={getHolidayName}
            onRemove={removeAssignment}
          />
          <EmployeePanel />
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDragInfo && (
            <div className="flex items-center gap-2
                            bg-slate-900 text-white
                            px-3 py-2 rounded-xl
                            shadow-2xl border border-white/10
                            text-sm font-semibold
                            opacity-95 cursor-grabbing
                            whitespace-nowrap scale-105">
              {activeDragInfo.dutyType ? (
                <>
                  <DutyIcon dutyType={activeDragInfo.dutyType} size={14} className="text-slate-300" />
                  <span className="text-white">{activeDragInfo.employeeName}</span>
                  <span className="text-slate-400 text-xs">{DUTY_LABELS[activeDragInfo.dutyType]}</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                       className="text-slate-300">
                    <circle cx="12" cy="7" r="4"/>
                    <path d="M5.5 20v-1.5A6.5 6.5 0 0 1 18.5 18.5V20"/>
                  </svg>
                  <span className="text-white">{activeDragInfo.employeeName}</span>
                  <span className="text-slate-400 text-xs">種別を選択</span>
                </>
              )}
            </div>
          )}
        </DragOverlay>

        <ToastContainer />

        {hardMsg && <HardBlockDialog message={hardMsg} onClose={() => setHardMsg(null)} />}
        {softWarnings && <SoftRuleDialog warnings={softWarnings} onConfirm={handleSoftConfirm} onCancel={handleSoftCancel} />}
        {minStaffingDates && <MinStaffingDialog dates={minStaffingDates} onClose={() => setMinStaffingDates(null)} />}
        {assistantItems && <AssistantCheckDialog items={assistantItems} onConfirmAll={handleAssistantConfirmAll} onCancel={() => setAssistantItems(null)} />}
        {shiftWorkPending && <ShiftWorkDialog onConfirm={handleShiftWorkConfirm} onCancel={handleShiftWorkCancel} />}
        {substituteLeavePending && (
          <SubstituteLeaveDialog
            employeeId={substituteLeavePending.employeeId}
            employeeName={employees.find(e => e.employeeId === substituteLeavePending.employeeId)?.name ?? ''}
            assignments={assignments}
            initialLinkedSourceId={substituteLeavePending.existingLinkedSourceId}
            onConfirm={handleSubstituteLeaveConfirm}
            onCancel={handleSubstituteLeaveCancel}
          />
        )}
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

        {substituteLeaveNegativeConfirm && (
          <Modal title="代休残数確認" onClose={handleNegativeBalanceConfirmNo} variant="warning" size="sm">
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                代休の取得残数がマイナスになります。設置しますか？
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleNegativeBalanceConfirmYes}
                  className="flex-1 bg-orange-500 text-white text-sm py-2 rounded hover:bg-orange-600 font-medium"
                >
                  はい（マイナスで設置）
                </button>
                <button
                  onClick={handleNegativeBalanceConfirmNo}
                  className="flex-1 bg-gray-100 text-gray-700 text-sm py-2 rounded hover:bg-gray-200"
                >
                  いいえ（キャンセル）
                </button>
              </div>
            </div>
          </Modal>
        )}

        {reverseLinkPending && (
          <ReverseLinkDialog
            employeeId={reverseLinkPending.employeeId}
            employeeName={employees.find(e => e.employeeId === reverseLinkPending.employeeId)?.name ?? ''}
            assignments={assignments}
            newAssignmentDate={reverseLinkPending.newAssignmentDate}
            newAssignmentType={reverseLinkPending.newAssignmentType}
            newAssignmentSubtype={reverseLinkPending.newAssignmentSubtype}
            linkIndex={reverseLinkPending.linksCompleted + 1}
            totalLinks={reverseLinkPending.totalLinks}
            onConfirm={handleReverseLinkConfirm}
            onCancel={handleReverseLinkCancel}
          />
        )}
        {showManualLink && <ManualLinkDialog onClose={() => setShowManualLink(false)} />}

        {nameDragSelectPending && (
          <SpecialDutySelectDialog
            date={nameDragSelectPending.date}
            employeeName={employees.find(e => e.employeeId === nameDragSelectPending.employeeId)?.name ?? ''}
            isHoliday={nameDragSelectPending.isHoliday}
            onSelect={handleNameDragSelect}
            onCancel={() => setNameDragSelectPending(null)}
          />
        )}
      </div>
    </DndContext>
  );
}
