import { useState } from 'react';
import { CalendarCellLane, SpecialLane } from './CalendarCellLane';
import { DayDetailModal } from '../Dialogs/DayDetailModal';
import { useStore } from '../../store/useStore';
import { DEFAULT_THEME } from '../../store/defaultTheme';
import { hexToRgba } from '../../utils/colorUtils';
import type { ShiftAssignment } from '../../types';

const DOW = ['日', '月', '火', '水', '木', '金', '土'];
const SPECIAL_DUTY_TYPES = ['holiday_work', 'substitute_leave', 'vacation', 'shift_work'] as const;

interface Props {
  date: string;
  isHoliday: boolean;
  holidayName: string;
  assignments: ShiftAssignment[];
  focusedEmployeeId: string | null;
  employeeNames: Map<string, string>;
  onRemove: (assignmentId: string) => void;
}

export function CalendarCell({
  date, isHoliday, holidayName, assignments, focusedEmployeeId, employeeNames, onRemove,
}: Props) {
  const [showMemo, setShowMemo] = useState(false);
  const [memo, setMemo] = useState('');
  const [showDetail, setShowDetail] = useState(false);

  const theme = useStore(s => s.settings.theme ?? DEFAULT_THEME);

  const d = new Date(date + 'T00:00:00');
  const dow = d.getDay();
  const dayNum = d.getDate();
  const dayLabel = DOW[dow];
  const isSun = dow === 0;
  const isSat = dow === 6;

  const headerBgColor =
    isHoliday ? theme.calHolidayHeaderBg :
    isSun     ? theme.calSundayHeaderBg :
    isSat     ? theme.calSaturdayHeaderBg :
                theme.calWeekdayHeaderBg;

  const dayNumColor =
    (isHoliday || isSun) ? theme.calSundayHolidayNumColor :
    isSat                 ? theme.calSaturdayNumColor :
                            theme.calWeekdayNumColor;

  const dowColor = hexToRgba(dayNumColor, 0.55);
  const headerBorderColor = hexToRgba(dayNumColor, 0.18);

  const byType = (t: string) => assignments.filter(a => a.date === date && a.dutyType === t);
  const specialAssignments = SPECIAL_DUTY_TYPES.flatMap(t => byType(t));

  return (
    <div className="border border-slate-200 flex flex-col min-h-28">
      {/* 日付ヘッダー */}
      <div
        style={{ backgroundColor: headerBgColor, borderBottomColor: headerBorderColor }}
        className="px-1.5 py-1 flex items-center gap-1 border-b"
      >
        <span
          style={{ color: dayNumColor }}
          className="text-sm font-bold leading-none cursor-pointer hover:underline select-none tabular-nums"
          onDoubleClick={() => setShowDetail(true)}
          title="ダブルクリックで詳細表示"
        >
          {dayNum}
        </span>
        <span style={{ color: dowColor }} className="text-[10px] font-medium leading-none">
          {dayLabel}
        </span>
        {isHoliday && (
          <span className="ml-auto text-[9px] font-medium text-violet-600
                           bg-violet-100 px-1 rounded leading-tight truncate max-w-[3.5rem]"
                title={holidayName}>
            {holidayName}
          </span>
        )}
      </div>

      {/* 3レーン */}
      <div className="flex flex-1">
        <CalendarCellLane
          date={date} dutyType="day"
          accentColor={theme.duties.day.color}
          assignments={byType('day')}
          focusedEmployeeId={focusedEmployeeId}
          employeeNames={employeeNames}
          onRemove={onRemove}
          allAssignments={assignments}
        />
        <CalendarCellLane
          date={date} dutyType="night"
          accentColor={theme.duties.night.color}
          assignments={byType('night')}
          focusedEmployeeId={focusedEmployeeId}
          employeeNames={employeeNames}
          onRemove={onRemove}
          allAssignments={assignments}
        />
        <SpecialLane
          date={date}
          assignments={specialAssignments}
          focusedEmployeeId={focusedEmployeeId}
          employeeNames={employeeNames}
          onRemove={onRemove}
          allAssignments={assignments}
        />
      </div>

      {/* メモエリア */}
      <div className="border-t border-slate-100 px-1">
        {showMemo ? (
          <textarea
            className="w-full text-[10px] resize-none p-0.5 outline-none"
            rows={2}
            value={memo}
            onChange={e => setMemo(e.target.value)}
            onBlur={() => setShowMemo(false)}
            autoFocus
            maxLength={200}
          />
        ) : (
          <div
            className="text-[10px] text-slate-400 py-0.5 truncate cursor-pointer hover:text-slate-600"
            onClick={() => setShowMemo(true)}
          >
            {memo || '+ メモ'}
          </div>
        )}
      </div>

      {showDetail && (
        <DayDetailModal
          date={date}
          assignments={assignments}
          employeeNames={employeeNames}
          onClose={() => setShowDetail(false)}
        />
      )}
    </div>
  );
}

export function EmptyCell() {
  return <div className="border border-slate-100 bg-slate-50/50 min-h-28" />;
}
