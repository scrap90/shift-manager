import { Modal } from './Modal';

interface Props {
  warnings: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function SoftRuleDialog({ warnings, onConfirm, onCancel }: Props) {
  return (
    <Modal title="⚠️ 配置前の確認" variant="warning">
      <p className="text-gray-600 mb-3 text-sm">以下の注意事項があります。配置を続けますか？</p>
      <ul className="list-disc list-inside space-y-1 mb-5">
        {warnings.map((w, i) => (
          <li key={i} className="text-gray-700 text-sm">{w}</li>
        ))}
      </ul>
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="bg-gray-200 text-gray-700 px-5 py-2 rounded-lg hover:bg-gray-300 font-medium"
          autoFocus
        >
          キャンセル
        </button>
        <button
          onClick={onConfirm}
          className="bg-orange-500 text-white px-5 py-2 rounded-lg hover:bg-orange-600 font-medium"
        >
          配置する →
        </button>
      </div>
    </Modal>
  );
}
