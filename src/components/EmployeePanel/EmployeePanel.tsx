import { useMemo, useState } from 'react';
import { EmployeeCard } from './EmployeeCard';
import { useStore } from '../../store/useStore';
import type { EmployeeCounts } from '../../types';

export function EmployeePanel() {
  const { employees, assignments, settings, focusedEmployeeId, setFocusedEmployee, isHoliday } = useStore();
  const calcBalance = useStore(s => s.calcBalance);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('name');

  const active = employees.filter(e => e.isActive);

  const calcCounts = (empId: string): EmployeeCounts => {
    const { aggregationStartDate, aggregationEndDate } = settings;
    const r = assignments.filter(a =>
      a.employeeId === empId && a.date >= aggregationStartDate && a.date <= aggregationEndDate
    );
    return {
      day: {
        weekday:    r.filter(a => a.dutyType === 'day' && a.dutySubtype === '平日昼間当番').length,
        holidayEve: r.filter(a => a.dutyType === 'day' && a.dutySubtype === '休日前昼間当番').length,
        holiday:    r.filter(a => a.dutyType === 'day' && a.dutySubtype === '休日昼間当番').length,
        total:      r.filter(a => a.dutyType === 'day').length,
        provisional: r.filter(a => a.dutyType === 'day' && a.status === 'provisional').length,
      },
      night: {
        weekday:    r.filter(a => a.dutyType === 'night' && a.dutySubtype === '平日夜間当番').length,
        weekendEve: r.filter(a => a.dutyType === 'night' && a.dutySubtype === '週末前夜間当番').length,
        holidayEve: r.filter(a => a.dutyType === 'night' && a.dutySubtype === '休日前夜間当番').length,
        holiday:    r.filter(a => a.dutyType === 'night' && a.dutySubtype === '休日夜間当番').length,
        total:      r.filter(a => a.dutyType === 'night').length,
        provisional: r.filter(a => a.dutyType === 'night' && a.status === 'provisional').length,
      },
      holidayWork:            r.filter(a => a.dutyType === 'holiday_work').length,
      holidayWorkProvisional: r.filter(a => a.dutyType === 'holiday_work' && a.status === 'provisional').length,
      substituteLeave:        r.filter(a => a.dutyType === 'substitute_leave').length,
      vacation:               r.filter(a => a.dutyType === 'vacation').length,
      shiftWork:              r.filter(a => a.dutyType === 'shift_work').length,
      shiftWorkWithLeave:     r.filter(a => a.dutyType === 'shift_work' && a.dutySubtype.includes('（代休あり）')).length,
      carryOverBalance:       calcBalance(empId),
    };
  };

  const filtered = useMemo(() => {
    let list = active.filter(e => e.name.includes(search));
    if (sortKey === 'dayAsc')      list = [...list].sort((a, b) => calcCounts(a.employeeId).day.total - calcCounts(b.employeeId).day.total);
    else if (sortKey === 'nightAsc') list = [...list].sort((a, b) => calcCounts(a.employeeId).night.total - calcCounts(b.employeeId).night.total);
    else if (sortKey === 'balDesc') list = [...list].sort((a, b) => calcCounts(b.employeeId).carryOverBalance - calcCounts(a.employeeId).carryOverBalance);
    else list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, search, sortKey, assignments, isHoliday]);

  return (
    <div className="w-72 border-l border-slate-200 flex flex-col bg-slate-50" style={{ minWidth: 240 }}>

      {/* コントロールバー */}
      <div className="px-3 py-2.5 border-b border-slate-200 space-y-2 bg-white shadow-sm">
        {/* パネルタイトル + 人数 */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 tracking-widest uppercase">Staff</span>
          <span className="text-[11px] text-slate-400">{filtered.length}名</span>
        </div>

        {/* ソート選択 */}
        <div className="relative">
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                 className="text-slate-400">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="6" y1="12" x2="18" y2="12"/>
              <line x1="9" y1="18" x2="15" y2="18"/>
            </svg>
          </div>
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-lg
                       pl-7 pr-7 py-1.5 bg-white text-slate-700
                       focus:outline-none focus:ring-2 focus:ring-indigo-300
                       focus:border-indigo-400 transition-shadow appearance-none cursor-pointer"
          >
            <option value="name">氏名順</option>
            <option value="dayAsc">昼間当番が少ない順</option>
            <option value="nightAsc">夜間当番が少ない順</option>
            <option value="balDesc">代休残数が多い順</option>
          </select>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                 className="text-slate-400">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        {/* 検索フィールド */}
        <div className="relative">
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                 className="text-slate-400">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <input
            type="text"
            placeholder="氏名で絞り込み"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-lg
                       pl-7 pr-6 py-1.5 bg-white text-slate-700
                       placeholder:text-slate-400
                       focus:outline-none focus:ring-2 focus:ring-indigo-300
                       focus:border-indigo-400 transition-shadow"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2
                         text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* スタッフリスト */}
      <div className="flex-1 overflow-y-auto p-2.5">
        {filtered.map(emp => (
          <EmployeeCard
            key={emp.employeeId}
            employee={emp}
            counts={calcCounts(emp.employeeId)}
            isFocused={focusedEmployeeId === emp.employeeId}
            onFocus={() =>
              setFocusedEmployee(focusedEmployeeId === emp.employeeId ? null : emp.employeeId)
            }
          />
        ))}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                 className="text-slate-300 mb-2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <p className="text-xs text-slate-400">
              {search ? `「${search}」に一致するスタッフが見つかりません` : 'スタッフが登録されていません'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
