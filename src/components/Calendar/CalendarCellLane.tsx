import { useState } from 'react';
import { useDraggable, useDroppable, useDndContext } from '@dnd-kit/core';
import type { DutyType, ShiftAssignment } from '../../types';
import { DutyIcon } from '../Icons';
import { hexToRgba } from '../../utils/colorUtils';
import { useStore } from '../../store/useStore';
import { DEFAULT_THEME } from '../../store/defaultTheme';

const DUTY_LABELS_TIP: Partial<Record<DutyType, string>> = {
  day: '昼間当番', night: '夜間当番', holiday_work: '休日勤務',
  substitute_leave: '代休', vacation: '休暇', shift_work: 'シフト勤務',
};

const STATUS_TIP: Record<string, string> = {
  provisional: '仮（未確定）',
  confirmed:   '確定',
  re_editing:  '再編集',
};

const LANE_SYMBOL: Partial<Record<DutyType, string>> = { day: '昼', night: '夜' };

interface ChipProps {
  assignment: ShiftAssignment;
  employeeName: string;
  dim: boolean;
  onRemove: () => void;
  showTypeIcon?: boolean;
  allAssignments: ShiftAssignment[];
}

function AssignmentChip({
  assignment, employeeName, dim, onRemove, showTypeIcon, allAssignments,
}: ChipProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `move__${assignment.assignmentId}`,
    data: {
      type: 'move',
      assignmentId: assignment.assignmentId,
      employeeId: assignment.employeeId,
      dutyType: assignment.dutyType,
    },
  });
  const [hovered, setHovered] = useState(false);

  const linkedSource = assignment.linkedSourceId
    ? allAssignments.find(a => a.assignmentId === assignment.linkedSourceId)
    : null;
  const linkedSourceLabel = linkedSource
    ? `${linkedSource.date.replace(/-/g, '/')} ${DUTY_LABELS_TIP[linkedSource.dutyType] ?? ''}`
    : null;

  const isProvisional = assignment.status === 'provisional';
  const isReEditing = assignment.status === 're_editing';
  const isConfirmed = assignment.status === 'confirmed';

  const chipWrap =
    isConfirmed   ? 'bg-white border-slate-200 shadow-sm' :
    isReEditing   ? 'bg-amber-50 border-amber-300 border-dashed' :
                    'bg-rose-50 border-rose-300 border-dashed';

  const textColor =
    isConfirmed   ? 'text-slate-700' :
    isReEditing   ? 'text-amber-800' :
                    'text-rose-700';

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`
        relative flex items-center gap-0.5
        px-1 py-px rounded border
        cursor-grab active:cursor-grabbing select-none
        transition-all duration-100
        ${chipWrap}
        ${dim ? 'opacity-35' : 'opacity-100'}
        ${isDragging ? 'opacity-40 scale-95' : ''}
        ${hovered && !isDragging ? 'shadow-md z-10' : ''}
      `}
    >
      {isProvisional && (
        <span className="text-[8px] font-bold text-rose-500 bg-rose-100 px-0.5 rounded leading-none shrink-0">仮</span>
      )}
      {isReEditing && (
        <span className="text-[8px] font-bold text-amber-600 bg-amber-100 px-0.5 rounded leading-none shrink-0">再</span>
      )}

      {showTypeIcon && (
        <DutyIcon dutyType={assignment.dutyType} size={9} className="shrink-0 opacity-50" />
      )}

      <span className={`text-[11px] font-medium flex-1 leading-tight truncate
                        ${textColor} ${isProvisional ? 'italic' : ''}`}>
        {employeeName}
      </span>

      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); onRemove(); }}
        className={`shrink-0 w-3.5 h-3.5 flex items-center justify-center rounded
                    text-slate-300 hover:text-rose-500 hover:bg-rose-50
                    transition-all duration-100
                    ${hovered ? 'opacity-100' : 'opacity-0'}`}
      >
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      {hovered && !isDragging && (
        <div className="absolute bottom-full left-0 mb-1.5 z-50 w-44
                        bg-slate-900 text-white text-[11px] rounded-lg p-2.5
                        shadow-2xl pointer-events-none border border-white/10">
          <div className="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-white/10">
            <DutyIcon dutyType={assignment.dutyType} size={12} className="text-slate-300" />
            <span className="font-semibold text-white text-xs">
              {DUTY_LABELS_TIP[assignment.dutyType]}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">担当</span>
              <span className="text-white font-medium">{employeeName}</span>
            </div>
            {assignment.dutySubtype && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">種別</span>
                <span className="text-slate-200 text-right">{assignment.dutySubtype}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-slate-400">状態</span>
              <span className={`font-medium
                ${isConfirmed  ? 'text-emerald-400' :
                  isReEditing  ? 'text-amber-400' :
                                 'text-rose-400'}`}>
                {STATUS_TIP[assignment.status] ?? assignment.status}
              </span>
            </div>
            {linkedSourceLabel && (
              <div className="flex items-start justify-between gap-1 pt-1 border-t border-white/10">
                <span className="text-slate-400 shrink-0">リンク元</span>
                <span className="text-sky-300 text-right leading-tight">{linkedSourceLabel}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 通常レーン（昼間・夜間） ──

interface LaneProps {
  date: string;
  dutyType: DutyType;
  assignments: ShiftAssignment[];
  focusedEmployeeId: string | null;
  employeeNames: Map<string, string>;
  onRemove: (assignmentId: string) => void;
  allAssignments: ShiftAssignment[];
  accentColor: string;
}

export function CalendarCellLane({
  date, dutyType, assignments, focusedEmployeeId, employeeNames, onRemove, allAssignments, accentColor,
}: LaneProps) {
  const id = `${date}__${dutyType}`;
  const { setNodeRef, isOver } = useDroppable({ id, data: { date, dutyType } });
  const hasSome = assignments.length > 0;

  const headerBgColor = isOver
    ? hexToRgba(accentColor, 0.45)
    : hexToRgba(accentColor, 0.18);
  const cellBgColor = isOver
    ? hexToRgba(accentColor, 0.22)
    : hasSome
      ? hexToRgba(accentColor, 0.04)
      : hexToRgba('#ef4444', 0.05);
  const cellShadow = isOver
    ? `inset 0 0 0 3px ${accentColor}`
    : 'none';

  return (
    <div
      ref={setNodeRef}
      style={{ backgroundColor: cellBgColor, boxShadow: cellShadow }}
      className="flex-1 flex flex-col min-h-14 border-r border-slate-200 transition-all duration-75"
    >
      {/* レーンヘッダー */}
      <div
        style={{ backgroundColor: headerBgColor, color: accentColor }}
        className="flex items-center gap-0.5 px-1 py-0.5 shrink-0 transition-colors duration-75"
      >
        <DutyIcon dutyType={dutyType} size={9} />
        <span className="text-[9px] font-bold leading-none">
          {LANE_SYMBOL[dutyType] ?? ''}
        </span>
        {isOver && (
          <span className="ml-auto text-[8px] font-extrabold animate-bounce leading-none">↓</span>
        )}
      </div>

      {/* ドロップ受付インジケーター */}
      {isOver && (
        <div
          className="mx-0.5 mt-0.5 shrink-0 text-[9px] font-extrabold text-center py-0.5 rounded leading-tight"
          style={{ color: accentColor, backgroundColor: hexToRgba(accentColor, 0.12), border: `1px solid ${hexToRgba(accentColor, 0.5)}` }}
        >
          ここにドロップ
        </div>
      )}

      {/* 未配置インジケーター */}
      {!hasSome && !isOver && (
        <div className="mx-0.5 mt-0.5 shrink-0 text-[9px] text-rose-400 font-semibold
                        text-center py-0.5 rounded bg-rose-50 border border-rose-200/70 leading-tight">
          未
        </div>
      )}

      {/* チップ一覧 */}
      <div className="flex-1 p-0.5 space-y-0.5">
        {assignments.map(a => (
          <AssignmentChip
            key={a.assignmentId}
            assignment={a}
            employeeName={employeeNames.get(a.employeeId) ?? a.employeeId}
            dim={!!(focusedEmployeeId && focusedEmployeeId !== a.employeeId)}
            onRemove={() => onRemove(a.assignmentId)}
            allAssignments={allAssignments}
          />
        ))}
      </div>
    </div>
  );
}

// ── 特別勤レーン（休日勤・代休・休暇・シフト勤務） ──

function buildShiftSubLabel(subtype: string): string {
  if (!subtype) return '';
  if (subtype === '早出（代休あり）') return '[早・代]';
  if (subtype === '遅出（代休あり）') return '[遅・代]';
  if (subtype === '早出') return '[早]';
  if (subtype === '遅出') return '[遅]';
  return `[${subtype}]`;
}

interface SpecialLaneProps {
  date: string;
  assignments: ShiftAssignment[];
  focusedEmployeeId: string | null;
  employeeNames: Map<string, string>;
  onRemove: (assignmentId: string) => void;
  allAssignments: ShiftAssignment[];
}

export function SpecialLane({
  date, assignments, focusedEmployeeId, employeeNames, onRemove, allAssignments,
}: SpecialLaneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${date}__special`,
    data: { date, dutyType: 'substitute_leave' as DutyType },
  });
  const theme = useStore(s => s.settings.theme ?? DEFAULT_THEME);
  const { active } = useDndContext();
  const dragDutyType = active?.data?.current?.dutyType as DutyType | undefined;
  // ドラッグ中の勤務種別の色、不明な場合は substitute_leave の色
  const accentColor = (dragDutyType && theme.duties[dragDutyType])
    ? theme.duties[dragDutyType].color
    : theme.duties.substitute_leave.color;

  const headerBgColor = isOver ? hexToRgba(accentColor, 0.45) : '';
  const cellBgColor = isOver ? hexToRgba(accentColor, 0.22) : '';
  const cellShadow = isOver ? `inset 0 0 0 3px ${accentColor}` : 'none';

  return (
    <div
      ref={setNodeRef}
      style={{ backgroundColor: cellBgColor || undefined, boxShadow: cellShadow }}
      className={`flex-1 flex flex-col min-h-14 border-r last:border-r-0 border-slate-200
                  transition-all duration-75 ${!isOver ? 'bg-white/50' : ''}`}
    >
      {/* 特別レーンヘッダー */}
      <div
        className="flex items-center gap-0.5 px-1 py-0.5 shrink-0 transition-colors duration-75"
        style={isOver
          ? { backgroundColor: headerBgColor, color: accentColor }
          : { backgroundColor: '#f1f5f9' }}
      >
        <span
          className="text-[9px] font-bold leading-none"
          style={isOver ? { color: accentColor } : { color: '#64748b' }}
        >
          特
        </span>
        {isOver && (
          <span className="ml-auto text-[8px] font-extrabold animate-bounce leading-none" style={{ color: accentColor }}>↓</span>
        )}
      </div>

      {/* ドロップ受付インジケーター */}
      {isOver && (
        <div
          className="mx-0.5 mt-0.5 shrink-0 text-[9px] font-extrabold text-center py-0.5 rounded leading-tight"
          style={{ color: accentColor, backgroundColor: hexToRgba(accentColor, 0.12), border: `1px solid ${hexToRgba(accentColor, 0.5)}` }}
        >
          ここにドロップ
        </div>
      )}

      {/* チップ一覧 */}
      <div className="flex-1 p-0.5 space-y-0.5">
        {assignments.map(a => {
          const sub = a.dutyType === 'shift_work' ? buildShiftSubLabel(a.dutySubtype) : '';
          const displayName = `${employeeNames.get(a.employeeId) ?? a.employeeId}${sub}`;
          return (
            <AssignmentChip
              key={a.assignmentId}
              assignment={a}
              employeeName={displayName}
              showTypeIcon={true}
              dim={!!(focusedEmployeeId && focusedEmployeeId !== a.employeeId)}
              onRemove={() => onRemove(a.assignmentId)}
              allAssignments={allAssignments}
            />
          );
        })}
      </div>
    </div>
  );
}
