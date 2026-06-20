import { useState } from 'react';
import { Modal } from '../Dialogs/Modal';
import { EmployeeManager } from './EmployeeManager';
import { HolidaySettings } from './HolidaySettings';
import { AppearanceSettings } from './AppearanceSettings';
import { DataManagement } from './DataManagement';
import { useStore } from '../../store/useStore';

interface Props {
  onClose: () => void;
}

type Tab = 'employees' | 'calendar' | 'settings' | 'appearance' | 'data';

export function SettingsModal({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('employees');
  const { settings, updateSettings } = useStore();
  const [aggStart, setAggStart] = useState(settings.aggregationStartDate);
  const [aggEnd, setAggEnd] = useState(settings.aggregationEndDate);

  const handleSaveSettings = async () => {
    await updateSettings({
      aggregationStartDate: aggStart,
      aggregationEndDate: aggEnd,
    });
    onClose();
  };

  const TAB_STYLE = (active: boolean) =>
    `px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
      active ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
    }`;

  return (
    <Modal title="⚙️ 設定" onClose={onClose} size="lg">
      <div className="flex border-b border-gray-200 mb-4 gap-0.5 overflow-x-auto">
        <button onClick={() => setTab('employees')}  className={TAB_STYLE(tab === 'employees')}>👥 社員管理</button>
        <button onClick={() => setTab('calendar')}   className={TAB_STYLE(tab === 'calendar')}>🗓 休日設定</button>
        <button onClick={() => setTab('settings')}   className={TAB_STYLE(tab === 'settings')}>🔧 その他設定</button>
        <button onClick={() => setTab('appearance')} className={TAB_STYLE(tab === 'appearance')}>🎨 外観</button>
        <button onClick={() => setTab('data')}       className={TAB_STYLE(tab === 'data')}>💾 データ管理</button>
      </div>

      {tab === 'employees'  && <EmployeeManager />}
      {tab === 'calendar'   && <HolidaySettings />}
      {tab === 'appearance' && <AppearanceSettings />}
      {tab === 'data'       && <DataManagement />}

      {tab === 'settings' && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">カレンダー週始まり</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="weekStart" checked={settings.weekStartsOnMonday}
                  onChange={() => updateSettings({ weekStartsOnMonday: true })} />
                <span className="text-sm">月曜日始まり</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="weekStart" checked={!settings.weekStartsOnMonday}
                  onChange={() => updateSettings({ weekStartsOnMonday: false })} />
                <span className="text-sm">日曜日始まり</span>
              </label>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">集計期間</p>
            <div className="flex items-center gap-2">
              <input type="date" className="border rounded px-2 py-1 text-sm"
                value={aggStart} onChange={e => setAggStart(e.target.value)} />
              <span className="text-gray-500">〜</span>
              <input type="date" className="border rounded px-2 py-1 text-sm"
                value={aggEnd} onChange={e => setAggEnd(e.target.value)} />
            </div>
            <p className="text-xs text-gray-400 mt-1">社員カードに表示される当番回数の集計対象期間です。</p>
          </div>

          <div className="flex justify-end">
            <button onClick={handleSaveSettings}
              className="bg-indigo-600 text-white px-5 py-2 rounded text-sm hover:bg-indigo-700">
              保存して閉じる
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
