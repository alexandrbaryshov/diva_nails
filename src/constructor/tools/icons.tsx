// Тонкие линейные иконки интерфейса: один штрих 1.5, скругления, цвет — currentColor.
import type { JSX } from "preact";

type IconProps = { class?: string; size?: number };

function Icon({ class: cls, size = 24, children }: IconProps & { children: JSX.Element | JSX.Element[] }) {
  return (
    <svg
      class={cls ? `dn-icon ${cls}` : "dn-icon"}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.4"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** Звёздочка-блик в 4 луча с центром (x, y). */
const spark = (x: number, y: number, r: number) =>
  `M${x} ${y - r}C${x + r * 0.15} ${y - r * 0.15} ${x + r * 0.15} ${y - r * 0.15} ${x + r} ${y}C${x + r * 0.15} ${y + r * 0.15} ${x + r * 0.15} ${y + r * 0.15} ${x} ${y + r}C${x - r * 0.15} ${y + r * 0.15} ${x - r * 0.15} ${y + r * 0.15} ${x - r} ${y}C${x - r * 0.15} ${y - r * 0.15} ${x - r * 0.15} ${y - r * 0.15} ${x} ${y - r}Z`;

export const IconPalette = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.2c-5 0-8.8 3.8-8.8 8.6 0 4.9 3.9 8.9 8.6 8.9 1.2 0 1.9-.8 1.9-1.8 0-.5-.2-.9-.5-1.3-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8h2.1c2.4 0 4.2-1.9 4.2-4.2 0-4-3.9-7.2-8.8-7.2Z" />
    <circle cx="7.4" cy="11.2" r="1.25" />
    <circle cx="9.6" cy="7.4" r="1.25" />
    <circle cx="14.2" cy="7.2" r="1.25" />
    <circle cx="17.1" cy="10.6" r="1.25" />
  </Icon>
);

export const IconWand = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.9 18.6 14.6 7.9a1.3 1.3 0 0 1 1.8 1.8L5.7 20.4a1.3 1.3 0 0 1-1.8-1.8Z" />
    <path d="M12.6 9.9l1.8 1.8" />
    <path d={spark(17.6, 4.2, 1.9)} />
    <path d={spark(21, 9, 1.4)} />
    <path d={spark(20, 15.6, 1.7)} />
  </Icon>
);

export const IconPencil = (p: IconProps) => (
  <Icon {...p}>
    <path d="M16.6 3.9a1.9 1.9 0 0 1 2.7 0l.8.8a1.9 1.9 0 0 1 0 2.7L9 18.5l-4.7 1.2 1.2-4.7Z" />
    <path d="M14.6 5.9l3.5 3.5" />
    <path d="M5.3 2.8v3.4M3.6 4.5H7" />
    <path d="M18.4 17.3v3.4M16.7 19h3.4" />
  </Icon>
);

export const IconShape = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7.2 5.6A8 8 0 1 1 4.4 9.4" stroke-dasharray="2.4 2.2" />
    <path d="M4.2 5.2 7.3 5.5 6.6 8.6" />
  </Icon>
);

export const IconPicture = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.8" y="3.8" width="16.4" height="16.4" rx="2.4" />
    <circle cx="9" cy="9" r="1.7" />
    <path d="M4.2 17.4l4.6-4.4 3 2.8 2.6-2.5 5.4 5" />
  </Icon>
);

export const IconUndo = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8.5 6.5 4.5 10.5l4 4" />
    <path d="M4.5 10.5h9.5a5 5 0 0 1 0 10h-3" />
  </Icon>
);

export const IconRedo = (p: IconProps) => (
  <Icon {...p}>
    <path d="M15.5 6.5l4 4-4 4" />
    <path d="M19.5 10.5H10a5 5 0 0 0 0 10h3" />
  </Icon>
);

export const IconClose = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </Icon>
);

export const IconCheck = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
);

export const IconChevronLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14.5 5.5 8 12l6.5 6.5" />
  </Icon>
);

export const IconChevronRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9.5 5.5 16 12l-6.5 6.5" />
  </Icon>
);

/** «Удиви меня»: стрелка вперёд с перекладиной. */
export const IconSurprise = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 12h17.5M15.5 7l5 5-5 5M8 7.5v9" />
  </Icon>
);

export const IconRotate = (p: IconProps) => (
  <Icon {...p}>
    <path d="M19 12a7 7 0 1 1-2.1-5" />
    <path d="M17.6 3.4v4h-4" />
  </Icon>
);

export const IconMinus = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 12h12" />
  </Icon>
);

export const IconPlus = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 6v12M6 12h12" />
  </Icon>
);

/** Подсказка у руки: тонкая изогнутая стрелка от подписи вверх-влево, к ногтям. */
export function HintArrow({ class: cls }: { class?: string }) {
  return (
    <svg class={cls} viewBox="0 0 44 27" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
      <path d="M43 21.8C33.5 25.6 21.8 25.2 13.4 18.4 9.2 15 6.2 10 4.4 3.6" />
      <path d="M1.6 9.2 4.3 3.4l4.9 4.3" />
    </svg>
  );
}
