import { CalendarCell, EmptyCell } from './CalendarCell';
import { getCalendarGrid } from '../../utils/dateUtils';
import { useStore } from '../../store/useStore';
import { DEFAULT_THEME } from '../../store/defaultTheme';
import type { ShiftAssignment } from '../../types';

const MON_HEADERS = ['月', '火', '水', '木', '金', '土', '日'];
const SUN_HEADERS = ['日', '月', '火', '水', '木', '金', '土'];

interface Props {
  year: number;
  month: number;
  weekStartsOnMonday: boolean;
  assignments: ShiftAssignment[];
  focusedEmployeeId: string | null;
  employeeNames: Map<string, string>;
  isHolidayFn: (d: string) => boolean;
  getHolidayName: (d: string) => string;
  onRemove: (assignmentId: string) => void;
}

export function CalendarGrid({
  year, month, weekStartsOnMonday, assignments, focusedEmployeeId,
  employeeNames, isHolidayFn, getHolidayName, onRemove,
}: Props) {
  const grid = getCalendarGrid(year, month, weekStartsOnMonday);
  const headers = weekStartsOnMonday ? MON_HEADERS : SUN_HEADERS;
  const theme = useStore(s => s.settings.theme ?? DEFAULT_THEME);

  return (
    <div className="flex-1 overflow-auto">
      {/* 曜日ヘッダー行 */}
      <div
        style={{ backgroundColor: theme.calDowRowBg }}
        className="grid grid-cols-7 border-b border-gray-300 sticky top-0 z-10"
      >
        {headers.map((h, i) => {
          const textColor =
            h === '日' ? theme.calDowSundayText :
            h === '土' ? theme.calDowSaturdayText :
                         theme.calDowWeekdayText;
          return (
            <div
              key={i}
              style={{ color: textColor }}
              className="text-center text-xs font-bold py-1.5"
            >
              {h}
            </div>
          );
        })}
      </div>

      {grid.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((date, di) =>
            date ? (
              <CalendarCell
                key={di}
                date={date}
                isHoliday={isHolidayFn(date)}
                holidayName={getHolidayName(date)}
                assignments={assignments}
                focusedEmployeeId={focusedEmployeeId}
                employeeNames={employeeNames}
                onRemove={onRemove}
              />
            ) : (
              <EmptyCell key={di} />
            )
          )}
        </div>
      ))}
    </div>
  );
}
