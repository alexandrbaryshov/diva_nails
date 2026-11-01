// Рука конструктора: SVG-иллюстрация руки (<image href>, не инлайн-пути) и поверх — пять ногтей-контуров.
import type { JSX } from "preact";
import { Fragment } from "preact";
import { useEffect, useState, useId } from "preact/hooks";
import { shadeById, shadeLabel } from "../data/palette";
import type { Design, Print } from "../state/design";
import { nailPath } from "./geometry";
import { HANDS, NAIL_NAMES, type NailAnchor } from "./hands";
import { EFFECT_LABEL, NAIL_STROKE, NailFinish, PATTERN_LABEL, nailOutline } from "./NailFinish";
import css from "./HandView.module.css";

export interface HandViewProps {
  design: Design;
  prints?: Print[];
  selected?: number | null;
  /** ногти — кнопки: тап, Enter/пробел, стрелки между ногтями */
  interactive?: boolean;
  onNailTap?(i: number): void;
  /** вторая рука — та же картинка зеркально */
  mirrored?: boolean;
}

interface GraphicProps extends HandViewProps {
  /** префикс id внутри документа */
  uid: string;
  /** href картинки руки (по умолчанию — файл тона из HANDS) */
  handHref?: string;
  /** href принтов по номеру ногтя (data URI для карточки) */
  printHrefs?: Record<number, string>;
  /** переливающийся блик поверх хрома — только живая рука; карточка рисует хром неподвижным */
  glint?: boolean;
}

/** Блик хрома и кошачьего глаза: узкая диагональная полоса света, которая плывёт по ногтю (или идёт за наклоном телефона). */
function Glint({ id, d, a }: { id: string; d: string; a: NailAnchor }) {
  const w = a.width;
  return (
    <g class={css.glint} clip-path={`url(#${id}-c)`} pointer-events="none" aria-hidden="true">
      <defs>
        <clipPath id={`${id}-c`}>
          <path d={d} />
        </clipPath>
        <linearGradient id={`${id}-g`} gradientUnits="userSpaceOnUse" x1={-w * 0.5} y1={-w * 2.4} x2={w * 0.5} y2={-w * 1.8}>
          <stop offset="0.34" stop-color="#fff" stop-opacity="0" />
          <stop offset="0.5" stop-color="#fff" stop-opacity="0.5" />
          <stop offset="0.66" stop-color="#fff" stop-opacity="0" />
        </linearGradient>
      </defs>
      <g transform={`translate(${a.x} ${a.y}) rotate(${a.angle})`}>
        <rect class={css.glintBand} x={-w * 1.6} y={-w * 5} width={w * 3.2} height={w * 5.4} fill={`url(#${id}-g)`} />
      </g>
    </g>
  );
}

/** Описание ногтя для экранного диктора: «Безымянный: DN 22 · Вишня, хром, френч». */
export function nailDescription(design: Design, i: number): string {
  const n = design.nails[i];
  const s = n.shade ? shadeById(n.shade) : undefined;
  const parts = [s ? shadeLabel(s) : "натуральный, без покрытия"];
  if (s) parts.push(EFFECT_LABEL[n.effect]);
  if (n.pattern !== "none") parts.push(PATTERN_LABEL[n.pattern]);
  if (n.decor.length) parts.push(`декор: ${n.decor.length}`);
  return `${NAIL_NAMES[i]}: ${parts.join(", ")}`;
}

