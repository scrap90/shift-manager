# シフト管理アプリ UIデザイン改善提案書

作成日: 2026-06-20

---

## エグゼクティブサマリー

現在のUIは情報密度が高い反面、フォントサイズが `text-[8px]` 〜 `text-[10px]` に集中しており視認性が著しく低い。カラー絵文字とテキストカラーが混在してデザインに統一感がなく、代休残数などの緊急度の高い情報が埋もれている。以下の7項目について具体的な改善案を提示する。

---

## 1. アイコンデザイン統一方針

### 1-1. 現状の問題点

- `DraggableIcon.tsx` の ICONS 定義でカラー絵文字（☀ 🌙 🏢 📅 🌴 ⏱）を使用している
- ブラウザ・OSによって絵文字の見た目が大きく異なり、デザインの一貫性が保てない
- 「昼間当番アイコン」と他の種別アイコンが視覚的に区別できない（すべてカラー絵文字）
- `text-base`（16px）のアイコンに対してラベルが `text-[8px]` と極端に小さく、読みにくい

### 1-2. 改善後のデザイン概要

**方針: 絵文字を廃止し、アルファベット/記号ベースのモノトーンバッジに統一する**

各当番種別に固有の「記号バッジ」を割り当て、背景色・テキスト色・枠線のみで識別する。
カラー絵文字は完全に廃止し、Tailwind の `grayscale` フィルタやモノトーンの背景色で統一する。

```tsx
// 記号バッジの定義（絵文字廃止）
const BADGE: Record<DutyType, { symbol: string; bgClass: string; textClass: string; borderClass: string }> = {
  day:              { symbol: '昼', bgClass: 'bg-gray-100',   textClass: 'text-gray-700', borderClass: 'border-gray-400' },
  night:            { symbol: '夜', bgClass: 'bg-gray-700',   textClass: 'text-gray-100', borderClass: 'border-gray-600' },
  holiday_work:     { symbol: '休勤', bgClass: 'bg-gray-200', textClass: 'text-gray-700', borderClass: 'border-gray-400' },
  substitute_leave: { symbol: '代休', bgClass: 'bg-gray-50',  textClass: 'text-gray-600', borderClass: 'border-gray-300' },
  vacation:         { symbol: '休暇', bgClass: 'bg-gray-50',  textClass: 'text-gray-600', borderClass: 'border-gray-300' },
  shift_work:       { symbol: 'シフ', bgClass: 'bg-gray-300', textClass: 'text-gray-800', borderClass: 'border-gray-500' },
};

// DraggableIcon の改善後コード例
export function DraggableIcon({ employeeId, dutyType, disabled }: Props) {
  const badge = BADGE[dutyType];

  return (
    <div
      title={disabled ? '配置不可' : LABELS[dutyType]}
      className={`
        flex flex-col items-center justify-center gap-0.5
        w-12 h-12 rounded-md border-2 select-none text-center
        transition-all duration-100
        ${disabled
          ? 'opacity-30 cursor-not-allowed border-gray-200 bg-gray-50'
          : `cursor-grab ${badge.bgClass} ${badge.borderClass}
             hover:brightness-95 hover:shadow-sm active:cursor-grabbing active:scale-95`
        }
        ${isDragging ? 'opacity-50 scale-95' : ''}
      `}
    >
      <span className={`text-sm font-bold leading-none ${badge.textClass}`}>{badge.symbol}</span>
      <span className={`text-[9px] leading-tight ${badge.textClass} opacity-80`}>{LABELS[dutyType]}</span>
    </div>
  );
}
```

**カレンダーセル内（CalendarCellLane）のレーンヘッダーも同様に更新:**

```tsx
// 絵文字廃止版
const LANE: Partial<Record<DutyType, { label: string; symbol: string; filled: string; empty: string }>> = {
  day:   { label: '昼間', symbol: '昼', filled: 'bg-gray-50',  empty: 'bg-red-50' },
  night: { label: '夜間', symbol: '夜', filled: 'bg-gray-100', empty: 'bg-red-50' },
};
```

