import { useState } from 'react';
import { Modal } from './Modal';

export interface AssistantCheckItem {
  key: string;
  date: string;
  dayLabel: string;
  employeeName: string;
  dutyLabel: string;
}

interface Props {
  items: AssistantCheckItem[];
  onConfirmAll: () => void;
  onCancel: () => void;
}

export function AssistantCheckDialog({ items, onConfirmAll, onCancel }: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set(items.map(i => i.key)));

  const toggle = (key: string) => {
    const next = new Set(checked);
    next.has(key) ? next.delete(key) : next.add(key);
    setChecked(next);
  };

  return (
    <Modal title="⚠️ 確定前の確認" variant="warning">
      <p className="text-gray-600 mb-3 text-sm">
        以下の日程でサポートがいません。チェックを外した日を除いて確定します。
      </p>
      <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3 mb-4">
        {items.map(item => (
          <label key={item.key} className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={checked.has(item.key)}
              onChange={() => toggle(item.key)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">
              {item.date.replace(/-/g, '/')}（{item.dayLabel}） {item.dutyLabel}: {item.employeeName}（補助付きOK）
            </span>
          </label>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 text-sm"
        >
          キャンセル
        </button>
        <button
          onClick={onConfirmAll}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
        >
          全て確定
        </button>
      </div>
    </Modal>
  );
}
