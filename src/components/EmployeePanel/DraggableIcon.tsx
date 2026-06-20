import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { DutyType } from '../../types';
import { DutyIcon } from '../Icons';
import { useStore } from '../../store/useStore';
import { DEFAULT_THEME } from '../../store/defaultTheme';
import { hexToRgba } from '../../utils/colorUtils';

const DUTY_LABELS: Record<DutyType, string> = {
  day: '昼間', night: '夜間', holiday_work: '休日勤',
  substitute_leave: '代休', vacation: '休暇', shift_work: 'シフト',
};

interface Props {
  employeeId: string;
  dutyType: DutyType;
  disabled?: boolean;
  count?: number;
}

export function DraggableIcon({ employeeId, dutyType, disabled, count }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `drag__${employeeId}__${dutyType}`,
    data: { employeeId, dutyType },
    disabled,
  });
  const [hovered, setHovered] = useState(false);

  const theme = useStore(s => s.settings.theme ?? DEFAULT_THEME);
  const color = theme.duties[dutyType].color;

  const isNegative = count !== undefined && count < 0;
  const unit = dutyType === 'substitute_leave' ? '残' : '回';

  const bgColor = disabled    ? undefined :
                  isDragging  ? hexToRgba(color, 0.05) :
                  hovered     ? hexToRgba(color, 0.22) :
                                hexToRgba(color, 0.1);
  const borderColor = disabled ? undefined : hexToRgba(color, 0.45);
  const shadowStyle = disabled ? undefined : `0 2px 8px ${hexToRgba(color, 0.25)}`;

  const numColor = isNegative ? '#f43f5e' : disabled ? '#94a3b8' : color;
  const unitColor = isNegative ? '#fb7185' : disabled ? '#cbd5e1' : hexToRgba(color, 0.7);
  const iconColor = disabled ? '#94a3b8' : color;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={disabled ? '配置不可' : DUTY_LABELS[dutyType]}
      style={disabled ? {} : {
        backgroundColor: bgColor,
        borderColor: borderColor,
        boxShadow: hovered && !isDragging ? `0 4px 12px ${hexToRgba(color, 0.35)}` : shadowStyle,
      }}
      className={`
        flex flex-col items-center justify-center gap-0.5
        w-12 h-16 rounded-xl border-2 select-none text-center
        transition-all duration-100
        ${disabled
          ? 'opacity-25 cursor-not-allowed border-slate-200 bg-slate-50'
          : `cursor-grab active:cursor-grabbing active:scale-95 active:shadow-sm`
        }
        ${isDragging ? 'opacity-30 scale-90' : ''}
        ${isNegative && !disabled ? 'ring-2 ring-rose-400 animate-pulse' : ''}
      `}
    >
      {/* アイコン（色は親から継承） */}
      <div style={{ color: iconColor }}>
        <DutyIcon dutyType={dutyType} size={18} />
      </div>

      {count !== undefined ? (
        <>
          <span style={{ color: numColor }} className="text-lg font-extrabold leading-none tabular-nums">
            {count}
          </span>
          <span style={{ color: unitColor }} className="text-[8px] leading-none">
            {unit}
          </span>
        </>
      ) : (
        <span style={{ color: iconColor }} className="text-[9px] leading-tight">
          {DUTY_LABELS[dutyType]}
        </span>
      )}
    </div>
  );
}
