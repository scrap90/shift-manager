import { Modal } from './Modal';

interface Props {
  message: string;
  onClose: () => void;
}

export function HardBlockDialog({ message, onClose }: Props) {
  return (
    <Modal title="🚫 配置できません" onClose={onClose} variant="danger">
      <p className="text-gray-700 mb-5">{message}</p>
      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
        >
          OK
        </button>
      </div>
    </Modal>
  );
}
