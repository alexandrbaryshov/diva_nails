---
name: Diva Nails
description: "Молочный нюд — спокойный мобильный конструктор маникюра."
colors:
  milk: "#f6f0ea"
  cream: "#fbf8f4"
  powder: "#e7cfc4"
  caramel: "#c9a48e"
  ink: "#3b2a26"
  cocoa: "#7a645c"
  caramel-deep: "#9e6542"
  caramel-deep-hover: "#8c5636"
  on-caramel-deep: "#ffffff"
typography:
  display:
    fontFamily: '"Forum", Georgia, "Times New Roman", serif'
    fontSize: "37.8px"
    fontWeight: 400
    lineHeight: "35.6px"
  headline:
    fontFamily: '"Forum", Georgia, "Times New Roman", serif'
    fontSize: "clamp(2rem, 1.5rem + 2.2vw, 2.9rem)"
    fontWeight: 400
    lineHeight: 1.1
  title:
    fontFamily: '"Forum", Georgia, "Times New Roman", serif'
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.2
  body:
    fontFamily: '"Overpass", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: '"Overpass", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    fontSize: "15px"
    lineHeight: 1.2
    letterSpacing: ".01em"
  wordmark:
    fontFamily: '"Noto Serif HK", Georgia, "Times New Roman", serif'
    fontSize: "28.2px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-.012em"
rounded:
  s: "8px"
  m: "16px"
  pill: "999px"
  link-field: "12px"
  booking: "20px"
  sheet: "24px"
spacing:
  gutter: "16px"
  button-inline: "22px"
  section-block: "56px"
components:
  button-primary:
    backgroundColor: "{colors.caramel-deep}"
    textColor: "{colors.on-caramel-deep}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
  button-primary-hover:
    backgroundColor: "{colors.caramel-deep-hover}"
  button-line:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
  button-soft:
    backgroundColor: "{colors.powder}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
  pending-chip:
    backgroundColor: "{colors.powder}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 .5em"
  link-field:
    backgroundColor: "{colors.milk}"
    textColor: "{colors.ink}"
    rounded: "{rounded.link-field}"
    padding: "0 12px"
  nav-link:
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
  booking-panel:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    rounded: "{rounded.booking}"
    padding: "8px 16px 12px"
---

# Design System: Diva Nails

## Overview

**Creative North Star: "Молочный нюд"**

Молочная и пудровая основа, тёплый бежевый, воздух и мягкие тени задают спокойную среду для выбора маникюра. Насыщенный цвет находится в ногтях, образцах покрытия и фотографиях; интерфейс поддерживает выбор.

Документ фиксирует существующую реализацию и уже выбранное направление. Первый экран утверждён 2026-10-30; для основных кнопок отдельно подтверждены тёмная карамель и белый текст. Новые визуальные направления здесь не вводятся.

**Key Characteristics:**

- Молочная основа и тёплый пудровый акцент.
- Forum в заголовках, Overpass в интерфейсе, Noto Serif HK в словесном логотипе.
- Скруглённые кнопки, мягкие тени и доступные области нажатия.
- Существующие векторные руки и параметрические SVG-ногти в центре конструктора.

Источник токенов: `src/styles/tokens.css`, `fonts.css`, `base.css`; компоненты: `src/sections/sections.css`, `Header.css`, `src/booking/booking.css`, `src/card/card.css`, `src/styles/constructor.css`. Снимок сделан по исходникам; он не заменяет визуальную приёмку в браузере.

## Colors

Палитра состоит из тёплых светлых поверхностей, коричневого текста и карамельного действия. Значения в frontmatter соответствуют CSS, отдельной синтезированной цветовой шкалы нет.

- **Primary:** `caramel-deep` — основные действия; `on-caramel-deep` — текст на них; `caramel-deep-hover` — наведение. Более светлый `caramel` остаётся в бордерах и отдельных вариантах компонентов.
- **Neutral:** `milk` — фон страницы и полей; `cream` — поверхность панелей; `ink` — основной текст и фокус; `cocoa` — вторичный текст; `powder` — мягкие акценты, метки и выделение текста.

Текущие CSS-алиасы: `--bg` → milk, `--surface` → cream, `--accent` → caramel, `--accent-soft` → powder, `--text` → ink, `--text-2` → cocoa. Основная кнопка использует явный `--c-caramel-deep`, а не `--accent`.

## Typography

Самостоятельно размещённые WOFF2: Forum 400, Overpass 400/500, Noto Serif HK 400. `fonts.css` заменяет резервные стеки из `tokens.css`; это учитывается при извлечении токенов.

- **Display:** мобильный заголовок конструктора — 37.8px / 35.6px; от 900px размер `clamp(40px, 3.6vw, 56px)`.
- **Headline:** заголовки секций используют адаптивный размер из frontmatter, межстрочный интервал 1.1.
- **Title:** заголовки третьего уровня и панели сохранения — 1.5rem / 1.2; заголовок панели записи — 1.375rem / 1.2.
- **Body:** 1rem / 1.5; вводные абзацы секций ограничены 52ch и имеют интервал 1.55.
- **Label:** общие кнопки — 15px / 1.2; видимая кнопка записи в шапке — 13px, от 900px — 15px.
- **Wordmark:** 28.2px на мобильном экране, 32px от 900px.

