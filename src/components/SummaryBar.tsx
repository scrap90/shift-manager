import { useStore } from '../store/useStore';
import { getDaysInMonth } from '../utils/dateUtils';

interface SummaryItemProps {
  label: string;
  filled: number;
  total: number;
  colors: { dot: string; bar: string; text: string; track: string };
}

function SummaryItem({ label, filled, total, colors }: SummaryItemProps) {
  const isComplete = filled >= total;
  const pct = total > 0 ? Math.min(100, (filled / total) * 100) : 100;

  return (
    <div className="flex items-center gap-2.5 py-1">
      <div className={`w-2 h-2 rounded-full shrink-0 ${isComplete ? colors.dot : 'bg-rose-400'}`} />
      <span className="text-xs font-medium text-slate-500 w-10 shrink-0">{label}</span>
      <div className="flex items-baseline gap-0.5">
        <span className={`text-sm font-bold tabular-nums leading-none
                          ${isComplete ? colors.text : 'text-rose-600'}`}>
          {filled}
        </span>
        <span className="text-[11px] text-slate-400 leading-none">/{total}</span>
      </div>
      <div className={`w-20 h-1.5 rounded-full overflow-hidden ${colors.track}`}>
        <div
          className={`h-full rounded-full transition-all duration-300
                      ${isComplete ? colors.bar : 'bg-rose-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface Props { year: number; month: number }

export function SummaryBar({ year, month }: Props) {
  const { assignments, isHoliday } = useStore();
  const days = getDaysInMonth(year, month);

  let dayFilled = 0, nightFilled = 0, holWorkFilled = 0, holTotal = 0, missing = 0;

  for (const date of days) {
    const isHol = isHoliday(date);
    const dayA   = assignments.filter(a => a.date === date && a.dutyType === 'day').length;
    const nightA  = assignments.filter(a => a.date === date && a.dutyType === 'night').length;
    const holA    = isHol ? assignments.filter(a => a.date === date && a.dutyType === 'holiday_work').length : 1;

    if (dayA > 0) dayFilled++;
    if (nightA > 0) nightFilled++;
    if (isHol) { holTotal++; if (holA > 0) holWorkFilled++; }
    if (dayA === 0 || nightA === 0 || (isHol && holA === 0)) missing++;
  }

  const total = days.length;

  return (
    <div className="bg-white border-b border-slate-200 px-4 flex items-center gap-0 flex-shrink-0 shadow-sm"
         style={{ height: 42 }}>

      <SummaryItem
        label="昼間"
        filled={dayFilled}
        total={total}
        colors={{ dot: 'bg-amber-400', bar: 'bg-amber-400', text: 'text-amber-700', track: 'bg-amber-100' }}
      />

      <div className="w-px h-5 bg-slate-200 mx-3 shrink-0" />

      <SummaryItem
        label="夜間"
        filled={nightFilled}
        total={total}
        colors={{ dot: 'bg-indigo-500', bar: 'bg-indigo-500', text: 'text-indigo-700', track: 'bg-indigo-100' }}
      />

      {holTotal > 0 && (
        <>
          <div className="w-px h-5 bg-slate-200 mx-3 shrink-0" />
          <SummaryItem
            label="休日勤"
            filled={holWorkFilled}
            total={holTotal}
            colors={{ dot: 'bg-violet-500', bar: 'bg-violet-500', text: 'text-violet-700', track: 'bg-violet-100' }}
          />
        </>
      )}

      <div className="flex-1" />

      {missing > 0 ? (
        <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-rose-50 border border-rose-200">
          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
          <span className="text-xs font-semibold text-rose-700">未配置 {missing}日</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-50 border border-emerald-200">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
               className="text-emerald-600 shrink-0">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span className="text-xs font-semibold text-emerald-700">全日程配置済み</span>
        </div>
      )}
    </div>
  );
}
