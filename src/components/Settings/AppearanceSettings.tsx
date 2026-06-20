import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { DEFAULT_THEME } from '../../store/defaultTheme';
import { ICON_MAP, ALL_ICON_NAMES } from '../Icons';
import { hexToRgba } from '../../utils/colorUtils';
import type { AppTheme, DutyType, IconName } from '../../types';

const DUTY_CONFIGS: { type: DutyType; label: string }[] = [
  { type: 'day',              label: '昼間当番' },
  { type: 'night',            label: '夜間当番' },
  { type: 'holiday_work',     label: '休日勤務' },
  { type: 'substitute_leave', label: '代休' },
  { type: 'vacation',         label: '休暇' },
  { type: 'shift_work',       label: 'シフト勤務' },
];

const CAL_DATE_ROWS = [
  { label: '平日',     bgKey: 'calWeekdayHeaderBg',   textKey: 'calWeekdayNumColor' },
  { label: '土曜日',   bgKey: 'calSaturdayHeaderBg',  textKey: 'calSaturdayNumColor' },
  { label: '日曜日',   bgKey: 'calSundayHeaderBg',    textKey: 'calSundayHolidayNumColor' },
  { label: '祝日',     bgKey: 'calHolidayHeaderBg',   textKey: 'calSundayHolidayNumColor' },
] as const;

function resolveTheme(stored?: AppTheme | null): AppTheme {
  if (!stored) return { ...DEFAULT_THEME, duties: { ...DEFAULT_THEME.duties } };
  return {
    ...DEFAULT_THEME,
    ...stored,
    duties: {
      ...DEFAULT_THEME.duties,
      ...stored.duties,
    },
  };
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-5 h-5 rounded border border-slate-200 shrink-0"
        style={{ backgroundColor: value }}
      />
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-8 h-6 cursor-pointer rounded border border-slate-300 p-0.5 bg-white"
      />
      <span className="text-[10px] text-slate-400 font-mono w-[3.8rem]">{value}</span>
    </div>
  );
}

function SectionHeader({ children }: { children: string }) {
  return (
    <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2.5 flex items-center gap-2">
      <span className="w-3 h-px bg-slate-300 inline-block" />
      {children}
    </h3>
  );
}

