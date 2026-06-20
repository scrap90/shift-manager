import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { DraggableIcon } from './DraggableIcon';
import { useStore } from '../../store/useStore';
import { DEFAULT_THEME } from '../../store/defaultTheme';
import { hexToRgba } from '../../utils/colorUtils';
import type { Employee, EmployeeCounts } from '../../types';

function BalanceBadge({ balance }: { balance: number }) {
  if (balance < 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md
                       bg-rose-600 text-white text-xs font-extrabold
                       shadow-sm shadow-rose-400/40 animate-pulse shrink-0">
        {balance}日
      </span>
    );
  }
  if (balance > 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md
                       bg-orange-50 text-orange-700 text-xs font-bold
                       border border-orange-300/70 shrink-0">
        +{balance}日
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md
                     bg-slate-100 text-slate-500 text-xs border border-slate-200 shrink-0">
      ±0日
    </span>
  );
}

interface Props {
  employee: Employee;
  counts: EmployeeCounts;
  isFocused: boolean;
  onFocus: () => void;
}

export function EmployeeCard({ employee, counts, isFocused, onFocus }: Props) {
  const [expanded, setExpanded] = useState(true);
  const theme = useStore(s => s.settings.theme ?? DEFAULT_THEME);
  const canDay = employee.dayDutyClass !== 'none';
  const canNight = employee.nightDutyClass !== 'none';
  const balance = counts.carryOverBalance;

  // 折りたたみ状態でのみ名前をドラッグ可能
  const {
    attributes: nameAttrs,
    listeners: nameListeners,
    setNodeRef: nameRef,
    isDragging: nameIsDragging,
  } = useDraggable({
    id: `name__${employee.employeeId}`,
    data: { type: 'name', employeeId: employee.employeeId },
    disabled: expanded,
  });

  const dayColor = theme.duties.day.color;
  const nightColor = theme.duties.night.color;

  return (
    <div className={`rounded-xl mb-2 overflow-hidden border transition-all duration-150
                     ${isFocused
                       ? 'border-amber-400 shadow-md shadow-amber-200/50'
                       : 'border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300'
                     }`}>

      {/* カードヘッダー */}
      <div
        className={`flex items-center gap-2 px-3 py-2 cursor-pointer border-l-4 group
                    transition-colors duration-150
                    ${isFocused
                      ? 'bg-amber-50 border-l-amber-400'
                      : 'bg-slate-50 border-l-transparent hover:bg-slate-100/70 hover:border-l-slate-300'
                    }`}
        onClick={() => setExpanded(e => !e)}
      >
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          className={`text-slate-400 shrink-0 transition-transform duration-200
                      ${expanded ? 'rotate-90' : 'rotate-0'}`}
        >
          <polyline points="9 18 15 12 9 6"/>
        </svg>

        {/* 折りたたみ時のみドラッグ可能な名前 */}
        <span
          ref={nameRef}
          {...nameListeners}
          {...nameAttrs}
          className={`font-semibold text-sm flex-1 truncate select-none
                      ${isFocused ? 'text-amber-900' : 'text-slate-800'}
                      ${!expanded ? 'cursor-grab active:cursor-grabbing touch-none' : ''}
                      ${nameIsDragging ? 'opacity-40' : ''}`}
          title={!expanded ? 'ドラッグして勤務を登録' : undefined}
        >
          {/* 折りたたみ時に表示されるグリップヒント */}
          {!expanded && (
            <svg
              width="7" height="10" viewBox="0 0 7 10" fill="currentColor"
              aria-hidden="true"
              className="inline mr-1 opacity-0 group-hover:opacity-30 transition-opacity duration-150"
              style={{ pointerEvents: 'none', verticalAlign: 'middle' }}
            >
              <circle cx="1.5" cy="1.5" r="1.2"/>
              <circle cx="5.5" cy="1.5" r="1.2"/>
              <circle cx="1.5" cy="5" r="1.2"/>
              <circle cx="5.5" cy="5" r="1.2"/>
              <circle cx="1.5" cy="8.5" r="1.2"/>
              <circle cx="5.5" cy="8.5" r="1.2"/>
            </svg>
          )}
          {employee.name}
        </span>

        <BalanceBadge balance={balance} />

        <button
          onClick={e => { e.stopPropagation(); onFocus(); }}
          title={isFocused ? 'フォーカス解除' : 'このスタッフにフォーカス'}
          className={`ml-1 w-6 h-6 rounded-md flex items-center justify-center
                      transition-colors duration-100 shrink-0
                      ${isFocused
                        ? 'bg-amber-400 text-white'
                        : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="3"/>
            <line x1="12" y1="1" x2="12" y2="5"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="1" y1="12" x2="5" y2="12"/>
            <line x1="19" y1="12" x2="23" y2="12"/>
          </svg>
        </button>
      </div>

      {/* 展開パネル */}
      {expanded && (
        <div className="px-3 pb-3 pt-2 space-y-2 bg-white">

          {/* 昼間当番カウント */}
          {canDay && (
            <div className="rounded-lg overflow-hidden border border-slate-100">
              <div
                style={{ backgroundColor: hexToRgba(dayColor, 0.1), borderBottomColor: hexToRgba(dayColor, 0.2) }}
                className="px-2.5 py-1 flex items-center gap-1.5 border-b"
              >
                <div style={{ backgroundColor: dayColor }} className="w-1.5 h-1.5 rounded-full shrink-0" />
                <span style={{ color: dayColor }} className="text-[11px] font-semibold">昼間当番</span>
                {counts.day.provisional > 0 && (
                  <span className="ml-auto text-[10px] text-rose-500 font-medium">
                    仮+{counts.day.provisional}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 divide-x divide-slate-100">
                {[
                  { label: '平日', value: counts.day.weekday },
                  { label: '休前', value: counts.day.holidayEve },
                  { label: '休日', value: counts.day.holiday },
                  { label: '合計', value: counts.day.total, bold: true },
                ].map(({ label, value, bold }) => (
                  <div key={label} className="text-center py-1.5">
                    <div className="text-[9px] text-slate-400 leading-none mb-0.5">{label}</div>
                    <div
                      style={bold ? { color: dayColor } : {}}
                      className={`leading-none tabular-nums
                                  ${bold ? 'text-sm font-extrabold' : 'text-xs font-bold text-slate-700'}`}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 夜間当番カウント */}
          {canNight && (
            <div className="rounded-lg overflow-hidden border border-slate-100">
              <div
                style={{ backgroundColor: hexToRgba(nightColor, 0.1), borderBottomColor: hexToRgba(nightColor, 0.2) }}
                className="px-2.5 py-1 flex items-center gap-1.5 border-b"
              >
                <div style={{ backgroundColor: nightColor }} className="w-1.5 h-1.5 rounded-full shrink-0" />
                <span style={{ color: nightColor }} className="text-[11px] font-semibold">夜間当番</span>
                {counts.night.provisional > 0 && (
                  <span className="ml-auto text-[10px] text-rose-500 font-medium">
                    仮+{counts.night.provisional}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 divide-x divide-slate-100">
                {[
                  { label: '平日', value: counts.night.weekday },
                  { label: '週末前', value: counts.night.weekendEve },
                  { label: '休前', value: counts.night.holidayEve },
                  { label: '合計', value: counts.night.total, bold: true },
                ].map(({ label, value, bold }) => (
                  <div key={label} className="text-center py-1.5">
                    <div className="text-[9px] text-slate-400 leading-none mb-0.5">{label}</div>
                    <div
                      style={bold ? { color: nightColor } : {}}
                      className={`leading-none tabular-nums
                                  ${bold ? 'text-sm font-extrabold' : 'text-xs font-bold text-slate-700'}`}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 休日勤・休暇・シフト */}
          <div className="flex items-center gap-3 px-0.5 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400">休日勤</span>
              <span className="text-xs font-bold text-slate-700 tabular-nums">{counts.holidayWork}</span>
              {counts.holidayWorkProvisional > 0 && (
                <span className="text-[9px] text-rose-500">(仮+{counts.holidayWorkProvisional})</span>
              )}
            </div>
            {counts.vacation > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400">休暇</span>
                <span className="text-xs font-bold text-slate-700 tabular-nums">{counts.vacation}</span>
              </div>
            )}
            {counts.shiftWork > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400">シフト</span>
                <span className="text-xs font-bold text-slate-700 tabular-nums">{counts.shiftWork}</span>
                {counts.shiftWorkWithLeave > 0 && (
                  <span className="text-[9px] text-orange-600">(代休:{counts.shiftWorkWithLeave})</span>
                )}
              </div>
            )}
          </div>

          {/* ドラッグアイコン */}
          <div className="flex gap-1 flex-wrap pt-0.5">
            {canDay && <DraggableIcon employeeId={employee.employeeId} dutyType="day" count={counts.day.total} />}
            {canNight && <DraggableIcon employeeId={employee.employeeId} dutyType="night" count={counts.night.total} />}
            <DraggableIcon employeeId={employee.employeeId} dutyType="holiday_work" count={counts.holidayWork} />
            <DraggableIcon employeeId={employee.employeeId} dutyType="substitute_leave" count={balance} />
            <DraggableIcon employeeId={employee.employeeId} dutyType="vacation" count={counts.vacation} />
            <DraggableIcon employeeId={employee.employeeId} dutyType="shift_work" count={counts.shiftWork} />
          </div>
        </div>
      )}

      {/* 折りたたみ時の概要行 */}
      {!expanded && (
        <div className="px-3 py-1.5 flex items-center gap-2 bg-white border-t border-slate-100">
          {canDay && (
            <span className="text-xs text-slate-600">
              <span style={{ color: dayColor }} className="text-[10px] font-medium">昼</span>
              <span className="font-bold ml-0.5 tabular-nums">{counts.day.total}</span>
            </span>
          )}
          {canNight && (
            <span className="text-xs text-slate-600">
              <span style={{ color: nightColor }} className="text-[10px] font-medium">夜</span>
              <span className="font-bold ml-0.5 tabular-nums">{counts.night.total}</span>
            </span>
          )}
          <span className="text-xs text-slate-600">
            <span style={{ color: theme.duties.holiday_work.color }} className="text-[10px] font-medium">休勤</span>
            <span className="font-bold ml-0.5 tabular-nums">{counts.holidayWork}</span>
          </span>
          <div className="ml-auto">
            <BalanceBadge balance={balance} />
          </div>
        </div>
      )}
    </div>
  );
}
