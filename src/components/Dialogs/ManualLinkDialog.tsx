import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Modal } from './Modal';
import type { ShiftAssignment } from '../../types';

function getSourceCapacity(a: ShiftAssignment, isHoliday: (d: string) => boolean): number {
  if (a.dutyType === 'holiday_work') return 1;
  if (a.dutyType === 'shift_work' && a.dutySubtype?.includes('代休あり')) {
    const [y, m, d] = a.date.split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    return (isHoliday(a.date) || dow === 0 || dow === 6) ? 2 : 1;
  }
  if ((a.dutyType === 'day' || a.dutyType === 'night') && isHoliday(a.date)) return 1;
  return 0;
}

const SOURCE_LABEL: Record<string, string> = {
  holiday_work: '休日勤務',
  shift_work: 'シフト勤務',
  day: '昼間当番（休日）',
  night: '夜間当番（休日）',
};

function sourceLabel(a: ShiftAssignment): string {
  const base = SOURCE_LABEL[a.dutyType] ?? a.dutyType;
  const sub = a.dutyType === 'shift_work' && a.dutySubtype ? `（${a.dutySubtype}）` : '';
  return `${a.date.replace(/-/g, '/')} ${base}${sub}`;
}

interface Props {
  onClose: () => void;
}

export function ManualLinkDialog({ onClose }: Props) {
  const { assignments, employees, isHoliday, updateLinkedSourceId } = useStore();

  const employeeNames = new Map(employees.map(e => [e.employeeId, e.name]));

  const unlinkedLeaves = assignments
    .filter(a => a.dutyType === 'substitute_leave' && !a.linkedSourceId)
    .sort((a, b) => a.employeeId.localeCompare(b.employeeId) || a.date.localeCompare(b.date));

  const sourcesAll = assignments
    .filter(a => getSourceCapacity(a, isHoliday) > 0)
    .map(a => {
      const cap = getSourceCapacity(a, isHoliday);
      const used = assignments.filter(l => l.linkedSourceId === a.assignmentId).length;
      return { a, cap, remaining: cap - used };
    })
    .filter(s => s.remaining > 0)
    .sort((x, y) => x.a.date.localeCompare(y.a.date));

  const availableFor = (employeeId: string) =>
    sourcesAll.filter(s => s.a.employeeId === employeeId);

  const [selections, setSelections] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const handleLink = async (leaveId: string) => {
    const sourceId = selections[leaveId];
    if (!sourceId || busy) return;
    setBusy(leaveId);
    await updateLinkedSourceId(leaveId, sourceId);
    setBusy(null);
    setSelections(prev => {
      const next = { ...prev };
      delete next[leaveId];
      return next;
    });
  };

  return (
    <Modal title="リンク管理" onClose={onClose} size="lg">
      <div className="space-y-5">

        {/* リンクなし代休テーブル */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            リンクなし代休
            {unlinkedLeaves.length > 0 && (
              <span className="ml-1 text-xs font-normal text-gray-500">（{unlinkedLeaves.length}件）</span>
            )}
          </h3>
          {unlinkedLeaves.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">リンクなしの代休はありません</p>
          ) : (
            <div className="border border-gray-200 rounded divide-y max-h-64 overflow-y-auto">
              {unlinkedLeaves.map(leave => {
                const sources = availableFor(leave.employeeId);
                const isWorking = busy === leave.assignmentId;
                return (
                  <div key={leave.assignmentId} className="flex items-center gap-2 px-3 py-2">
                    <div className="text-sm font-medium w-20 shrink-0 truncate">
                      {employeeNames.get(leave.employeeId) ?? leave.employeeId}
                    </div>
                    <div className="text-sm text-gray-600 w-24 shrink-0">
                      {leave.date.replace(/-/g, '/')} 代休
                    </div>
                    {sources.length === 0 ? (
                      <span className="text-xs text-gray-400 flex-1 italic">利用可能な勤務元なし</span>
                    ) : (
                      <>
                        <select
                          className="flex-1 text-xs border border-gray-300 rounded px-1.5 py-1 min-w-0"
                          value={selections[leave.assignmentId] ?? ''}
                          onChange={e =>
                            setSelections(prev => ({ ...prev, [leave.assignmentId]: e.target.value }))
                          }
                          disabled={isWorking}
                        >
                          <option value="">-- 勤務元を選択 --</option>
                          {sources.map(({ a, remaining }) => (
                            <option key={a.assignmentId} value={a.assignmentId}>
                              {sourceLabel(a)}（残{remaining}枠）
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleLink(leave.assignmentId)}
                          disabled={!selections[leave.assignmentId] || isWorking}
                          className="text-xs px-3 py-1.5 rounded bg-blue-600 text-white
                                     hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                        >
                          {isWorking ? '…' : 'リンク'}
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 残枠あり勤務元一覧 */}
        <details className="border border-gray-200 rounded group">
          <summary className="px-3 py-2 text-sm font-semibold text-gray-700 cursor-pointer
                              hover:bg-gray-50 select-none list-none flex items-center gap-1">
            <span className="text-gray-400 group-open:rotate-90 transition-transform inline-block">▶</span>
            <span>
              リンクなし勤務元（残枠あり）
              {sourcesAll.length > 0 && (
                <span className="ml-1 text-xs font-normal text-gray-500">（{sourcesAll.length}件）</span>
              )}
            </span>
          </summary>
          <div className="border-t border-gray-200 divide-y max-h-48 overflow-y-auto">
            {sourcesAll.length === 0 ? (
              <p className="text-sm text-gray-400 px-3 py-2">リンク可能な勤務元はありません</p>
            ) : (
              sourcesAll.map(({ a, cap, remaining }) => (
                <div key={a.assignmentId} className="flex items-center gap-2 px-3 py-2">
                  <div className="text-sm font-medium w-20 shrink-0 truncate">
                    {employeeNames.get(a.employeeId) ?? a.employeeId}
                  </div>
                  <div className="text-sm text-gray-600 flex-1">{sourceLabel(a)}</div>
                  <span className="text-xs text-orange-600 font-medium shrink-0">
                    {remaining}/{cap}枠残
                  </span>
                </div>
              ))
            )}
          </div>
        </details>

        <div className="flex justify-end pt-1">
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            閉じる
          </button>
        </div>
      </div>
    </Modal>
  );
}