### 1-3. 改善の根拠

- 絵文字はOSレンダリング差異が大きく、業務UIには不向き
- モノトーン統一により視線が情報（数字・名前）に集中しやすくなる
- `night` は暗背景＋白文字、`day` は淡背景＋濃文字、という明暗対比で絵文字なしでも直感的に区別できる

---

## 2. 代休残数の視認性改善

### 2-1. 現状の問題点

```tsx
// 現状: balanceColor の定義
const balanceColor = balance > 0 ? 'text-orange-600 font-bold' : balance < 0 ? 'text-red-600 font-bold' : 'text-gray-500';
```

- `text-[10px]` の極小フォント内で `text-red-600 font-bold` を使っても、文字が小さすぎてほぼ視認できない
- プラス（消化待ち）とマイナス（超過取得）が同じ文字サイズで、重大度の差が伝わらない
- 代休残がゼロの場合も `text-gray-500` で表示され、正常状態かどうか判別しにくい

### 2-2. 改善後のデザイン概要

**方針: 代休残をインラインテキストから独立したバッジ表示に格上げする**

```tsx
// 代休残バッジコンポーネント（EmployeeCard 内で使用）
function BalanceBadge({ balance }: { balance: number }) {
  if (balance < 0) {
    // マイナス: 赤背景の警告バッジ（最優先の視認性）
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded
                       bg-red-600 text-white text-xs font-extrabold
                       ring-2 ring-red-300 animate-pulse">
        代休 {balance}日
      </span>
    );
  }
  if (balance > 0) {
    // プラス: オレンジバッジ（要消化）
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded
                       bg-orange-100 text-orange-700 text-xs font-bold
                       border border-orange-300">
        代休 +{balance}日
      </span>
    );
  }
  // ゼロ: グリーンバッジ（正常）
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded
                     bg-green-50 text-green-700 text-xs
                     border border-green-200">
      代休 0日
    </span>
  );
}
```

**EmployeeCard の詳細エリアへの組み込み:**

```tsx
{/* 代休残を独立した行に配置 */}
<div className="flex items-center gap-2 py-0.5">
  <span className="text-xs text-gray-500 shrink-0">代休残:</span>
  <BalanceBadge balance={balance} />
</div>
```

**折りたたみ時の概要表示（collapsed view）でも同様に:**

```tsx
{/* collapsed: マイナスのときは赤バッジを概要でも表示 */}
<div className="px-2 pb-1.5 flex items-center gap-1.5 flex-wrap bg-white">
  {canDay && <span className="text-xs text-gray-600">昼{counts.day.total}</span>}
  {canNight && <span className="text-xs text-gray-600">夜{counts.night.total}</span>}
  <span className="text-xs text-gray-600">休勤{counts.holidayWork}</span>
  <BalanceBadge balance={balance} />
  {counts.shiftWork > 0 && <span className="text-xs text-gray-600">シフ{counts.shiftWork}</span>}
</div>
```

### 2-3. 改善の根拠

- マイナス残数は「超過取得」であり労務管理上の問題を示す。`animate-pulse` と赤背景で即座に目に入るようにする
- `ring-2 ring-red-300` により、背景色が薄いカードの中でも輪郭が際立つ
- プラス（消化待ち）はオレンジバッジとし、マイナスとは明確に区別する
- ゼロはグリーンで「問題なし」を積極的に伝える（沈黙よりも安心感を与える）
- `animate-pulse` はマイナス限定にすることで「動き = 異常」の直感を保つ

---

## 3. ドラッグアイコンの視認性改善

### 3-1. 現状の問題点

- アイコンサイズが固定されておらず、絵文字の `text-base` とラベルの `text-[8px]` という極端なサイズ差
- アイコンの隣または下に当該社員の現在の配置回数が表示されていないため、ドラッグ前に情報が取れない
- アイコンをドラッグすべき理由（「あと何回配置できるか」など）がUIから読み取れない

