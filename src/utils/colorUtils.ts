export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return `rgba(100, 116, 139, ${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function luminance(hex: string): number {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return 0.5;
  return (
    0.299 * (parseInt(clean.slice(0, 2), 16) / 255) +
    0.587 * (parseInt(clean.slice(2, 4), 16) / 255) +
    0.114 * (parseInt(clean.slice(4, 6), 16) / 255)
  );
}

export function isDark(hex: string): boolean {
  return luminance(hex) < 0.5;
}
