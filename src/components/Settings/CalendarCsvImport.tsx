import { useRef, useState } from 'react';
import { useStore } from '../../store/useStore';

async function readFileText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // UTF-8 BOM (EF BB BF) → UTF-8 として読む（BOM文字U+FEFFを除去）
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return new TextDecoder('utf-8', { ignoreBOM: true }).decode(buffer);
  }

  // BOM なし → Shift-JIS (日本語Windowsのデフォルト) を試みる
  try {
    const decoded = new TextDecoder('shift-jis').decode(buffer);
    // Shift-JIS で正常にデコードできれば採用（U+FFFD 置換文字が含まれないことを確認）
    if (!decoded.includes('�')) return decoded;
  } catch {
    // Shift-JIS 非対応ブラウザはそのまま UTF-8 で
  }

  return new TextDecoder('utf-8').decode(buffer);
}

/** 行ごとにフォーマットを検証。B列は何でも許容（空欄含む）。日付形式だけ厳格チェック */
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

export function CalendarCsvImport() {
  const { importCalendarCSV } = useStore();
  const [result, setResult] = useState<{ added: number; overridden: number } | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let text: string;
    try {
      text = await readFileText(file);
    } catch (err) {
      setError('ファイルの読み込みに失敗しました。');
      e.target.value = '';
      return;
    }

    // BOM文字（UTF-8 BOM が ignoreBOM:false で残った場合）を除去
    const cleanText = text.replace(/^﻿/, '');
    const lines = cleanText.trim().split(/\r?\n/).filter(l => l.trim());

    const { ok, badLine } = validateLines(lines);
    if (!ok) {
      setError(`CSVの形式が正しくありません。\nA列は yyyy/MM/dd 形式の日付が必要です。\n問題のある値: "${badLine}"`);
      e.target.value = '';
      return;
    }

    // cleanText を渡す（BOM除去済み）
    const res = await importCalendarCSV(cleanText);
    setResult(res);
    setError('');
    e.target.value = '';
  };

  return (
    <div>
      <p className="text-sm text-gray-600 mb-2">
        A列: <code>yyyy/MM/dd</code> 形式の日付, B列: 「<strong>○</strong>」（法定祝日を出勤日扱い）または<strong>それ以外の文字</strong>（社内休日）または<strong>空欄</strong>（通常日）
      </p>
      <p className="text-xs text-gray-400 mb-3">UTF-8・Shift-JIS 両対応。Excelで作成したCSVをそのまま読み込めます。</p>
      <input ref={inputRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
      <button
        onClick={() => { setResult(null); setError(''); inputRef.current?.click(); }}
        className="w-full border-2 border-dashed border-gray-300 rounded py-4 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 mb-3"
      >
        📂 CSVファイルを選択
      </button>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-600 whitespace-pre-line mb-2">{error}</div>
      )}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-700">
          ✅ 社内休日: <strong>{result.added}</strong>件 登録 ／ 出勤日上書き（○）: <strong>{result.overridden}</strong>件
        </div>
      )}
    </div>
  );
}