### 3-2. 改善後のデザイン概要

**方針: アイコン内に「当番種別 + 現在のカウント数」を大きく並べて表示する**

`DraggableIcon` に `count` プロップを追加し、バッジ内に数値を表示する。

```tsx
interface Props {
  employeeId: string;
  dutyType: DutyType;
  disabled?: boolean;
  count?: number;        // 追加: 現在の配置回数
}

export function DraggableIcon({ employeeId, dutyType, disabled, count }: Props) {
  const badge = BADGE[dutyType];

  return (
    <div className={`
      relative flex flex-col items-center justify-center
      w-14 h-14 rounded-lg border-2 select-none
      transition-all duration-100
      ${disabled
        ? 'opacity-30 cursor-not-allowed border-gray-200 bg-gray-50'
        : `cursor-grab ${badge.bgClass} ${badge.borderClass}
           hover:brightness-95 hover:shadow-md active:cursor-grabbing active:scale-95`
      }
    `}>
      {/* 種別ラベル（上部、やや大きめ） */}
      <span className={`text-[11px] font-semibold leading-none ${badge.textClass}`}>
        {LABELS[dutyType]}
      </span>

      {/* カウント数（中央に大きく） */}
      {count !== undefined && (
        <span className={`text-xl font-bold leading-tight ${badge.textClass}`}>
          {count}
        </span>
      )}

      {/* 「回」の単位（小さめ） */}
      {count !== undefined && (
        <span className={`text-[9px] leading-none ${badge.textClass} opacity-70`}>回</span>
      )}
    </div>
  );
}
```

**EmployeeCard からのカウント受け渡し例:**

```tsx
{/* ドラッグアイコン + カウント表示 */}
<div className="flex gap-1.5 pt-1.5 flex-wrap">
  {canDay && (
    <DraggableIcon
      employeeId={employee.employeeId}
      dutyType="day"
      count={counts.day.total}
    />
  )}
  {canNight && (
    <DraggableIcon
      employeeId={employee.employeeId}
      dutyType="night"
      count={counts.night.total}
    />
  )}
  <DraggableIcon
    employeeId={employee.employeeId}
    dutyType="holiday_work"
    count={counts.holidayWork}
  />
  <DraggableIcon
    employeeId={employee.employeeId}
    dutyType="substitute_leave"
    count={counts.carryOverBalance}  // 代休残数を表示
  />
  <DraggableIcon
    employeeId={employee.employeeId}
    dutyType="vacation"
    count={counts.vacation}
  />
  {counts.shiftWork > 0 && (
    <DraggableIcon
      employeeId={employee.employeeId}
      dutyType="shift_work"
      count={counts.shiftWork}
    />
  )}
</div>
```

### 3-3. 改善の根拠

- アイコン内に数字を表示することで、ドラッグ操作前に現在の配置状況が一目でわかる
- `w-14 h-14`（56px）の統一サイズにより、タッチ操作やドラッグのターゲット面積が確保される（WCAG 2.5.5 推奨 44px 以上）
- 種別ラベル（11px）→ 数値（20px/xl）→ 単位（9px）の3段階サイズにより、視線の優先度が明確になる

---

## 4. EmployeeCard 全体の改善

### 4-1. 現状の問題点

- カウント情報の表示がすべて `text-[10px]` の1行テキストに押し込まれており、スキャンしにくい
- 昼間当番・夜間当番の内訳（平日/休日前/休日）が横並び1行で情報量が多すぎる
- ヘッダーのフォーカスボタン（📌）が絵文字で、クリック領域が曖昧
- 折りたたみ時（collapsed）の概要も `text-[10px]` で読みにくい

### 4-2. 改善後のデザイン概要

**ヘッダー部分:**

```tsx
<div className={`
  flex items-center gap-2 px-3 py-2 cursor-pointer
  ${isFocused ? 'bg-yellow-50 border-l-4 border-l-yellow-400' : 'bg-gray-50 hover:bg-gray-100'}
