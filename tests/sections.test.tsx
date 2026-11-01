import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { booking } from "../src/booking";
import { FAQ } from "../src/data/faq";
import { REVIEWS } from "../src/data/reviews";
import { STUDIO } from "../src/data/studio";
import { VISIT_STEPS } from "../src/data/visit";
import { WORKS } from "../src/data/works";
import { Contacts } from "../src/sections/Contacts";
import { Faq } from "../src/sections/Faq";
import { CookieNotice, Footer } from "../src/sections/Footer";
import { ForHim } from "../src/sections/ForHim";
import { HowItWorks } from "../src/sections/HowItWorks";
import { Prices } from "../src/sections/Prices";
import { Reviews } from "../src/sections/Reviews";
import { Sections } from "../src/sections";
import { Visit } from "../src/sections/Visit";
import { Works } from "../src/sections/Works";
import { store } from "../src/state/store";

const scrollIntoView = vi.fn();

beforeEach(() => {
  Element.prototype.scrollIntoView = scrollIntoView;
  scrollIntoView.mockClear();
});

afterEach(() => {
  booking.close();
  store.setHand("her");
  cleanup();
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

function withConstructorAnchor(ui: preact.ComponentChild) {
  return (
    <>
      <section id="constructor" />
      {ui}
    </>
  );
}

describe("«Нарисуй → Сохрани → Покажи мастеру»", () => {
  it("три шага с иконками, по одной строке", () => {
    const { container } = render(<HowItWorks />);
    const items = container.querySelectorAll("li");
    expect([...items].map((li) => li.querySelector("h3")?.textContent)).toEqual(["Нарисуй", "Сохрани", "Покажи мастеру"]);
    items.forEach((li) => {
      expect(li.querySelector("svg")).not.toBeNull();
      expect(li.querySelectorAll("p")).toHaveLength(1);
    });
  });
});

describe("«Работы»", () => {
  it("лента: у каждой работы фото с ленивой загрузкой, чип «уточняется» и «Хочу так же»", () => {
    const { container } = render(<Works />);
    expect(container.querySelector("section")?.id).toBe("works");
    const tiles = container.querySelectorAll("[data-work]");
    expect(tiles).toHaveLength(WORKS.length);
    expect(WORKS.length).toBeGreaterThanOrEqual(8);
    tiles.forEach((tile) => {
      expect(tile.querySelector("img")?.getAttribute("loading")).toBe("lazy");
      expect(tile.querySelector("source[type='image/avif']")).not.toBeNull();
      expect(tile.querySelector(".pending")).toBeNull();
      expect(within(tile as HTMLElement).getByRole("button", { name: "Хочу так же" })).toBeTruthy();
    });
  });

  it("«Хочу так же» открывает выбор записи", () => {
    render(<Works />);
    fireEvent.click(screen.getAllByRole("button", { name: "Хочу так же" })[0]);
    expect(booking.state.value.open).toBe(true);
  });

  it("тап открывает просмотр на весь экран: стрелки листают, Esc закрывает и возвращает фокус", () => {
    render(<Works />);
    const opener = screen.getAllByRole("button", { name: /^Открыть фото/ })[0];
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Просмотр работы" });
    expect(within(dialog).getByText(`1 из ${WORKS.length}`)).toBeTruthy();
    expect(within(dialog).queryByText("уточняется")).toBeNull();

    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(within(dialog).getByText(`2 из ${WORKS.length}`)).toBeTruthy();
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(within(dialog).getByText(`${WORKS.length} из ${WORKS.length}`)).toBeTruthy();

    fireEvent.click(within(dialog).getByRole("button", { name: "Следующая работа" }));
    expect(within(dialog).getByText(`1 из ${WORKS.length}`)).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Просмотр работы" })).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("в просмотре есть «Хочу так же»", () => {
    render(<Works />);
    fireEvent.click(screen.getAllByRole("button", { name: /^Открыть фото/ })[2]);
    const dialog = screen.getByRole("dialog", { name: "Просмотр работы" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Хочу так же" }));
    expect(booking.state.value.open).toBe(true);
  });
});

describe("«Услуги и цены»", () => {
  it("пять категорий из брифа; цены и длительность «уточняется»", () => {
    const { container } = render(<Prices />);
    expect(container.querySelector("section")?.id).toBe("prices");
    expect(container.querySelectorAll("details")).toHaveLength(8);
    expect(container.querySelectorAll("details[open]")).toHaveLength(0);
    expect(container.textContent).toContain("2 200 ₽");
  });

  it("«Записаться» у всех пяти, «Нарисовать в конструкторе» — у первых четырёх", () => {
    render(<Prices />);
    expect(screen.getAllByRole("button", { name: "Записаться" })).toHaveLength(8);
    expect(screen.getAllByRole("button", { name: "Нарисовать в конструкторе" })).toHaveLength(4);
  });

  it("«Записаться» в категории открывает выбор записи", () => {
    render(<Prices />);
    fireEvent.click(screen.getAllByRole("button", { name: "Записаться" })[1]);
    expect(booking.state.value.open).toBe(true);
  });

  it("у мужского сервиса конструктор открывается с мужской рукой и прокручивается к руке, у остальных — с женской", () => {
    render(withConstructorAnchor(<Prices />));
    const draw = screen.getAllByRole("button", { name: "Нарисовать в конструкторе" });
    fireEvent.click(draw[3]);
    expect(store.design.value.hand).toBe("her");
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    fireEvent.click(draw[0]);
    expect(store.design.value.hand).toBe("her");
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });
});

describe("«Для него»", () => {
  it("«Себе»: кнопка переключает на мужскую руку и прокручивает к ней", () => {
    render(withConstructorAnchor(<ForHim />));
    fireEvent.click(screen.getByRole("button", { name: "Открыть мужскую руку в конструкторе" }));
    expect(store.design.value.hand).toBe("his");
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("«Для неё»: сертификат к 8 Марта, дню рождения, Новому году; условия «уточняется»; ссылка в Telegram", () => {
    const { container } = render(<ForHim />);
    expect(container.querySelector("section")?.id).toBe("for-him");
    const text = container.textContent ?? "";
    expect(text).toContain("8 Марта");
    expect(text).toContain("дню рождения");
    expect(text).toContain("Новому году");
    expect(container.querySelector(".pending")?.textContent).toBe("уточняется");
    const link = screen.getByRole("link", { name: "Узнать в Telegram" });
    expect(link.getAttribute("href")).toBe(STUDIO.telegram.url);
  });
});

describe("«Как проходит визит»", () => {
  it("шесть шагов с фото и чипом; Wi-Fi и карта — фактом, чай и крафт-пакет — «уточняется»", () => {
    const { container } = render(<Visit />);
    expect(container.querySelector("section")?.id).toBe("visit");
    const steps = container.querySelectorAll("[data-step]");
    expect(steps).toHaveLength(6);
    expect([...steps].map((s) => s.querySelector("h3")?.textContent)).toEqual(VISIT_STEPS.map((s) => s.title));
    steps.forEach((s) => {
      expect(s.querySelector("img")?.getAttribute("loading")).toBe("lazy");
      expect(s.querySelector(".pending")).not.toBeNull();
    });
    const welcome = container.querySelector("[data-step='welcome']")!.textContent!;
    expect(welcome).toContain("Wi-Fi");
    expect(welcome).toContain("картой");
    expect(welcome).toMatch(/чай и кофе[^]*уточняется/i);
    expect(container.querySelector("[data-step='tools']")!.textContent).toMatch(/крафт-пакет[^]*уточняется/i);
  });

  it("мастера — только по именам из отзывов, отдельного блока «Мастера» нет", () => {
    const { container } = render(<Visit />);
    const text = container.textContent ?? "";
    for (const name of ["Алевтина", "Диана", "Елизавета"]) expect(text).toContain(name);
    expect([...container.querySelectorAll("h2, h3")].map((h) => h.textContent)).not.toContain("Мастера");
  });
});

describe("вопросы", () => {
  it("восемь вопросов; аккордеон открывается кликом и с клавиатуры", () => {
    render(<Faq />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(8);
    expect(buttons.map((b) => b.textContent)).toEqual(FAQ.map((f) => f.q));
    expect(buttons[0].getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(buttons[0]);
    expect(buttons[0].getAttribute("aria-expanded")).toBe("true");
    const panel = document.getElementById(buttons[0].getAttribute("aria-controls")!)!;
    expect(panel.hidden).toBe(false);
    fireEvent.click(buttons[0]);
    expect(buttons[0].getAttribute("aria-expanded")).toBe("false");

    buttons[0].focus();
    fireEvent.keyDown(buttons[0], { key: "ArrowDown" });
    expect(document.activeElement).toBe(buttons[1]);
    fireEvent.keyDown(buttons[1], { key: "End" });
    expect(document.activeElement).toBe(buttons[7]);
    fireEvent.keyDown(buttons[7], { key: "Home" });
    expect(document.activeElement).toBe(buttons[0]);
  });

  it("ответ без фактов — «уточняется — спроси нас в Telegram»; с фактами — факт и что ещё уточняется", () => {
    render(<Faq />);
    const buttons = screen.getAllByRole("button");
    const panelOf = (i: number) => document.getElementById(buttons[i].getAttribute("aria-controls")!)!;
    expect(panelOf(0).textContent).toContain("уточняется — спроси нас в Telegram");
    const payment = FAQ.findIndex((f) => f.id === "payment");
    expect(panelOf(payment).textContent).toContain("Картой — можно.");
    expect(panelOf(payment).textContent).toMatch(/наличные[^]*уточняется/);
    const men = FAQ.findIndex((f) => f.id === "men");
    expect(panelOf(men).textContent).toContain("Да, в студии есть мужской ногтевой сервис.");
  });
});

describe("отзывы", () => {
  it("бейдж «5.0 · 162 отзыва на Яндекс Картах» со ссылкой на оригинал", () => {
    render(<Reviews />);
    const badge = screen.getByRole("link", { name: /5\.0 · 162 отзыва на Яндекс Картах/ });
    expect(badge.getAttribute("href")).toBe(STUDIO.rating.url);
  });

  it("цитаты дословно в кавычках, пересказы — без кавычек вокруг; подписи из facts", () => {
    const { container } = render(<Reviews />);
    const quotes = REVIEWS.filter((r) => r.kind === "quote");
    const retellings = REVIEWS.filter((r) => r.kind === "retelling");
    expect(quotes).toHaveLength(2);
    expect(retellings).toHaveLength(2);
    for (const r of quotes) {
      const el = container.querySelector(`[data-review='${r.id}']`)!;
      expect(el.textContent).toContain(`«${r.text}»`);
      expect(el.textContent).toContain(r.author);
    }
    for (const r of retellings) {
      const el = container.querySelector(`[data-review='${r.id}']`)!;
      const rest = el.textContent!.replace(r.text, "");
      expect(rest).not.toMatch(/[«»"“”]/);
      expect(el.textContent).toContain(r.author);
      expect(el.textContent).toContain(r.master!);
    }
  });
});

describe("контакты", () => {
  it("адрес, телефон; часы, второй телефон и вход — «уточняется»; пять кнопок связи", () => {
    const { container } = render(<Contacts />);
    expect(container.querySelector("section")?.id).toBe("contacts");
    const text = container.textContent ?? "";
    expect(text).toContain("проспект Ленина, 7, корп. 1");
    expect(text).toContain("+7 952 759-06-59");
    expect(container.querySelectorAll(".pending").length).toBeGreaterThanOrEqual(3);
    const tel = screen.getByRole("link", { name: /Позвонить/ });
    expect(tel.getAttribute("href")).toBe("tel:+79527590659");
    expect(screen.getByRole("link", { name: /Telegram/ }).getAttribute("href")).toBe(STUDIO.telegram.url);
    expect(screen.getByRole("link", { name: /WhatsApp/ }).getAttribute("href")).toBe(STUDIO.whatsapp);
    expect(screen.getByRole("link", { name: /ВКонтакте/ }).getAttribute("href")).toBe(STUDIO.vk);
    fireEvent.click(screen.getByRole("button", { name: "Онлайн-запись" }));
    expect(booking.state.value.open).toBe(true);
  });

  it("карта не грузится, пока блок далеко; при подходе — iframe; не загрузилась — карточка адреса", async () => {
    let trigger: (visible: boolean) => void = () => {};
    class FakeObserver {
      constructor(cb: IntersectionObserverCallback) {
        trigger = (isIntersecting) => cb([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    }
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    const { container } = render(<Contacts mapTimeoutMs={20} />);
    expect(container.querySelector("iframe")).toBeNull();
    act(() => trigger(true));
    expect(container.querySelector("iframe")?.getAttribute("src")).toContain("yandex.ru/map-widget");
    await waitFor(() => expect(container.querySelector("iframe")).toBeNull());
    const fallback = container.querySelector("[data-map-fallback]")!;
    expect(fallback.textContent).toContain("проспект Ленина, 7, корп. 1");
    expect(within(fallback as HTMLElement).getByRole("link", { name: "Открыть в Яндекс Картах" }).getAttribute("href")).toBe(
      STUDIO.rating.url,
    );
  });
});

describe("подвал", () => {
  it("реквизиты ИП и ссылка на политику; ФИО — «уточняется»", () => {
    const { container } = render(<Footer />);
    const text = container.textContent ?? "";
    expect(text).toContain("ИНН 213006606123");
    expect(text).toContain("ОГРНИП 315213000010059");
    expect(container.querySelector(".pending")?.textContent).toBe("уточняется");
    expect(screen.getByRole("link", { name: "Политика конфиденциальности" }).getAttribute("href")).toMatch(/privacy\/$/);
  });

  it("уведомление о cookies — только когда Метрика включена", () => {
    const off = render(<CookieNotice enabled={false} />);
    expect(off.container.textContent).toBe("");
    off.unmount();
    render(<CookieNotice enabled />);
    expect(screen.getByText(/cookie/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Понятно" }));
    expect(screen.queryByText(/cookie/i)).toBeNull();
  });
});

describe("страница целиком", () => {
  it("якоря из шапки на месте", () => {
    const { container } = render(<Sections />);
    for (const id of ["works", "prices", "for-him", "visit", "reviews", "contacts"]) {
      expect(container.querySelector(`section#${id}`), id).not.toBeNull();
    }
  });

  it("ни одного факта вне facts.md: цен, часов, лет, «опытных мастеров», автоклава", () => {
    const { container } = render(
      <>
        <Sections />
        <Footer />
      </>,
    );
    const text = (container.textContent ?? "").replace(/\s+/g, " ");
    const banned: [string, RegExp][] = [
      ["часы работы", /\b\d{1,2}[:.]00\b|круглосуточно|ежедневно|с \d{1,2} до \d{1,2}/i],
      ["год основания", /с 20\d\d|с 19\d\d|лет на рынке|\d+ лет на рынке/i],
      ["стерилизация", /автоклав|сухожар|стерилизован/i],
      ["опытные мастера", /опытн|профессионал|лучшие мастера|сертифицированн/i],
      ["скидки", /скидк|акци[яи]|подарок/i],
    ];
    for (const [name, re] of banned) expect(text, name).not.toMatch(re);
  });
});

