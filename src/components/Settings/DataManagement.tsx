import { useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import type { Employee, CalendarHoliday, ShiftAssignment, NightDutyBlock, AppSettings } from '../../types';

// ── バックアップファイルの型定義 ──────────────────────
interface SettingsBackup {
  type: 'settings';
  version: 1;
  exportedAt: string;
  employees: Employee[];
  calendarHolidays: CalendarHoliday[];
  settings: AppSettings;
}

interface ShiftBackup {
  type: 'shifts';
  version: 1;
  exportedAt: string;
  assignments: ShiftAssignment[];
  nightDutyBlocks: NightDutyBlock[];
}

// ── ユーティリティ ─────────────────────────────────────
function downloadJson(data: object, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function readJsonFile(file: File): Promise<unknown> {
  const text = await file.text();
  return JSON.parse(text);
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isSettingsBackup(data: unknown): data is SettingsBackup {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return d.type === 'settings' && d.version === 1
    && Array.isArray(d.employees)
    && Array.isArray(d.calendarHolidays)
    && typeof d.settings === 'object' && d.settings !== null;
}

function isShiftBackup(data: unknown): data is ShiftBackup {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return d.type === 'shifts' && d.version === 1
    && Array.isArray(d.assignments)
    && Array.isArray(d.nightDutyBlocks);
}

// ── セクション共通コンポーネント ─────────────────────
interface SectionProps {
  icon: string;
  title: string;
  description: string;
  warning?: string;
  onExport: () => void;
  onImport: (file: File) => Promise<void>;
  status: { type: 'success' | 'error'; message: string } | null;
  exporting?: boolean;
  importing?: boolean;
}

function BackupSection({ icon, title, description, warning, onExport, onImport, status, exporting, importing }: SectionProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<File | null>(null);
  const [confirming, setConfirming] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPending(file);
    setConfirming(true);
  };

  const handleConfirm = async () => {
    if (!pending) return;
    setConfirming(false);
    await onImport(pending);
    setPending(null);
  };

  const handleCancel = () => {
    setPending(null);
    setConfirming(false);
  };

  return (
    <div className="border rounded-xl p-4 bg-white space-y-3">
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-800">{title}</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
          {warning && (
            <div className="mt-2 flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
              <span className="text-amber-500 shrink-0 text-xs mt-0.5">⚠</span>
              <p className="text-xs text-amber-700 leading-relaxed">{warning}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onExport}
          disabled={!!exporting}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                     border border-indigo-300 text-indigo-600 text-sm font-medium
                     hover:bg-indigo-50 disabled:opacity-50 transition-colors"
        >
          <span>📥</span> エクスポート
        </button>
        <input ref={fileRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={!!importing || confirming}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                     border border-slate-300 text-slate-600 text-sm font-medium
                     hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          <span>📤</span> インポート
        </button>
      </div>

      {/* インポート確認ダイアログ */}
      {confirming && pending && (
        <div className="border border-amber-300 bg-amber-50 rounded-lg p-3 space-y-2">
          <p className="text-sm font-semibold text-amber-800">インポート確認</p>
          <p className="text-xs text-amber-700">
            「{pending.name}」を読み込みます。<br />
            <strong>既存のデータは上書きされます。</strong>よろしいですか？
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              className="flex-1 py-1.5 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 font-medium"
            >
              上書きして読み込む
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 py-1.5 border border-slate-300 text-slate-600 text-sm rounded-lg hover:bg-slate-50"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* 結果表示 */}
      {status && (
        <div className={`rounded-lg px-3 py-2 text-xs font-medium
          ${status.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700'
                                      : 'bg-red-50 border border-red-200 text-red-600'}`}>
          {status.type === 'success' ? '✅ ' : '❌ '}{status.message}
        </div>
      )}
    </div>
  );
}

// ── メインコンポーネント ───────────────────────────────
export function DataManagement() {
  const store = useStore();
  const [settingsStatus, setSettingsStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [shiftStatus, setShiftStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ── 設定データ エクスポート ──
  const handleExportSettings = () => {
    const backup: SettingsBackup = {
      type: 'settings',
      version: 1,
      exportedAt: new Date().toISOString(),
      employees: store.employees,
      calendarHolidays: store.calendarHolidays,
      settings: store.settings,
    };
    downloadJson(backup, `shift-manager-settings-${todayStr()}.json`);
    setSettingsStatus({ type: 'success', message: `エクスポート完了（社員 ${store.employees.length}名、社内休日 ${store.calendarHolidays.length}件）` });
    setTimeout(() => setSettingsStatus(null), 4000);
  };

  // ── 設定データ インポート ──
  const handleImportSettings = async (file: File) => {
    setSettingsStatus(null);
    let data: unknown;
    try {
      data = await readJsonFile(file);
    } catch {
      setSettingsStatus({ type: 'error', message: 'JSONファイルの読み込みに失敗しました' });
      return;
    }
    if (!isSettingsBackup(data)) {
      setSettingsStatus({ type: 'error', message: '設定バックアップファイルの形式が正しくありません（type: "settings", version: 1 が必要です）' });
      return;
    }
    try {
      await store.importSettingsBackup(data.employees, data.calendarHolidays, data.settings);
      setSettingsStatus({ type: 'success', message: `読み込み完了（社員 ${data.employees.length}名、社内休日 ${data.calendarHolidays.length}件）` });
    } catch (e) {
      setSettingsStatus({ type: 'error', message: `インポートに失敗しました: ${String(e)}` });
    }
    setTimeout(() => setSettingsStatus(null), 5000);
  };

  // ── シフト案件 エクスポート ──
  const handleExportShifts = () => {
    const backup: ShiftBackup = {
      type: 'shifts',
      version: 1,
      exportedAt: new Date().toISOString(),
      assignments: store.assignments,
      nightDutyBlocks: store.nightDutyBlocks,
    };
    downloadJson(backup, `shift-manager-shifts-${todayStr()}.json`);
    setShiftStatus({ type: 'success', message: `エクスポート完了（案件 ${store.assignments.length}件）` });
    setTimeout(() => setShiftStatus(null), 4000);
  };

  // ── シフト案件 インポート ──
  const handleImportShifts = async (file: File) => {
    setShiftStatus(null);
    let data: unknown;
    try {
      data = await readJsonFile(file);
    } catch {
      setShiftStatus({ type: 'error', message: 'JSONファイルの読み込みに失敗しました' });
      return;
    }
    if (!isShiftBackup(data)) {
      setShiftStatus({ type: 'error', message: 'シフトバックアップファイルの形式が正しくありません（type: "shifts", version: 1 が必要です）' });
      return;
    }
    try {
      await store.importShiftBackup(data.assignments, data.nightDutyBlocks);
      setShiftStatus({ type: 'success', message: `読み込み完了（案件 ${data.assignments.length}件）` });
    } catch (e) {
      setShiftStatus({ type: 'error', message: `インポートに失敗しました: ${String(e)}` });
    }
    setTimeout(() => setShiftStatus(null), 5000);
  };

  return (
    <div className="space-y-4">
      <BackupSection
        icon="⚙️"
        title="設定データ"
        description="社員情報・社内休日・アプリ設定（テーマ・集計期間等）を JSON ファイルに保存・復元します。別のブラウザや PC への移行に使用できます。"
        onExport={handleExportSettings}
        onImport={handleImportSettings}
        status={settingsStatus}
      />
      <BackupSection
        icon="📋"
        title="シフト案件"
        description="全シフト案件・夜間当番ブロックを JSON ファイルに保存・復元します。定期的なバックアップとして活用してください。"
        warning="インポートすると既存の全シフト案件が上書きされます。事前にエクスポートで現在のデータを保存することをお勧めします。"
        onExport={handleExportShifts}
        onImport={handleImportShifts}
        status={shiftStatus}
      />
      <p className="text-[11px] text-gray-400 text-center">
        ファイルは端末内にのみ保存されます。クラウドへの送信は行いません。
      </p>
    </div>
  );
}