export function AppearanceSettings() {
  const { settings, updateSettings } = useStore();
  const [draft, setDraft] = useState<AppTheme>(() => resolveTheme(settings.theme));
  const [saved, setSaved] = useState(false);
  const [expandedDuty, setExpandedDuty] = useState<DutyType | null>(null);

  function setField<K extends keyof AppTheme>(key: K, val: AppTheme[K]) {
    setDraft(d => ({ ...d, [key]: val }));
  }

  function setDutyColor(dt: DutyType, color: string) {
    setDraft(d => ({
      ...d,
      duties: { ...d.duties, [dt]: { ...d.duties[dt], color } },
    }));
  }

  function setDutyIcon(dt: DutyType, iconName: IconName) {
    setDraft(d => ({
      ...d,
      duties: { ...d.duties, [dt]: { ...d.duties[dt], iconName } },
    }));
  }

  async function handleSave() {
    await updateSettings({ theme: draft });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset() {
    setDraft(resolveTheme(null));
  }

  return (
    <div className="space-y-6 overflow-y-auto" style={{ maxHeight: '65vh' }}>

      {/* ─ メニューバー ─ */}
      <section>
        <SectionHeader>メニューバー</SectionHeader>
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600">背景色</span>
            <ColorPicker value={draft.headerBg} onChange={v => setField('headerBg', v)} />
          </div>
          {/* プレビュー */}
          <div
            className="mt-2.5 rounded-lg h-7 px-3 flex items-center gap-2"
            style={{ backgroundColor: draft.headerBg }}
          >
            <div className="w-3.5 h-3.5 rounded bg-indigo-500 shrink-0" />
            <span className="text-white text-xs font-medium opacity-80">シフト管理</span>
            <span className="text-white/50 text-xs ml-auto">プレビュー</span>
          </div>
        </div>
      </section>

      {/* ─ カレンダー曜日行 ─ */}
      <section>
        <SectionHeader>カレンダー曜日行</SectionHeader>
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600">背景色</span>
            <ColorPicker value={draft.calDowRowBg} onChange={v => setField('calDowRowBg', v)} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600">平日テキスト</span>
            <ColorPicker value={draft.calDowWeekdayText} onChange={v => setField('calDowWeekdayText', v)} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600">土曜テキスト</span>
            <ColorPicker value={draft.calDowSaturdayText} onChange={v => setField('calDowSaturdayText', v)} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600">日曜テキスト</span>
            <ColorPicker value={draft.calDowSundayText} onChange={v => setField('calDowSundayText', v)} />
          </div>
          {/* プレビュー */}
          <div
            className="mt-1 rounded-lg flex overflow-hidden border border-slate-200"
            style={{ backgroundColor: draft.calDowRowBg }}
          >
            {['月', '火', '水', '木', '金', '土', '日'].map(h => (
              <div
                key={h}
                className="flex-1 text-center text-[10px] font-bold py-1"
                style={{
                  color: h === '日' ? draft.calDowSundayText
                       : h === '土' ? draft.calDowSaturdayText
                       : draft.calDowWeekdayText,
                }}
              >
                {h}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─ カレンダー日付 ─ */}
      <section>
        <SectionHeader>カレンダー日付</SectionHeader>
        <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left text-[10px] text-slate-400 font-medium px-3 py-2">種別</th>
                <th className="text-left text-[10px] text-slate-400 font-medium px-3 py-2">背景色</th>
                <th className="text-left text-[10px] text-slate-400 font-medium px-3 py-2">日付数字色</th>
                <th className="text-left text-[10px] text-slate-400 font-medium px-3 py-2">表示</th>
              </tr>
            </thead>
            <tbody>
              {CAL_DATE_ROWS.map(({ label, bgKey, textKey }, i) => {
                const bgVal = draft[bgKey] as string;
                const textVal = draft[textKey] as string;
                return (
                  <tr key={label} className={i > 0 ? 'border-t border-slate-100' : ''}>
                    <td className="px-3 py-2 text-xs text-slate-700">{label}</td>
                    <td className="px-3 py-2">
                      <ColorPicker
                        value={bgVal}
                        onChange={v => setField(bgKey, v)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <ColorPicker
                        value={textVal}
                        onChange={v => setField(textKey, v)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div
                        className="w-8 h-6 rounded text-center text-sm font-bold leading-6"
                        style={{ backgroundColor: bgVal, color: textVal }}
                      >
                        1
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-[10px] text-slate-400 px-3 py-2 border-t border-slate-100">
            ※「日曜日」の日付数字色は祝日にも適用されます
          </p>
        </div>
      </section>

      {/* ─ 勤務種別 ─ */}
      <section>
        <SectionHeader>勤務種別</SectionHeader>
        <div className="space-y-2">
          {DUTY_CONFIGS.map(({ type: dt, label }) => {
            const dc = draft.duties[dt];
            const isExpanded = expandedDuty === dt;
            const Icon = ICON_MAP[dc.iconName] ?? ICON_MAP['sun'];

            return (
              <div
                key={dt}
                className="rounded-xl border border-slate-100 overflow-hidden"
              >
                {/* 種別ヘッダー（クリックで展開） */}
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 bg-slate-50
                             hover:bg-slate-100 transition-colors text-left"
                  onClick={() => setExpandedDuty(isExpanded ? null : dt)}
                >
                  {/* アイコンプレビュー */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: hexToRgba(dc.color, 0.15), color: dc.color }}
                  >
                    <Icon size={18} />
                  </div>

                  <span className="text-sm font-semibold text-slate-700 flex-1">{label}</span>

                  {/* 現在の色プレビュー */}
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full border border-slate-200/70"
                      style={{ backgroundColor: dc.color }}
                    />
                    <span className="text-[10px] text-slate-400 font-mono">{dc.color}</span>
                    <svg
                      width="12" height="12" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                      className={`text-slate-400 transition-transform duration-200
                                  ${isExpanded ? 'rotate-90' : ''}`}
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </button>

                {/* 展開パネル */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-2 bg-white space-y-3 border-t border-slate-100">

                    {/* カラーピッカー */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">アクセントカラー</span>
                      <div className="flex items-center gap-2">
                        <ColorPicker value={dc.color} onChange={v => setDutyColor(dt, v)} />
                      </div>
                    </div>

                    {/* アイコン選択グリッド */}
                    <div>
                      <span className="text-xs text-slate-500 block mb-1.5">アイコン</span>
                      <div className="flex flex-wrap gap-1.5">
                        {ALL_ICON_NAMES.map(name => {
                          const IconComp = ICON_MAP[name];
                          const selected = dc.iconName === name;
                          return (
                            <button
                              key={name}
                              onClick={() => setDutyIcon(dt, name)}
                              style={selected
                                ? { backgroundColor: hexToRgba(dc.color, 0.15), borderColor: dc.color, color: dc.color }
                                : {}}
                              className={`w-8 h-8 rounded-lg border flex items-center justify-center
                                         transition-all duration-100
                                         ${selected
                                           ? 'border-2'
                                           : 'border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                         }`}
                              title={name}
                            >
                              <IconComp size={16} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─ 操作ボタン ─ */}
      <div className="flex justify-between items-center pt-3 border-t border-slate-100 sticky bottom-0 bg-white py-3 -mx-1 px-1">
        <button
          onClick={handleReset}
          className="text-xs text-slate-400 hover:text-slate-600 underline transition-colors"
        >
          デフォルトに戻す
        </button>
        <button
          onClick={handleSave}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200
            ${saved
              ? 'bg-emerald-500 text-white'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
            }`}
        >
          {saved ? '✓ 保存しました' : '保存して適用'}
        </button>
      </div>
    </div>
  );
}