Страница политики использует базовые стили и резервные шрифты: её нельзя считать доказательством загрузки фирменных WOFF2 на всех страницах.

## Layout

Мобильная компоновка является исходной. При ширине от 900px появляется навигация в шапке, конструктор располагает руку слева и инструменты справа. На узком экране инструменты находятся снизу. Высота шапки — 66px, от 900px — 72px; максимальная ширина её содержимого — 1440px.

Основной `--gutter` — 16px. У секций отступ по вертикали 56px, по горизонтали `max(20px, calc((100% - 1120px) / 2))`; секция шагов имеет собственные отступы 40px / 48px. Это наблюдаемые размеры, а не единая выдуманная шкала.

Минимальная интерактивная область — 44px. У кнопки записи видимая капсула 115 × 34px находится внутри области высотой 44px; на широком экране капсула 132 × 40px. Панель записи шириной не более 352px закреплена под шапкой. Панель сохранения шириной не более 480px появляется снизу на мобильном экране и по центру на широком, учитывает нижнюю безопасную область.

## Elevation & Depth

Светлые поверхности и полупрозрачные тёплые границы дают базовое разделение. Мягкие коричневые тени отделяют карточки и открытые панели.

- Секции: `-6px 12px 26px -14px rgb(122 100 92 / 0.45)`.
- Панель записи: `0 2px 6px rgb(59 42 38 / 0.06), -10px 22px 44px -12px rgb(122 100 92 / 0.32)`.
- Панель сохранения: `0 -12px 40px -12px rgb(59 42 38 / 0.35)`.
- Изображение карточки: `0 2px 6px rgb(59 42 38 / 0.08), -8px 16px 32px -10px rgb(122 100 92 / 0.35)`.

Шапка имеет z-index 40, запись — 60, затемнение и панель сохранения — 80. Фон затемнения — `rgb(59 42 38 / 0.45)`.

## Shapes

Базовые радиусы — 8px и 16px, капсулы — 999px. Поле ссылки и превью карточки имеют радиус 12px; панель записи — 20px, панель сохранения — 24px. На мобильном экране скруглены верхние углы панели сохранения, на широком — все углы.

Силуэты рук берутся из существующих SVG; форма ногтей строится параметрически. Документ не разрешает заменять эти исходные изображения или менять утверждённый силуэт.

## Components

- **Основная кнопка (`.btn-main`):** капсула, тёмная карамель / белый, отступы 0 22px, минимальная высота 44px. Наведение — `caramel-deep-hover`.
- **Контурная кнопка (`.btn-line`):** прозрачная, граница ink 35%, при наведении powder 45%.
- **Мягкая кнопка (`.btn-soft`):** powder / ink; при наведении существующее локальное значение `#dfc2b4`.
- **Метка (`.pending`):** powder / ink, 0 .5em, размер .875em, интервал 1.6. Показывает «уточняется» для неподтверждённых сведений, не является кнопкой.
- **Поле ссылки (`.sv-link`):** milk / ink, граница caramel 1px, радиус 12px, минимальная высота 44px, отступы 0 12px, размер .875rem.
- **Навигация:** скрыта до 900px; ссылки с областью от 44px, горизонтальными отступами 12px, капсульным наведением powder 45%.
- **Панель записи:** cream / ink, радиус 20px, отступы 8px 16px 12px; варианты действий имеют высоту от 56px и радиус 16px.
- **Панель сохранения:** её кнопки имеют высоту от 52px и радиус 16px. Вариант `.sv-btn-main` использует `#9e6542` / белый, но собственное состояние наведения `#8d5a3a`; это существующее отличие от общей кнопки.
- **Конструктор:** исходная SVG-рука, параметрические ногти, переключатель руки и четыре шага тона кожи. Сохраняются текущие размеры управления и расположение первого экрана.

Глобальный клавиатурный фокус: контур 2px цвета ink с отступом 2px. Общие кнопки меняют фон и границу за 160ms с `cubic-bezier(.22, 1, .36, 1)`. В базовых стилях есть `prefers-reduced-motion`: анимации и переходы сокращаются до 0.01ms, плавная прокрутка отключается. Это описание реализации, не отдельное заключение об аудите доступности.

## Do's and Don'ts

- **Do** сохранять утверждённый «Молочный нюд», тёмную карамель основных кнопок и белый текст.
- **Do** использовать существующие токены, локальные WOFF2 и области нажатия от 44px.
- **Do** сохранять оригинальные SVG-руки и текущую параметрическую геометрию ногтей.
- **Do** показывать «уточняется» для неподтверждённых сведений студии.
- **Don't** заменять утверждённый первый экран новым визуальным направлением без отдельного запроса.
- **Don't** выдавать синтезированные оттенки, размеры или компоненты за существующую систему.
- **Don't** убирать видимый клавиатурный фокус или поддержку уменьшенного движения.
