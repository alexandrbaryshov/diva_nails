// «Её | Его» и тон кожи — над рукой, как в макете.
import { useRef } from "preact/hooks";
import type { JSX } from "preact";
import { TONES, type HandKind, type Tone } from "../../state/design";
import toneData from "../handTones.json";
import { mix } from "../NailFinish";
import { useStore } from "./context";
import { HAND_LABEL, TONE_LABEL } from "./labels";

/** Цвет точки тона: кожа с долей тени — так кожа читается на точке 20 px, как в макете. */
const TONE_DOTS: readonly string[] = toneData.tones.map((t) => mix(t.skin, t.shade, 0.4));

function HandToggle() {
  const s = useStore();
  const hand = s.design.value.hand;
  const btn = (h: HandKind) => (
    <button type="button" class="dn-handtoggle-btn" aria-pressed={hand === h} data-hand={h} onClick={() => hand !== h && s.setHand(h)}>
      <span class="dn-handtoggle-label">{HAND_LABEL[h]}</span>
    </button>
  );
  return (
    <div class="dn-handtoggle" role="group" aria-label="Чья рука">
      {btn("her")}
      <span class="dn-handtoggle-bar" aria-hidden="true" />
      {btn("his")}
    </div>
  );
}

/**
 * Тон кожи — один ползунок на четыре шага: точки стоят тесно, как в макете,
 * а нажимать можно по всей полосе высотой 44 px; стрелки и Home/End — с клавиатуры.
 */
function ToneSlider() {
  const s = useStore();
  const tone = s.design.value.tone;
  const root = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const nearest = (x: number): Tone => {
    const dots = [...(root.current?.querySelectorAll<HTMLElement>("[data-tone]") ?? [])];
    let best: Tone = tone;
    let dist = Infinity;
    for (const dot of dots) {
      const r = dot.getBoundingClientRect();
      const dd = Math.abs(r.left + r.width / 2 - x);
      if (dd < dist) {
        dist = dd;
        best = Number(dot.dataset.tone) as Tone;
      }
    }
    return best;
  };
  const choose = (t: Tone) => {
    if (t !== s.design.value.tone) s.apply((d) => ({ ...d, tone: t }), "tone");
  };
  const onKey = (e: JSX.TargetedKeyboardEvent<HTMLDivElement>) => {
    const next: Record<string, Tone> = {
      ArrowRight: Math.min(3, tone + 1) as Tone,
      ArrowUp: Math.min(3, tone + 1) as Tone,
      ArrowLeft: Math.max(0, tone - 1) as Tone,
      ArrowDown: Math.max(0, tone - 1) as Tone,
      Home: 0,
      End: 3,
    };
    if (!(e.key in next)) return;
    e.preventDefault();
    if (next[e.key] !== tone) s.setTone(next[e.key]);
  };

  return (
    <div
      ref={root}
      class="dn-tones"
      role="slider"
      tabIndex={0}
      aria-label="Тон кожи"
      aria-valuemin={0}
      aria-valuemax={3}
      aria-valuenow={tone}
      aria-valuetext={TONE_LABEL[tone]}
      onKeyDown={onKey}
      onPointerDown={(e) => {
        dragging.current = true;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // без захвата — просто выбор по нажатию
        }
        choose(nearest(e.clientX));
      }}
      onPointerMove={(e) => dragging.current && choose(nearest(e.clientX))}
      onPointerUp={() => {
        dragging.current = false;
        s.endGesture();
      }}
      onPointerCancel={() => {
        dragging.current = false;
        s.endGesture();
      }}
    >
      {TONES.map((t) => (
        <span key={t} class="dn-tone-dot" data-tone={t} data-current={t === tone ? "" : undefined} style={{ backgroundColor: TONE_DOTS[t] }} />
      ))}
    </div>
  );
}

export function HandBar() {
  return (
    <div class="dn-handbar">
      <HandToggle />
      <ToneSlider />
    </div>
  );
}
