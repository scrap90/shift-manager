import React from 'react';
import type { ReactNode } from 'react';
import type { DutyType, IconName } from '../types';
import { useStore } from '../store/useStore';
import { DEFAULT_THEME } from '../store/defaultTheme';

interface SvgProps {
  size?: number;
  className?: string;
}

function Ic({ size = 16, className = '', children }: SvgProps & { children: ReactNode }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function SunIcon(props: SvgProps) {
  return (
    <Ic {...props}>
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2"  x2="12" y2="5"  />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="2"  y1="12" x2="5"  y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="5.64"  y1="5.64"  x2="7.76"  y2="7.76"  />
      <line x1="16.24" y1="16.24" x2="18.36" y2="18.36" />
      <line x1="18.36" y1="5.64"  x2="16.24" y2="7.76"  />
      <line x1="7.76"  y1="16.24" x2="5.64"  y2="18.36" />
    </Ic>
  );
}

export function MoonIcon(props: SvgProps) {
  return (
    <Ic {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </Ic>
  );
}

export function StarIcon(props: SvgProps) {
  return (
    <Ic {...props}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </Ic>
  );
}

export function BriefcaseIcon(props: SvgProps) {
  return (
    <Ic {...props}>
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="2" y1="11" x2="22" y2="11" />
    </Ic>
  );
}

export function BedIcon(props: SvgProps) {
  return (
    <Ic {...props}>
      <path d="M2 4v16" />
      <path d="M2 8h18a2 2 0 0 1 2 2v10" />
      <path d="M2 17h20" />
      <path d="M6 8v9" />
    </Ic>
  );
}

export function UmbrellaIcon(props: SvgProps) {
  return (
    <Ic {...props}>
      <path d="M23 12a11.05 11.05 0 0 0-22 0zm-5 7a3 3 0 0 1-6 0v-7" />
    </Ic>
  );
}

export function ClockIcon(props: SvgProps) {
  return (
    <Ic {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </Ic>
  );
}

export function HeartIcon(props: SvgProps) {
  return (
    <Ic {...props}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </Ic>
  );
}

export function HomeIcon(props: SvgProps) {
  return (
    <Ic {...props}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </Ic>
  );
}

export function CoffeeIcon(props: SvgProps) {
  return (
    <Ic {...props}>
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="14" y1="1" x2="14" y2="4" />
    </Ic>
  );
}

export function PlaneIcon(props: SvgProps) {
  return (
    <Ic {...props}>
      <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19 4s-2 1-3.5 2.5L8 11.2l-6-.3a1 1 0 0 0-.7 1.7l4.8 4.8a1 1 0 0 0 1.7-.7l-.3-6z" />
    </Ic>
  );
}

export function ZapIcon(props: SvgProps) {
  return (
    <Ic {...props}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </Ic>
  );
}

export function BuildingIcon(props: SvgProps) {
  return (
    <Ic {...props}>
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <line x1="10" y1="6" x2="14" y2="6" />
      <line x1="10" y1="10" x2="14" y2="10" />
      <line x1="10" y1="14" x2="14" y2="14" />
      <line x1="10" y1="18" x2="14" y2="18" />
    </Ic>
  );
}

export function ActivityIcon(props: SvgProps) {
  return (
    <Ic {...props}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </Ic>
  );
}

export function MapPinIcon(props: SvgProps) {
  return (
    <Ic {...props}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </Ic>
  );
}

export function AwardIcon(props: SvgProps) {
  return (
    <Ic {...props}>
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
    </Ic>
  );
}

export const ICON_MAP: Record<IconName, (props: SvgProps) => React.ReactElement> = {
  sun:        SunIcon,
  moon:       MoonIcon,
  star:       StarIcon,
  briefcase:  BriefcaseIcon,
  bed:        BedIcon,
  umbrella:   UmbrellaIcon,
  clock:      ClockIcon,
  heart:      HeartIcon,
  home:       HomeIcon,
  coffee:     CoffeeIcon,
  plane:      PlaneIcon,
  zap:        ZapIcon,
  building:   BuildingIcon,
  activity:   ActivityIcon,
  'map-pin':  MapPinIcon,
  award:      AwardIcon,
};

export const ALL_ICON_NAMES: IconName[] = Object.keys(ICON_MAP) as IconName[];

const DEFAULT_ICON_MAP: Record<DutyType, IconName> = {
  day:              'sun',
  night:            'moon',
  holiday_work:     'briefcase',
  substitute_leave: 'bed',
  vacation:         'umbrella',
  shift_work:       'clock',
};

export function DutyIcon({
  dutyType, size = 16, className = '',
}: {
  dutyType: DutyType;
  size?: number;
  className?: string;
}) {
  const theme = useStore(s => s.settings.theme);
  const iconName = theme?.duties?.[dutyType]?.iconName ?? DEFAULT_THEME.duties[dutyType]?.iconName ?? DEFAULT_ICON_MAP[dutyType];
  const Icon = ICON_MAP[iconName] ?? SunIcon;
  return <Icon size={size} className={className} />;
}
