import { useState, useRef } from 'react';
import { useStore } from '../../store/useStore';
import type { Employee, DayDutyClass, NightDutyClass } from '../../types';

const EMPTY: Omit<Employee, 'id'> = {
  employeeId: '', name: '', address: '',
  dayDutyClass: 'solo', nightDutyClass: 'solo',
  isActive: true, carryOverBalance: 0,
};
const CLASS_LABEL: Record<string, string> = { none: '不可', assisted: '補助付きOK', solo: '単独OK' };

// 繰越残数のインライン編集セル
function BalanceCell({ employee }: { employee: Employee }) {
  const { saveEmployee } = useStore();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(employee.carryOverBalance));
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setValue(String(employee.carryOverBalance));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commit = async () => {
    const n = parseInt(value, 10);
    const newVal = isNaN(n) ? employee.carryOverBalance : n;
    setEditing(false);
    if (newVal !== employee.carryOverBalance) {
      await saveEmployee({ ...employee, carryOverBalance: newVal });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') { setValue(String(employee.carryOverBalance)); setEditing(false); }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className="w-14 border border-blue-400 rounded px-1 py-0.5 text-xs text-center
                   focus:outline-none focus:ring-1 focus:ring-blue-400"
        style={{ MozAppearance: 'textfield' }}
      />
    );
  }

  const n = employee.carryOverBalance;
  return (
    <button
      onClick={startEdit}
      title="クリックして繰越残数を編集"
      className="group flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-blue-50
                 border border-transparent hover:border-blue-200 transition-colors"
    >
      <span className={`text-xs font-bold tabular-nums
                        ${n < 0 ? 'text-rose-600' : n > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
        {n > 0 ? `+${n}` : n}日
      </span>
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
           className="text-slate-300 group-hover:text-blue-400 transition-colors shrink-0">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    </button>
  );
}

export function EmployeeManager() {
  const { employees, saveEmployee, deactivateEmployee } = useStore();
  const [editing, setEditing] = useState<(Omit<Employee, 'id'> & { id?: number }) | null>(null);
  const [error, setError] = useState('');

  const active = employees.filter(e => e.isActive);

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name.trim()) { setError('氏名を入力してください'); return; }
    if (!/^\d{4}$/.test(editing.employeeId)) { setError('社員番号は4桁の整数で入力してください'); return; }
    const dup = employees.find(e => e.employeeId === editing.employeeId && e.id !== editing.id);
    if (dup) { setError('この社員番号はすでに使用されています'); return; }
    await saveEmployee(editing);
    setEditing(null);
    setError('');
  };

  return (
    <div>
      {/* 社員一覧 */}
      <div className="space-y-1.5 max-h-60 overflow-y-auto mb-3">
        {active.map(e => (
          <div key={e.id} className="flex items-center gap-2 border rounded px-3 py-1.5 text-sm bg-white">
            <span className="w-12 text-gray-400 text-xs shrink-0">{e.employeeId}</span>
            <span className="flex-1 font-medium text-sm truncate">{e.name}</span>
            <span className="text-[10px] text-gray-400 shrink-0">
              昼:{CLASS_LABEL[e.dayDutyClass]} 夜:{CLASS_LABEL[e.nightDutyClass]}
            </span>
            {/* 繰越残数インライン編集 */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-gray-400">繰越</span>
              <BalanceCell employee={e} />
            </div>
            <button
              onClick={() => { setEditing({ ...e }); setError(''); }}
              className="text-blue-500 text-xs hover:underline shrink-0"
            >
              編集
            </button>
            <button
              onClick={() => { if (confirm(`${e.name}さんを無効化しますか？`)) deactivateEmployee(e.id!); }}
              className="text-red-400 text-xs hover:underline shrink-0"
            >
              無効化
            </button>
          </div>
        ))}
        {active.length === 0 && <p className="text-xs text-gray-400 text-center">社員が登録されていません</p>}
      </div>

      {/* 凡例 */}
      <p className="text-[10px] text-gray-400 mb-3">
        ※ 「繰越」の数字をクリックすると代休繰越残数を直接編集できます（過去分の調整用）
      </p>

      {/* 社員編集フォーム */}
      {editing ? (
        <div className="border rounded p-3 bg-gray-50 space-y-2">
          <p className="text-sm font-bold">{editing.id ? '社員編集' : '社員追加'}</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">社員番号（4桁）</label>
              <input className="w-full border rounded px-2 py-1 text-sm" value={editing.employeeId}
                onChange={e => setEditing({ ...editing, employeeId: e.target.value })} maxLength={4} />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">氏名</label>
              <input className="w-full border rounded px-2 py-1 text-sm" value={editing.name}
                onChange={e => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">住所（市区町村）</label>
              <input className="w-full border rounded px-2 py-1 text-sm" value={editing.address}
                onChange={e => setEditing({ ...editing, address: e.target.value })} />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">
                代休繰越残数（調整値）
                <span className="ml-1 text-gray-400 font-normal">過去分の繰越や修正に使用</span>
              </label>
              <input type="number" className="w-full border rounded px-2 py-1 text-sm"
                value={editing.carryOverBalance}
                onChange={e => setEditing({ ...editing, carryOverBalance: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">昼間当番区分</label>
              <select className="w-full border rounded px-2 py-1 text-sm" value={editing.dayDutyClass}
                onChange={e => setEditing({ ...editing, dayDutyClass: e.target.value as DayDutyClass })}>
                <option value="none">不可</option>
                <option value="assisted">補助付きOK</option>
                <option value="solo">単独OK</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">夜間当番区分</label>
              <select className="w-full border rounded px-2 py-1 text-sm" value={editing.nightDutyClass}
                onChange={e => setEditing({ ...editing, nightDutyClass: e.target.value as NightDutyClass })}>
                <option value="none">不可</option>
                <option value="assisted">補助付きOK</option>
                <option value="solo">単独OK</option>
              </select>
            </div>
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => { setEditing(null); setError(''); }} className="border px-3 py-1 rounded text-sm">キャンセル</button>
            <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-1 rounded text-sm hover:bg-blue-700">保存</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => { setEditing({ ...EMPTY }); setError(''); }}
          className="w-full border-2 border-dashed border-gray-300 rounded py-2 text-xs text-gray-500 hover:border-blue-400 hover:text-blue-500"
        >
          ＋ 社員を追加
        </button>
      )}
    </div>
  );
}
