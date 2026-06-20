import { type ReactNode } from 'react';

interface Props {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  variant?: 'default' | 'danger' | 'warning';
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ title, children, onClose, variant = 'default', size = 'md' }: Props) {
  const headerColor =
    variant === 'danger' ? 'bg-red-600' :
    variant === 'warning' ? 'bg-orange-500' : 'bg-blue-600';
  const maxWidth = size === 'lg' ? 'max-w-2xl' : size === 'sm' ? 'max-w-sm' : 'max-w-lg';

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-xl shadow-2xl ${maxWidth} w-full mx-4`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`${headerColor} text-white px-6 py-4 rounded-t-xl flex items-center justify-between`}>
          <h2 className="font-bold text-lg">{title}</h2>
          {onClose && (
            <button onClick={onClose} className="text-white/80 hover:text-white text-xl">✕</button>
          )}
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
