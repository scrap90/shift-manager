import { Modal } from './Modal';
import { DutyIcon } from '../Icons';
import type { ShiftAssignment, DutyType } from '../../types';

const DUTY_LABELS: Record<string, string> = {
  day: '昼間当番', night: '夜間当番', holiday_work: '休日勤務',
  substitute_leave: '代休', vacation: '休暇', shift_work: 'シフト勤務',
};

const DUTY_ORDER = ['day', 'night', 'holiday_work', 'shift_work', 'substitute_leave', 'vacation'];

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  provisional:  { label: '仮（未確定）', cls: 'bg-red-100 text-red-700' },
  confirmed:    { label: '確定',         cls: 'bg-green-100 text-green-700' },
  re_editing:   { label: '再編集',       cls: 'bg-orange-100 text-orange-700' },
};

interface Props {
  date: string;
  assignments: ShiftAssignment[];
  employeeNames: Map<string, string>;
  onClose: () => void;
}

export function DayDetailModal({ date, assignments, employeeNames, onClose }: Props) {
  const dayAssignments = assignments
    .filter(a => a.date === date)
    .sort((a, b) => DUTY_ORDER.indexOf(a.dutyType) - DUTY_ORDER.indexOf(b.dutyType));

  const getLinkedSourceLabel = (linkedSourceId: string) => {
    const src = assignments.find(a => a.assignmentId === linkedSourceId);
    if (!src) return '（不明）';
    return `${src.date.replace(/-/g, '/')} ${DUTY_LABELS[src.dutyType] ?? src.dutyType}`;
  };

  const [y, m, d] = date.split('-');
  const dow = ['日', '月', '火', '水', '木', '金', '土'][new Date(+y, +m - 1, +d).getDay()];

  return (
    <Modal
      title={`${+m}月${+d}日（${dow}）の勤務詳細`}
      onClose={onClose}
      size="md"
    >
      {dayAssignments.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          この日に配置された案件はありません
        </p>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {dayAssignments.map(a => {
            const st = STATUS_MAP[a.status] ?? { label: a.status, cls: 'bg-gray-100 text-gray-600' };
            return (
              <div key={a.assignmentId} className="border border-gray-200 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <DutyIcon dutyType={a.dutyType as DutyType} size={14} className="text-gray-600 shrink-0" />
                  <span className="text-xs font-bold text-gray-700">
                    {DUTY_LABELS[a.dutyType] ?? a.dutyType}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${st.cls}`}>
                    {st.label}
                  </span>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {employeeNames.get(a.employeeId) ?? a.employeeId}
                </div>
                {a.dutySubtype && (
                  <div className="text-xs text-gray-500">種別: {a.dutySubtype}</div>
                )}
                {a.linkedSourceId && (
                  <div className="text-xs text-blue-600">
                    リンク元: {getLinkedSourceLabel(a.linkedSourceId)}
                  </div>
                )}
                {a.note && (
                  <div className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                    メモ: {a.note}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
