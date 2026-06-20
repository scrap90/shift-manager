import { useState } from 'react';
import { Modal } from './Modal';
import type { ShiftAssignment, DutyType } from '../../types';

const DUTY_LABELS: Partial<Record<DutyType, string>> = {
  holiday_work: '休日勤務',
  day: '昼間当番（休日）',
  night: '夜間当番（休日）',
  shift_work: 'シフト勤務',
};

interface Props {
  employeeId: string;
  employeeName: string;
  assignments: ShiftAssignment[];
  newAssignmentDate: string;
  newAssignmentType: DutyType;
  newAssignmentSubtype?: string;
  /** 複数リンク時: 現在何枠目か（1-based） */
  linkIndex?: number;
  /** 複数リンク時: 合計枠数 */
  totalLinks?: number;
  onConfirm: (substituteLeaveAssignmentId: string | null) => void;
  onCancel: () => void;
}

export function ReverseLinkDialog({
  employeeId,
  employeeName,
  assignments,
  newAssignmentDate,
  newAssignmentType,
  newAssignmentSubtype,
  linkIndex = 1,
  totalLinks = 1,
  onConfirm,
  onCancel,
}: Props) {
  const unlinkedLeaves = assignments
    .filter(a =>
      a.employeeId === employeeId &&
      a.dutyType === 'substitute_leave' &&
      !a.linkedSourceId
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  const [selected, setSelected] = useState<string>(
    unlinkedLeaves.length > 0 ? unlinkedLeaves[0].assignmentId : 'none'
  );

  const newLabel =
    newAssignmentType === 'shift_work' && newAssignmentSubtype
      ? `シフト勤務（${newAssignmentSubtype}）`
      : (DUTY_LABELS[newAssignmentType] ?? newAssignmentType);

  const isMulti = totalLinks > 1;
  const title = isMulti
    ? `代休のリンク設定（${linkIndex}/${totalLinks}枠目）`
    : '代休のリンク設定';

  return (
    <Modal title={title} onClose={onCancel} variant="warning">
      <div className="space-y-4">
        {isMulti && (
          <div className="flex gap-1 mb-1">
            {Array.from({ length: totalLinks }, (_, i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full ${i < linkIndex ? 'bg-orange-400' : 'bg-gray-200'}`}
              />
            ))}
          </div>
        )}

        <p className="text-sm text-gray-700">
          代休残数がマイナスの状態で{' '}
          <span className="font-medium">
            {newAssignmentDate.replace(/-/g, '/')} {newLabel}
          </span>{' '}
          を設置しました。
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-medium">{employeeName}</span>{' '}
          のリンクなし代休から、この勤務でカバーする代休を選択してください。
          {isMulti && (
            <span className="text-orange-600 font-medium">
              （{linkIndex}枠目 / 全{totalLinks}枠）
            </span>
          )}
        </p>

        <div className="border border-gray-200 rounded divide-y divide-gray-100 max-h-[40vh] overflow-y-auto">
          {unlinkedLeaves.map(a => (
            <label
              key={a.assignmentId}
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-blue-50"
            >
              <input
                type="radio"
                name="leaveTarget"
                value={a.assignmentId}
                checked={selected === a.assignmentId}
                onChange={() => setSelected(a.assignmentId)}
                className="accent-blue-600"
              />
              <span className="text-sm">{a.date.replace(/-/g, '/')}　代休</span>
            </label>
          ))}

          {unlinkedLeaves.length === 0 && (
            <p className="text-xs text-gray-400 py-3 text-center">
              リンクなしの代休がありません
            </p>
          )}

          <label className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-blue-50">
            <input
              type="radio"
              name="leaveTarget"
              value="none"
              checked={selected === 'none'}
              onChange={() => setSelected('none')}
              className="accent-blue-600"
            />
            <span className="text-sm text-gray-500">リンクしない</span>
          </label>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onConfirm(selected === 'none' ? null : selected)}
            className="flex-1 bg-blue-600 text-white text-sm py-2 rounded hover:bg-blue-700"
          >
            {isMulti && linkIndex < totalLinks ? `設定して次へ（${linkIndex + 1}枠目へ）` : '設定'}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-100 text-gray-700 text-sm py-2 rounded hover:bg-gray-200"
          >
            スキップ
          </button>
        </div>
      </div>
    </Modal>
  );
}