`}>
  {/* 展開矢印 */}
  <span className="text-xs text-gray-400 w-3 shrink-0">{expanded ? '▼' : '▶'}</span>

  {/* 社員名（text-sm → text-base に格上げ） */}
  <span className="font-semibold text-sm flex-1 truncate text-gray-800">{employee.name}</span>

  {/* フォーカスボタン（テキストに変更） */}
  <button
    onClick={e => { e.stopPropagation(); onFocus(); }}
    className={`
      text-xs px-2 py-0.5 rounded font-medium shrink-0
      ${isFocused ? 'bg-yellow-400 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}
    `}
  >
    {isFocused ? '固定中' : '固定'}
  </button>
</div>
```

**カウント詳細（expanded）の構造改善:**

```tsx
<div className="px-3 pb-3 pt-2 space-y-2 bg-white">

  {/* 当番カウント: グリッドレイアウトで整列 */}
  {canDay && (
    <div className="bg-gray-50 rounded-md px-2 py-1.5">
      <div className="text-xs font-semibold text-gray-700 mb-1">昼間当番</div>
      <div className="grid grid-cols-4 gap-1 text-[11px] text-gray-600">
        <div className="text-center">
          <div className="text-[9px] text-gray-400">平日</div>
          <div className="font-bold text-gray-800">{counts.day.weekday}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] text-gray-400">休前</div>
          <div className="font-bold text-gray-800">{counts.day.holidayEve}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] text-gray-400">休日</div>
          <div className="font-bold text-gray-800">{counts.day.holiday}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] text-gray-400">合計</div>
          <div className="font-extrabold text-sm text-gray-900">{counts.day.total}</div>
        </div>
      </div>
      {counts.day.provisional > 0 && (
        <div className="text-[10px] text-red-500 mt-0.5">仮配置 +{counts.day.provisional}</div>
      )}
    </div>
  )}

  {/* 代休残バッジ（前述の BalanceBadge を使用） */}
  <div className="flex items-center gap-2">
    <span className="text-xs text-gray-500 shrink-0">代休残:</span>
    <BalanceBadge balance={balance} />
  </div>

  {/* ドラッグアイコン列 */}
  <div className="flex gap-1.5 pt-1 flex-wrap">
    {/* 前述の改善版 DraggableIcon */}
  </div>
</div>
```

**折りたたみ時（collapsed）の改善:**

```tsx
{/* collapsed: 数字を text-xs（12px）に引き上げ、代休残にバッジを使用 */}
<div className="px-3 pb-2 pt-1 flex items-center gap-2 flex-wrap bg-white">
  {canDay && (
    <span className="text-xs text-gray-600">
      <span className="text-[10px] text-gray-400">昼</span>
      <span className="font-bold ml-0.5">{counts.day.total}</span>
    </span>
  )}
  {canNight && (
    <span className="text-xs text-gray-600">
      <span className="text-[10px] text-gray-400">夜</span>
      <span className="font-bold ml-0.5">{counts.night.total}</span>
    </span>
  )}
  <span className="text-xs text-gray-600">
    <span className="text-[10px] text-gray-400">休勤</span>
    <span className="font-bold ml-0.5">{counts.holidayWork}</span>
  </span>
  <BalanceBadge balance={balance} />
</div>
```

### 4-3. 改善の根拠

- グリッドレイアウトで内訳を縦に揃えることで、列が揃い比較しやすくなる
- カウントの合計だけ `text-sm font-extrabold` に格上げして視線を誘導する
- 絵文字依存を廃止しテキストラベルにすることでOSフォント差異を排除する

---

## 5. カレンダーセル内の視認性改善

### 5-1. 現状の問題点

- `AssignmentChip` の社員名が `text-[10px]` で、カレンダーセル内に密集すると読めない
- レーンヘッダー（「☀昼間」「🌙夜間」「📋特別勤」）が `text-[9px]` で見落としやすい
- `dim` 状態（フォーカス外）が `opacity-25` で暗くなりすぎ、視認性ゼロに近い
- 削除ボタン（✕）が `text-[9px]` でタップしにくい
- 未配置の警告（⚠ 絵文字）が小さくて気づきにくい

### 5-2. 改善後のデザイン概要

**AssignmentChip の改善:**

```tsx
function AssignmentChip({ assignment, employeeName, dim, onRemove, prefixLabel, allAssignments }: ChipProps) {
  const textColor =
    assignment.status === 'confirmed'  ? 'text-gray-800' :
    assignment.status === 're_editing' ? 'text-orange-600' :
                                         'text-red-600';

  const chipBg =
    assignment.status === 'confirmed'  ? 'bg-white border-gray-200' :
    assignment.status === 're_editing' ? 'bg-orange-50 border-orange-200' :
                                         'bg-red-50 border-red-200';

  return (
    <div className={`
      relative flex items-center gap-0.5
      px-1 py-0.5 mb-0.5 rounded border
      cursor-grab active:cursor-grabbing select-none
      group transition-opacity
      ${chipBg}
      ${dim ? 'opacity-40' : 'opacity-100'}   // 25 → 40 に緩和
      ${isDragging ? 'opacity-50' : ''}
    `}>
      {prefixLabel && (
        <span className="text-[10px] text-gray-500 shrink-0">{prefixLabel}</span>
      )}
      <span className={`text-[11px] font-medium leading-tight flex-1 ${textColor}
                        ${assignment.status === 'provisional' ? 'italic' : ''}`}>
        {employeeName}{assignment.status !== 'confirmed' ? '仮' : ''}
      </span>
      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); onRemove(); }}
        // min-w-4 min-h-4 でタップ面積を確保
        className="opacity-0 group-hover:opacity-100 min-w-4 min-h-4
                   flex items-center justify-center
                   text-red-400 hover:text-red-600 text-[10px]
                   hover:bg-red-50 rounded"
      >✕</button>
    </div>
  );
}
```

**レーンヘッダーの改善:**

```tsx
// CalendarCellLane のレーンヘッダー
<div className="flex items-center gap-0.5 mb-0.5">
  {/* モノトーンのテキストバッジ */}
  <span className={`
    text-[10px] font-bold px-1 rounded leading-tight
    ${dutyType === 'day'   ? 'bg-gray-200 text-gray-700' : ''}
    ${dutyType === 'night' ? 'bg-gray-700 text-gray-100' : ''}
  `}>
    {dutyType === 'day' ? '昼' : '夜'}
  </span>
</div>

// SpecialLane のヘッダー
<div className="text-[10px] font-bold text-gray-600 bg-gray-100 rounded px-1 mb-0.5 leading-tight inline-block">
  特別
</div>
```

**未配置警告の改善:**

```tsx
{/* 未配置時: 小さな絵文字から、背景付きの警告テキストへ */}
{!hasSome && (
  <div className="text-[10px] font-semibold text-red-500 bg-red-50 rounded px-1 py-0.5 text-center">
    未配置
  </div>
)}
```

**CalendarCell のメモ欄:**

```tsx
{/* メモ欄: text-[9px] → text-[10px] に引き上げ */}
<div className="text-[10px] text-gray-400 py-0.5 truncate cursor-pointer hover:text-gray-600">
  {memo || '+ メモ'}
</div>
```

### 5-3. 改善の根拠

- `text-[11px]` は `text-[10px]` より 10% 大きく、密集した環境での可読性が明確に向上する
- チップに背景色と枠線を付与することで、仮配置・確定・再編集の状態がカラーコードと背景の両方で識別できる（カラーブラインドにも配慮）
- `dim` を `opacity-25` から `opacity-40` に緩和することで、フォーカス外の社員もゼロでなく薄く見える（情報の抹消ではなく「ハイライト外」の表現に留める）
- 削除ボタンの最小サイズを `min-w-4 min-h-4` で確保し、誤タップを防ぐ

---

## 6. SummaryBar の改善

### 6-1. 現状の問題点

```tsx
// 現状
<div className="bg-gray-100 border-b border-gray-200 px-4 py-1.5 flex gap-6 text-xs text-gray-600 flex-wrap">
```

- `py-1.5` で縦方向の余白が少なく、バーとして視覚的に存在感が薄い
- テキストが `text-xs`（12px）で、絵文字のレンダリングと混在してサイズ感が不統一
- 各項目が `gap-6` のスペースで並んでいるが、グループの区切りが不明瞭
- 完了状態（✅）と未完了状態（⚠）の重みが視覚的に同等で、緊急度が伝わらない

### 6-2. 改善後のデザイン概要

```tsx
export function SummaryBar({ year, month }: Props) {
  // ...既存のロジック...

  return (
    <div className="bg-white border-b-2 border-gray-200 px-4 py-2 flex items-center gap-4 flex-wrap shadow-sm">

      {/* 配置状況インジケーター */}
      <SummaryItem
        label="昼間"
        filled={dayFilled}
        total={total}
      />
      <SummaryItem
        label="夜間"
        filled={nightFilled}
        total={total}
      />
      {holTotal > 0 && (
        <SummaryItem
          label="休日勤"
          filled={holWorkFilled}
          total={holTotal}
        />
      )}

      {/* 区切り */}
      <div className="w-px h-5 bg-gray-300 mx-1" />

      {/* 総合ステータス */}
      {missing > 0 ? (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md
                         bg-red-100 text-red-700 text-sm font-bold
                         border border-red-300">
          <span className="text-base">!</span>
          要確認 {missing}日
        </span>
      ) : (
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-md
                         bg-green-50 text-green-700 text-sm font-medium
                         border border-green-200">
          全日程配置済み
        </span>
      )}
    </div>
  );
}

// 各配置状況を表示するサブコンポーネント
function SummaryItem({ label, filled, total }: { label: string; filled: number; total: number }) {
  const isComplete = filled === total;
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className={`text-sm font-bold ${isComplete ? 'text-green-700' : 'text-red-600'}`}>
        {filled}
      </span>
      <span className="text-xs text-gray-400">/{total}</span>
      {/* 達成率バー（幅40px固定） */}
      <div className="w-10 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isComplete ? 'bg-green-500' : 'bg-red-400'}`}
          style={{ width: `${Math.min(100, (filled / total) * 100)}%` }}
        />
      </div>
    </div>
  );
}
```

### 6-3. 改善の根拠

- `SummaryItem` として独立させることで、配置率バーを追加できる（視覚的な進捗表示）
- 総合ステータスをバッジ形式にすることで、スクロールなしに即座に全体状況が判断できる
- `border-b-2` と `shadow-sm` を追加してバーとしての重みを増す
- 絵文字（☀ 🌙 🏢 ✅ ⚠）を廃止しテキストラベルに統一する

---

## 7. 全体的なカラーパレット・タイポグラフィの方針

### 7-1. 現状の問題点

- フォントサイズが `text-[8px]` から `text-xs`（12px）まで混在し、階層が不明瞭
- 色がコンポーネントごとにバラバラ（green-700, blue-700, yellow-700, teal-700, indigo-700, purple-100 等）で、カラー規則がない
- カラー絵文字（☀ 🌙 🏢 📅 🌴 ⏱ ✅ ⚠ 📌 📋）を使い続けると、OS/ブラウザ更新のたびに見た目が変化するリスクがある

### 7-2. 改善後の方針

#### フォントサイズ階層

| 用途 | 現状 | 改善後 |
|------|------|--------|
| カードヘッダー社員名 | `text-sm`（14px） | `text-sm`（14px）維持 ※ |
| カウント合計値 | `text-[10px]` | `text-sm`（14px）に格上げ |
| カウント内訳 | `text-[10px]` | `text-[11px]` に格上げ |
| チップの社員名 | `text-[10px]` | `text-[11px]` に格上げ |
| レーンヘッダー | `text-[9px]` | `text-[10px]` に格上げ |
| ラベル・単位 | `text-[8px]` | `text-[9px]` に格上げ |
| SummaryBar | `text-xs`（12px） | `text-sm`（14px）に格上げ |

※ 社員名はサイドパネル幅の制約があるため現状維持

#### カラーパレット（モノトーン優先）

```
■ グレースケール（メインパレット）
  - gray-50   : 背景（最薄）
  - gray-100  : 昼間当番バッジ背景
  - gray-200  : 境界線・区切り
  - gray-300  : 無効状態の枠線
  - gray-600  : サブテキスト
  - gray-700  : 夜間当番バッジ背景（テキストはwhite）
  - gray-800  : メインテキスト
  - gray-900  : 強調テキスト

