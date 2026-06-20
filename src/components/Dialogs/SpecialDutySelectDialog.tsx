import { Modal } from './Modal';
import { DutyIcon } from '../Icons';
import { useStore } from '../../store/useStore';
import { DEFAULT_THEME } from '../../store/defaultTheme';
import { hexToRgba } from '../../utils/colorUtils';
import type { DutyType } from '../../types';

interface Option {
  type: DutyType;
  label: string;
  desc: string;
}

interface Props {
  date: string;
  employeeName: string;
  isHoliday: boolean;
  onSelect: (dutyType: DutyType) => void;
  onCancel: () => void;
}

export function SpecialDutySelectDialog({
  date, employeeName, isHoliday, onSelect, onCancel,
}: Props) {
  const theme = useStore(s => s.settings.theme ?? DEFAULT_THEME);

  const options: Option[] = isHoliday
    ? [
        { type: 'holiday_work', label: '休日勤務', desc: '代休 +1 が付与されます' },
        { type: 'shift_work',   label: 'シフト勤務', desc: '早出・遅出を次のダイアログで選択します' },
      ]
    : [
        { type: 'substitute_leave', label: '代休', desc: '元勤務を選択して紐付けます' },
        { type: 'vacation',         label: '休暇', desc: '備忘録として記録します' },
        { type: 'shift_work',       label: 'シフト勤務', desc: '早出・遅出を次のダイアログで選択します' },
      ];

  const [y, m, d] = date.split('-');
  const displayDate = `${y}/${m}/${d}`;

  return (
    <Modal title="勤務種別を選択" onClose={onCancel} size="sm">
      <div>
        {/* ヘッダー情報 */}
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <span className="text-xs text-slate-500 font-mono">{displayDate}</span>
          <span className="w-px h-3 bg-slate-200 shrink-0" />
          <span className="text-sm font-semibold text-slate-700">{employeeName}</span>
          <span
            className={`ml-auto text-[10px] px-2 py-0.5 rounded-md font-bold
              ${isHoliday ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'}`}
          >
            {isHoliday ? '休日' : '平日'}
          </span>
        </div>

        {/* 選択ボタン */}
        <div className="space-y-2">
          {options.map(opt => {
            const color = theme.duties[opt.type].color;
            return (
              <button
                key={opt.type}
                onClick={() => onSelect(opt.type)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl
                           border-2 text-left bg-white
                           hover:scale-[1.01] active:scale-[0.99]
                           transition-all duration-100 hover:shadow-md group"
                style={{ borderColor: hexToRgba(color, 0.3) }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: hexToRgba(color, 0.1), color }}
                >
                  <DutyIcon dutyType={opt.type} size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold leading-tight" style={{ color }}>
                    {opt.label}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                    {opt.desc}
                  </div>
                </div>
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color }}
                >
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            );
          })}
        </div>

        <button
          onClick={onCancel}
          className="w-full mt-3 py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          キャンセル
        </button>
      </div>
    </Modal>
  );
}
