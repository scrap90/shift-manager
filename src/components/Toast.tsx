import { useStore } from '../store/useStore';

export function ToastContainer() {
  const { toasts, removeToast, undo } = useStore();

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
      {toasts.map(t => (
        <div key={t.id} className="bg-gray-800 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-64">
          <span className="flex-1 text-sm">{t.message}</span>
          {t.undoItem && (
            <button
              onClick={() => { undo(); removeToast(t.id); }}
              className="text-blue-300 hover:text-blue-100 text-sm font-medium"
            >
              元に戻す
            </button>
          )}
          <button onClick={() => removeToast(t.id)} className="text-gray-400 hover:text-white ml-1">✕</button>
        </div>
      ))}
    </div>
  );
}