/** Рука в координатах её viewBox — <g>, который можно вставить в любой SVG. */
export function HandGraphic(props: GraphicProps) {
  const { design, prints = [], selected = null, interactive = false, onNailTap, mirrored = false, uid } = props;
  const art = HANDS[design.hand];
  const [vx, vy, vw, vh] = art.viewBox;
  const href = props.handHref ?? art.tones[design.tone];

  const focusNail = (from: SVGElement, step: number) => {
    const root = from.ownerSVGElement ?? from.closest("svg");
    const next = root?.querySelector<SVGElement>(`[data-nail="${(Number(from.dataset.nail) + step + 5) % 5}"]`);
    next?.focus();
  };

  return (
    <g transform={mirrored ? `translate(${2 * vx + vw} 0) scale(-1 1)` : undefined} data-hand={design.hand} data-mirrored={mirrored ? "" : undefined}>
      <image href={href} x={vx} y={vy} width={vw} height={vh} preserveAspectRatio="none" />
      {design.nails.map((nail, i) => {
        const a = art.anchors[i];
        const d = nailPath(design.shape, design.length, a);
        const print = prints.find((p) => p.nail === i);
        const sw = NAIL_STROKE;
        const handlers: JSX.SVGAttributes<SVGGElement> = interactive
          ? {
              role: "button",
              // в SVG атрибут чувствителен к регистру: только tabindex, не tabIndex
              tabindex: 0,
              "aria-label": nailDescription(design, i),
              "aria-pressed": selected === i,
              onClick: () => onNailTap?.(i),
              onKeyDown: (e: JSX.TargetedKeyboardEvent<SVGGElement>) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onNailTap?.(i);
                } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                  e.preventDefault();
                  focusNail(e.currentTarget, mirrored ? -1 : 1);
                } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                  e.preventDefault();
                  focusNail(e.currentTarget, mirrored ? 1 : -1);
                }
              },
            }
          : {};
        const nailGroup = (
          <g class={css.nail} data-nail={i} {...handlers}>
            {interactive && <path class={css.hit} d={d} fill="transparent" stroke="transparent" stroke-width={Math.round(a.width * 0.5)} />}
            {interactive && (
              // кольцо фокуса с клавиатуры: снаружи ореола выбора, видно только при :focus-visible
              <path class={css.focus} d={d} fill="none" stroke="#3b2a26" stroke-width={Math.round(a.width * 0.5)} stroke-linejoin="round" opacity="0" />
            )}
            {selected === i && (
              <path class={css.selected} d={d} fill="none" stroke="#c9a48e" stroke-width={Math.round(a.width * 0.34)} stroke-linejoin="round" />
            )}
            <NailFinish
              id={`${uid}-n${i}`}
              nail={nail}
              anchor={a}
              shape={design.shape}
              length={design.length}
              print={print}
              printHref={props.printHrefs?.[i]}
            />
            <path class={css.outline} d={d} fill="none" stroke={nailOutline(nail)} stroke-width={sw.toFixed(1)} stroke-linejoin="round" />
          </g>
        );
        return (
          <Fragment key={i}>
            {nailGroup}
            {/* блик вне группы ногтя: его движение не меняет рамку ногтя (ни для тапа, ни для автотестов) */}
            {props.glint && nail.shade !== null && (nail.effect === "chrome" || nail.effect === "cat-eye") && <Glint id={`${uid}-gl${i}`} d={d} a={a} />}
          </Fragment>
        );
      })}
    </g>
  );
}

/** Рука с пятью ногтями. С mirrored — вторая (зеркальная) рука с тем же дизайном. */
export function HandView(props: HandViewProps): JSX.Element {
  const uid = "h" + useId().replace(/[^A-Za-z0-9_-]/g, "_");
  const art = HANDS[props.design.hand];
  const href = art.tones[props.design.tone];
  const [decoded, setDecoded] = useState('');
  useEffect(() => {
    let active = true;
    const image = new Image();
    image.src = href;
    if (typeof image.decode !== 'function') return;
    void image.decode().then(() => {
      if (active) setDecoded(href);
      const next = new Image();
      next.src = HANDS[props.design.hand === 'her' ? 'his' : 'her'].tones[props.design.tone];
      void next.decode().catch(() => {});
    }).catch(() => {});
    return () => { active = false; };
  }, [href, props.design.hand, props.design.tone]);
  return (
    <svg
      class={[css.hand, props.interactive ? css.interactive : ""].filter(Boolean).join(" ")}
      style={{ opacity: decoded === href ? 1 : 0 }}
      viewBox={art.viewBox.join(" ")}
      role={props.interactive ? "group" : "img"}
      aria-label={props.interactive ? "Рука: нажми на ноготь, чтобы выбрать" : "Рука с дизайном маникюра"}
    >
      <HandGraphic {...props} uid={uid} glint />
    </svg>
  );
}


