// «Нарисуй → Сохрани → Покажи мастеру»: три шага с тонкими иконками и одной строкой.
import type { JSX } from "preact";

function StepIcon({ children }: { children: JSX.Element | JSX.Element[] }) {
  return (
    <svg
      class="how-icon"
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.1"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

const STEPS: { title: string; line: string; icon: JSX.Element }[] = [
  {
    title: "Нарисуй",
    line: "Тапни на ноготь и выбери цвет, форму и узор — как на настоящей руке.",
    icon: (
      <StepIcon>
        <path d="M4 20l1-4.2L16.3 4.5a1.9 1.9 0 0 1 2.7 0l.5.5a1.9 1.9 0 0 1 0 2.7L8.2 19z" />
        <path d="M14.5 6.4l3.1 3.1" />
      </StepIcon>
    ),
  },
  {
    title: "Сохрани",
    line: "Получится карточка-бриф: рисунок, оттенки и ссылка на твой дизайн.",
    icon: (
      <StepIcon>
        <rect x="6" y="3" width="12" height="18" rx="2.6" />
        <path d="M12 8.5v6.2M9.4 12.3l2.6 2.6 2.6-2.6" />
      </StepIcon>
    ),
  },
  {
    title: "Покажи мастеру",
    line: "Пришли её в Telegram или покажи в студии — мастер поймёт с полуслова.",
    icon: (
      <StepIcon>
        <path d="M2.5 12S6 5.6 12 5.6 21.5 12 21.5 12 18 18.4 12 18.4 2.5 12 2.5 12z" />
        <circle cx="12" cy="12" r="2.9" />
      </StepIcon>
    ),
  },
];

export function HowItWorks() {
  return (
    <section class="sec how" aria-labelledby="how-title">
      <h2 id="how-title" class="sr-only">
        Как это работает
      </h2>
      <ol class="how-list">
        {STEPS.map((s) => (
          <li key={s.title} class="how-step">
            {s.icon}
            <div>
              <h3>{s.title}</h3>
              <p>{s.line}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}