■ セマンティックカラー（限定使用）
  - red-600 / red-100   : エラー・警告（代休マイナス、未配置）
  - orange-600 / orange-100 : 注意（代休プラス、仮配置）
  - green-700 / green-50    : 完了・正常（全配置済み、代休ゼロ）
  - yellow-400 / yellow-50  : フォーカス中のカード
  - blue-50 / blue-100      : 土曜日のカラーコード（カレンダーのみ）
  - red-50                  : 日曜・祝日のカラーコード（カレンダーのみ）
```

#### 絵文字廃止ロードマップ

| 場所 | 絵文字 | 代替案 |
|------|--------|--------|
| DraggableIcon | ☀ 🌙 🏢 📅 🌴 ⏱ | テキストバッジ（昼/夜/休勤/代休/休暇/シフ） |
| EmployeeCard | ☀ 🌙 🏢 📅 🌴 ⏱ | 同上 |
| SummaryBar | ☀ 🌙 🏢 ✅ ⚠ | テキストラベル + 色分け |
| CalendarCellLane | ☀ 🌙 📋 ⚠ | テキストバッジ（昼/夜/特別/未配置） |
| EmployeeCard フォーカスボタン | 📌 | 「固定」「固定中」テキスト |

### 7-3. 改善の根拠

- **フォントサイズ**: WCAG 2.1 AA 基準では本文テキストは最低 14px 相当が推奨される。`text-[8px]` や `text-[9px]` は基準を大きく下回っており、長時間使用する業務アプリとして問題がある
- **カラー削減**: 現状7色以上のアクセントカラーが混在しており、「重要かどうか」の判断基準が崩れている。セマンティックカラーを4系統（エラー赤/警告橙/成功緑/フォーカス黄）に絞ることで、色の意味が一貫する
- **絵文字廃止**: Windowsのカラー絵文字（Segoe UI Emoji）は Chromium 上でモノトーン絵文字と混在することがあり、テキストの行高に悪影響を与える。テキストバッジに置き換えることで、レンダリング環境に依存しない安定したUIになる

---

## 実装優先度

| 優先度 | 項目 | 理由 |
|--------|------|------|
| 🔴 高 | 代休残バッジ（マイナスの警告強化） | 業務上の緊急度が最も高い情報 |
| 🔴 高 | フォントサイズ全般の引き上げ | 視認性の根本的な問題 |
| 🟠 中 | ドラッグアイコンへのカウント表示 | 操作前の情報確認が効率化 |
| 🟠 中 | AssignmentChip の改善（背景色 + opacity緩和） | 日常操作の主要UIエリア |
| 🟡 低 | 絵文字廃止・モノトーン統一 | デザイン品質向上だが動作には影響なし |
| 🟡 低 | SummaryBar の進捗バー追加 | 情報追加だが必須ではない |

---

*本提案書はコード実装を含まず、実装方針と具体的なTailwind CSSクラス例を示すものです。実際の実装は提案書の内容を参照しながら、既存コードベースの設計方針に合わせて調整してください。*
