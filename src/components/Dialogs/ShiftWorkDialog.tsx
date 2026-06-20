import { useState } from 'react';
import { Modal } from './Modal';

interface Props {
  onConfirm: (shiftType: '早出' | '遅出', earnLeave: boolean) => void;
  onCancel: () => void;
}

export function ShiftWorkDialog({ onConfirm, onCancel }: Props) {
  const [shiftType, setShiftType] = useState<'早出' | '遅出'>('早出');
  const [earnLeave, setEarnLeave] = useState(false);

  return (
    <Modal title="シフト勤務の登録" onClose={onCancel}>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">シフト区分</p>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="shiftType"
                checked={shiftType === '早出'}
                onChange={() => setShiftType('早出')}
                className="accent-blue-600"
              />
              <span className="text-sm">早出</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="shiftType"
                checked={shiftType === '遅出'}
                onChange={() => setShiftType('遅出')}
                className="accent-blue-600"
              />
              <span className="text-sm">遅出</span>
            </label>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={earnLeave}
              onChange={e => setEarnLeave(e.target.checked)}
              className="accent-blue-600 w-4 h-4"
            />
            <span className="text-sm text-gray-700">代休を取得する（代休残数 +1）</span>
          </label>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => onConfirm(shiftType, earnLeave)}
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
