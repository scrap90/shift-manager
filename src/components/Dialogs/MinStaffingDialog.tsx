import { Modal } from './Modal';
import { getWeekDayLabel } from '../../utils/dateUtils';

interface Props {
  dates: string[];
  onClose: () => void;
}

export function MinStaffingDialog({ dates, onClose }: Props) {
  return (
    <Modal title="🚫 配置不足" onClose={onClose} variant="danger">
      <p className="text-gray-700 mb-3 text-sm">
        以下の日付に必要な当番が配置されていません。確定できません。
      </p>
      <ul className="list-disc list-inside space-y-1 max-h-48 overflow-y-auto mb-4">
        {dates.map(d => (
          <li key={d} className="text-sm text-red-600">
            {d.replace(/-/g, '/')}（{getWeekDayLabel(d)}）
          </li>
        ))}
      </ul>
      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="bg-gray-600 text-white px-5 py-2 rounded-lg hover:bg-gray-700 text-sm"
        >
          閉じる
        </button>
      </div>
    </Modal>
  );
}
