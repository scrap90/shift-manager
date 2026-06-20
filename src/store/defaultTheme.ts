import type { AppTheme } from '../types';

export const DEFAULT_THEME: AppTheme = {
  headerBg: '#0f172a',

  calDowRowBg: '#ffffff',
  calDowWeekdayText: '#475569',
  calDowSaturdayText: '#0284c7',
  calDowSundayText: '#f43f5e',

  calWeekdayHeaderBg: '#f8fafc',
  calSaturdayHeaderBg: '#f0f9ff',
  calSundayHeaderBg: '#fff1f2',
  calHolidayHeaderBg: '#f5f3ff',

  calWeekdayNumColor: '#1e293b',
  calSaturdayNumColor: '#0284c7',
  calSundayHolidayNumColor: '#e11d48',

  duties: {
    day:              { color: '#f59e0b', iconName: 'sun' },
    night:            { color: '#6366f1', iconName: 'moon' },
    holiday_work:     { color: '#8b5cf6', iconName: 'briefcase' },
    substitute_leave: { color: '#10b981', iconName: 'bed' },
    vacation:         { color: '#0ea5e9', iconName: 'umbrella' },
    shift_work:       { color: '#64748b', iconName: 'clock' },
  },
};
