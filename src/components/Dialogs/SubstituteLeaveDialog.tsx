import { useState } from 'react';
import { Modal } from './Modal';
import type { ShiftAssignment } from '../../types';
import { useStore } from '../../store/useStore';

/** ソース勤務が生成できる代休日数（capacity）を返す */
function getSourceCapacity(a: ShiftAssignment, isHoliday: (date: string) => boolean): number {
  if (a.dutyType === 'holiday_work') return 1;
  if (a.dutyType === 'day' || a.dutyType === 'night') return 1; // 休日配置のみフィルタ済み
  if (a.dutyType === 'shift_work') {
    const parts = a.date.split('-');
    const dow = new Date(+parts[0], +parts[1] - 1, +parts[2]).getDay();
    const isOffDay = isHoliday(a.date) || dow === 0 || dow === 6;
    const hasLeave = (a.dutySubtype ?? '').includes('（代休あり）');
    // 休日 or 土日 → +1（自動）、代休あり選択 → +1（追加）
    return (isOffDay ? 1 : 0) + (hasLeave ? 1 : 0);
  }
  return 1;
}

interface Props {
  employeeId: string;
  employeeName: string;
  assignments: ShiftAssignment[];
  /** 移動時: 既存の代休が持っていた linkedSourceId を渡して初期選択に使う */
  initialLinkedSourceId?: string;
  onConfirm: (linkedSourceId: string | null) => void;
  onCancel: () => void;
}

export function SubstituteLeaveDialog({
  employeeId,
  employeeName,
  assignments,
  initialLinkedSourceId,
  onConfirm,
  onCancel,
}: Props) {
  const isHoliday = useStore(s => s.isHoliday);

  // 取得済みリンクの集計: sourceAssignmentId → [代休の日付, ...]
  // 移動元の旧リンクは集計から除外する
  const usedMap = new Map<string, string[]>();
  for (const a of assignments) {
    if (
      a.employeeId === employeeId &&
      a.dutyType === 'substitute_leave' &&
      a.linkedSourceId &&
      a.linkedSourceId !== initialLinkedSourceId
    ) {
      const list = usedMap.get(a.linkedSourceId) ?? [];
      list.push(a.date);
      usedMap.set(a.linkedSourceId, list);
    }
  }

  // 代休元として対象となる全勤務（全件表示）
  // - 休日勤務（holiday_work）
  // - 代休ありシフト勤務（shift_work + 代休あり）
  // - 休日の昼間当番 / 夜間当番（day / night on holiday）
  const allSources = assignments
    .filter(a =>
      a.employeeId === employeeId &&
      (
        a.dutyType === 'holiday_work' ||
        (a.dutyType === 'shift_work' && (a.dutySubtype ?? '').includes('（代休あり）')) ||
        ((a.dutyType === 'day' || a.dutyType === 'night') && isHoliday(a.date))
      )
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  // 残枠があるソース（capacity > 取得済み件数）
  const availableSources = allSources.filter(a => {
    const used = (usedMap.get(a.assignmentId) ?? []).length;
    return used < getSourceCapacity(a, isHoliday);
  });

  // 初期選択: 既存リンクが有効かつ残枠あり → 優先、次に先頭の利用可能ソース、なければ「リンクなし」
  const defaultSelected =
    initialLinkedSourceId && availableSources.some(s => s.assignmentId === initialLinkedSourceId)
      ? initialLinkedSourceId
      : availableSources.length > 0
      ? availableSources[0].assignmentId
      : 'none';

  const [selected, setSelected] = useState<string>(defaultSelected);

  return (
    <Modal title="代休 — 元勤務の選択" onClose={onCancel}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          <span className="font-medium">{employeeName}</span> の代休取得元となる勤務を選択してください。
          元勤務を削除すると、紐付いた代休も連動して削除されます。
        </p>

        <div className="border border-gray-200 rounded divide-y divide-gray-100 max-h-[50vh] overflow-y-auto">
          {allSources.map(a => {
            const usedDates = usedMap.get(a.assignmentId) ?? [];
            const used = usedDates.length;
            const capacity = getSourceCapacity(a, isHoliday);
            const remaining = capacity - used;
            const isFullyUsed = remaining <= 0;

            return (
              <label
                key={a.assignmentId}
                className={`flex items-center gap-2 px-3 py-2 ${
                  isFullyUsed
                    ? 'opacity-50 cursor-not-allowed bg-gray-50'
                    : 'cursor-pointer hover:bg-blue-50'
                }`}
              >
                <input
                  type="radio"
                  name="source"
                  value={a.assignmentId}
                  checked={selected === a.assignmentId}
                  onChange={() => { if (!isFullyUsed) setSelected(a.assignmentId); }}
                  disabled={isFullyUsed}
                  className="accent-blue-600"
                />
                <span className="text-sm flex-1">
                  {a.date.replace(/-/g, '/')}
                  {a.dutyType === 'holiday_work'
                    ? '　休日勤務'
                    : a.dutyType === 'day'
                    ? '　昼間当番（休日）'
                    : a.dutyType === 'night'
                    ? '　夜間当番（休日）'
                    : `　シフト勤務（${a.dutySubtype}）`}
                  {capacity >= 2 && (
                    <span className="ml-1 text-[10px] text-indigo-600 font-medium">
                      代休{capacity}日分
                    </span>
                  )}
                </span>
                {used > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap ${
                    isFullyUsed
                      ? 'bg-gray-200 text-gray-500'
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    {isFullyUsed
                      ? `取得済み（${used}件）`
                      : `${used}/${capacity}件取得済み`}
                  </span>
                )}
              </label>
            );
          })}

          {allSources.length === 0 && (
            <p className="text-xs text-gray-400 py-3 text-center">
              リンク可能な勤務がありません
            </p>
          )}

          <label className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-blue-50">
            <input
              type="radio"
              name="source"
              value="none"
              checked={selected === 'none'}
              onChange={() => setSelected('none')}
              className="accent-blue-600"
            />
            <span className="text-sm text-gray-500">
              リンクなし（先月以前の繰越し分など）
            </span>
          </label>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onConfirm(selected === 'none' ? null : selected)}
            className="flex-1 bg-blue-600 text-white text-sm py-2 rounded hover:bg-blue-700"
          >
            登録
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-100 text-gray-700 text-sm py-2 rounded hover:bg-gray-200"
          >
            キャンセル
          </button>
        </div>
      </div>
    </Modal>
  );
}
