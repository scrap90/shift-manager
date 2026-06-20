import { useRef, useState } from 'react';
import { useStore } from '../../store/useStore';

// ──────────────────────────────
// CSV ファイル読み込みユーティリティ
// ──────────────────────────────
async function readFileText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return new TextDecoder('utf-8', { ignoreBOM: true }).decode(buffer);
  }
  try {
    const decoded = new TextDecoder('shift-jis').decode(buffer);
    if (!decoded.includes('')) return decoded;
  } catch { /* noop */ }
  return new TextDecoder('utf-8').decode(buffer);
}

function validateLines(lines: string[]): { ok: boolean; badLine?: string } {
  for (const l of lines) {
    const row = l.replace(/\r$/, '').trim();
    if (!row) continue;
    const commaIdx = row.indexOf(',');
    const datePart = (commaIdx >= 0 ? row.slice(0, commaIdx) : row).trim();
    if (!/^\d{4}\/\d{2}\/\d{2}$/.test(datePart)) {
      return { ok: false, badLine: datePart };
    }
  }
  return { ok: true };
}

// ──────────────────────────────
// メインコンポーネント
// ──────────────────────────────
export function HolidaySettings() {
  const { calendarHolidays, addCalendarHoliday, removeCalendarHoliday, importCalendarCSV } = useStore();

  // 手動追加フォーム
  const [newDate, setNewDate] = useState('');
  const [newName, setNewName] = useState('');
  const [addError, setAddError] = useState('');

  // CSV インポート
  const inputRef = useRef<HTMLInputElement>(null);
  const [csvResult, setCsvResult] = useState<{ added: number; overridden: number } | null>(null);
  const [csvError, setCsvError] = useState('');

  // 社内休日（手動・CSV 登録）
  const companyHolidays = calendarHolidays
    .filter(h => h.source === 'company' && h.isHoliday)
    .sort((a, b) => a.date.localeCompare(b.date));

  // 法定祝日出勤日扱い（オーバーライド）
  const overrides = calendarHolidays
    .filter(h => h.source === 'override')
    .sort((a, b) => a.date.localeCompare(b.date));

  // ──── 手動追加 ────
  const handleAdd = async () => {
    setAddError('');
    if (!newDate) { setAddError('日付を選択してください'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) { setAddError('日付の形式が不正です'); return; }
    await addCalendarHoliday(newDate, newName.trim());
    setNewDate('');
    setNewName('');
  };

  // ──── CSV インポート ────
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    let text: string;
    try {
      text = await readFileText(file);
    } catch {
      setCsvError('ファイルの読み込みに失敗しました。');
      e.target.value = '';
      return;
    }
    const cleanText = text.replace(/^﻿/, '');
    const lines = cleanText.trim().split(/\r?\n/).filter(l => l.trim());
    const { ok, badLine } = validateLines(lines);
    if (!ok) {
      setCsvError(`CSVの形式が正しくありません。\nA列は yyyy/MM/dd 形式の日付が必要です。\n問題のある値: "${badLine}"`);
      e.target.value = '';
      return;
    }
    const res = await importCalendarCSV(cleanText);
    setCsvResult(res);
    setCsvError('');
    e.target.value = '';
  };

  // 日付を表示用にフォーマット
  const fmt = (d: string) => d.replace(/-/g, '/');

  return (
    <div className="space-y-5">

      {/* ─── 手動追加フォーム ─── */}
      <section>
        <p className="text-sm font-semibold text-gray-700 mb-2">社内休日を追加</p>
        <div className="flex gap-2 items-end flex-wrap">
          <div>
            <label className="block text-[10px] text-gray-500 mb-0.5">日付</label>
            <input
              type="date"
              value={newDate}
              onChange={e => { setNewDate(e.target.value); setAddError(''); }}
              className="border rounded px-2 py-1 text-sm"
            />
          </div>
          <div className="flex-1 min-w-32">
            <label className="block text-[10px] text-gray-500 mb-0.5">名称（省略可）</label>
            <input
              type="text"
              placeholder="例: 創立記念日"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>
          <button
            onClick={handleAdd}
            className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 shrink-0"
          >
            追加
          </button>
        </div>
        {addError && <p className="text-xs text-red-500 mt-1">{addError}</p>}
      </section>

      {/* ─── 登録済み社内休日一覧 ─── */}
      <section>
        <p className="text-sm font-semibold text-gray-700 mb-1">
          登録済み社内休日
          <span className="ml-2 text-xs font-normal text-gray-400">（{companyHolidays.length}件）</span>
        </p>
        {companyHolidays.length === 0 ? (
          <p className="text-xs text-gray-400 py-3 text-center border rounded bg-gray-50">
            登録されている社内休日はありません
          </p>
        ) : (
          <div className="border rounded divide-y max-h-52 overflow-y-auto">
            {companyHolidays.map(h => (
              <div key={h.id} className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-gray-50">
                <span className="text-sm font-mono text-gray-600 shrink-0">{fmt(h.date)}</span>
                <span className="flex-1 text-sm text-gray-700 truncate">{h.holidayName || '社内休日'}</span>
                <button
                  onClick={() => removeCalendarHoliday(h.date)}
                  className="text-red-400 text-xs hover:text-red-600 hover:underline shrink-0"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── 法定祝日 出勤日上書き一覧 ─── */}
      {overrides.length > 0 && (
        <section>
          <p className="text-sm font-semibold text-gray-700 mb-1">
            法定祝日 → 出勤日扱い
            <span className="ml-2 text-xs font-normal text-gray-400">（CSVで「○」設定）</span>
          </p>
          <div className="border rounded divide-y max-h-32 overflow-y-auto">
            {overrides.map(h => (
              <div key={h.id} className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 hover:bg-orange-100">
                <span className="text-sm font-mono text-orange-700 shrink-0">{fmt(h.date)}</span>
                <span className="flex-1 text-xs text-orange-600">法定祝日を出勤日として扱う</span>
                <button
                  onClick={() => removeCalendarHoliday(h.date)}
                  className="text-red-400 text-xs hover:text-red-600 hover:underline shrink-0"
                >
                  解除
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── CSV 一括インポート ─── */}
      <section className="border-t pt-4">
        <p className="text-sm font-semibold text-gray-700 mb-1">CSVで一括インポート</p>
        <p className="text-xs text-gray-500 mb-1">
          A列: <code>yyyy/MM/dd</code> 形式の日付, B列:「<strong>○</strong>」= 法定祝日を出勤日扱い ／ それ以外の文字 = 社内休日 ／ 空欄 = 通常日
        </p>
        <p className="text-xs text-gray-400 mb-2">UTF-8・Shift-JIS 両対応。Excelで作成したCSVをそのまま読み込めます。</p>
        <input ref={inputRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
        <button
          onClick={() => { setCsvResult(null); setCsvError(''); inputRef.current?.click(); }}
          className="w-full border-2 border-dashed border-gray-300 rounded py-3 text-sm text-gray-500
                     hover:border-indigo-400 hover:text-indigo-500"
        >
          📂 CSVファイルを選択
        </button>
        {csvError && (
          <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-600 whitespace-pre-line mt-2">{csvError}</div>
        )}
        {csvResult && (
          <div className="bg-green-50 border border-green-200 rounded p-2 text-sm text-green-700 mt-2">
            ✅ 社内休日: <strong>{csvResult.added}</strong>件 登録 ／ 出勤日上書き: <strong>{csvResult.overridden}</strong>件
          </div>
        )}
      </section>

    </div>
  );
}
