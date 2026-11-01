"""Растровая плата руки (KIE) → векторная рука для конструктора.

    py -3 -I scripts/hands/trace.py            # обе руки
    py -3 -I scripts/hands/trace.py her        # одна

Вход:  media-src/hands/<kind>-plate-raw.png  (плата с голыми ногтевыми ложами на белом фоне)
Выход: media-src/hands/<kind>-base.svg        (рука слоями ролей: skin, shade, light, crease, outline)
       src/constructor/handArt.json            (viewBox и якоря пяти ногтей каждой руки)

Шаги: пиксели → ближайшая роль из палитры платы (Lab) → пять ногтевых лож находятся
как крупные пятна цвета «ноготь», по ним меряются якоря (кутикула, ось, ширина, длина ложа),
затем ложа закрашиваются кожей (ногти рисует код поверх) → каждый слой ролей трассируется
отдельно vtracer'ом в бинарном режиме и кладётся стопкой: силуэт кожей, тени, блики, складки, контур.
Тона кожи собирает scripts/hands/build.mjs заменой цвета каждой роли.
Якоря её руки потом переписывает scripts/hands/comp_nails.py — по ногтям утверждённого макета.

Зависимости: Pillow, numpy, scikit-image, vtracer (`py -3 -m pip install vtracer`).
"""
import json
import os
import re
import sys
import tempfile

import numpy as np
import vtracer
from PIL import Image, ImageFilter
from scipy import ndimage
from skimage.color import rgb2lab

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(ROOT, "media-src", "hands")
ART_JSON = os.path.join(ROOT, "src", "constructor", "handArt.json")

# Палитра ролей платы (замерена по her-plate-raw.png / his-plate-raw.png). Порядок = порядок слоёв.
ROLES = {
    "bg": "#ffffff",
    "skin": "#efc0a9",
    "light": "#f5cebc",
    "shade": "#d29a87",
    "crease": "#c6907c",
    "nail": "#f4d3cc",
    "ring": "#8f605b",
    "outline": "#4a2b27",
}
LAYERS = ["shade", "light", "crease", "outline"]  # поверх силуэта кожи
FINGERS = ["thumb", "index", "middle", "ring", "pinky"]

# Поля холста: сверху — место под экстра-длинный ноготь большого пальца, слева — под тень.
PAD_TOP = 300
PAD_X = 0
# Толщина тонкого ободка вокруг ложа на плате, px.
RING = 9
# Если ложе на плате торчит за подушечку — сколько px срезать, по рукам и пальцам, например {"her": {"thumb": 72.0}}.
# Сейчас не нужно: её плата исправлена правкой (her-plate-fix.txt), ноготь большого пальца короткий.
TIP_TRIM: dict = {}


def hex_rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i : i + 2], 16) for i in (0, 2, 4)], dtype=float)


def classify(rgb):
    names = list(ROLES)
    lab = rgb2lab(rgb / 255.0)
    pal = rgb2lab(np.array([[hex_rgb(ROLES[n]) for n in names]]) / 255.0)[0]
    d = ((lab[:, :, None, :] - pal[None, None, :, :]) ** 2).sum(axis=-1)
    idx = d.argmin(axis=-1)
    return idx, names, lab[..., 0]


def nail_components(role, names):
    nail = role == names.index("nail")
    nail = ndimage.binary_opening(nail, iterations=2)
    lab, n = ndimage.label(nail)
    sizes = ndimage.sum(nail, lab, range(1, n + 1))
    order = np.argsort(sizes)[::-1][:5]
    comps = []
    for k in order:
        m = lab == (k + 1)
        m = ndimage.binary_fill_holes(m)
        ys, xs = np.nonzero(m)
        comps.append((xs.mean(), m))
    if len(comps) < 5 or min(c[1].sum() for c in comps) < 2000:
        raise SystemExit("trace: не нашёл пять ногтевых лож — проверь плату")
    comps.sort(key=lambda c: c[0])  # слева направо: большой → мизинец
    return [c[1] for c in comps]


def anchor_of(mask, finger, trim=0.0):
    """Якорь ногтя по пятну ложа. trim — сколько px ложа за подушечкой срезать (см. trim_tip)."""
    ys, xs = np.nonzero(mask)
    pts = np.stack([xs, ys], axis=1).astype(float)
    c = pts.mean(axis=0)
    cov = np.cov((pts - c).T)
    w, v = np.linalg.eigh(cov)
    e1 = v[:, np.argmax(w)]
    # Большой палец смотрит вверх (свободный край сверху), остальные согнуты — край внизу.
    if finger == "thumb":
        if e1[1] > 0:
            e1 = -e1
    elif e1[1] < 0:
        e1 = -e1
    e2 = np.array([-e1[1], e1[0]])
    t = (pts - c) @ e1
    s = (pts - c) @ e2
    t0, t1 = np.percentile(t, 0.2), np.percentile(t, 99.8)
    # ширина — по средней трети ложа
    mid = (t > t0 + (t1 - t0) * 0.33) & (t < t0 + (t1 - t0) * 0.66)
    s0, s1 = np.percentile(s[mid], 0.5), np.percentile(s[mid], 99.5)
    # Меряется розовое ложе без ободка; ноготь кода должен закрыть и ободок — RING с каждой стороны.
    width = s1 - s0 + 2 * RING
    # центр кутикулы: по оси, сдвинутой в середину ширины
    sc = (s0 + s1) / 2
    cut = c + e1 * (t0 - RING) + e2 * sc
    t1 += RING - trim
    t0 -= RING
    # angle: 0 — ноготь смотрит вверх (−y), по часовой — плюс (как SVG rotate)
    angle = float(np.degrees(np.arctan2(e1[0], -e1[1])))
    anchor = {
        "x": round(float(cut[0]) + PAD_X, 1),
        "y": round(float(cut[1]) + PAD_TOP, 1),
        "angle": round(angle, 1),
        "width": round(float(width), 1),
        "bed": round(float(t1 - t0), 1),
    }
    geom = {"c": c, "e1": e1, "e2": e2, "sc": sc, "half": width / 2, "tcut": t1}
    return anchor, geom


def trim_tip(role, names, geom):
    """Ложе, торчащее за подушечку (длинный ноготь опорной картинки), срезается скруглённо:
    за дугой радиуса половины ширины с вершиной в конце нового ложа — фон, по срезу — контур."""
    H, W = role.shape
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.stack([xx - geom["c"][0], yy - geom["c"][1]], axis=-1)
    t = d @ geom["e1"]
    ds = d @ geom["e2"] - geom["sc"]
    h = geom["half"] + 22
    inside = np.abs(ds) <= h
    edge = geom["tcut"] - h + np.sqrt(np.clip(h * h - ds * ds, 0, None))
    cut = inside & (t > edge) & (role != names.index("bg"))
    out = role.copy()
    out[cut] = names.index("bg")
    rim = ndimage.binary_dilation(cut, iterations=12) & ~cut & (out != names.index("bg"))
    out[rim] = names.index("outline")
    return out


def erase_nails(role, names, L, masks):
    """Ложа и их тонкий ободок → кожа; ободок у края силуэта → контур (силуэт не рвётся)."""
    nails = np.zeros_like(masks[0])
    for m in masks:
        nails |= m
    grown = ndimage.binary_dilation(nails, iterations=18)
    bg = role == names.index("bg")
    near_bg = ndimage.binary_dilation(bg, iterations=12)
    out = role.copy()
    dark = L < 33
    ringish = (L < 75) & ~dark
    out[grown & ~dark] = names.index("skin")
    out[grown & ringish & near_bg] = names.index("outline")
    out[grown & bg] = names.index("bg")
    return out


def clean(role):
    im = Image.fromarray(role.astype(np.uint8), mode="L")
    im = im.filter(ImageFilter.ModeFilter(5))
    return np.asarray(im)


def trace_mask(mask, tmp):
    """Бинарная маска → список d-атрибутов vtracer."""
    img = np.where(mask, 0, 255).astype(np.uint8)
    p_in = os.path.join(tmp, "m.png")
    p_out = os.path.join(tmp, "m.svg")
    Image.fromarray(img, mode="L").convert("RGB").save(p_in)
    vtracer.convert_image_to_svg_py(
        p_in,
        p_out,
        colormode="binary",
        mode="spline",
        filter_speckle=6,
        corner_threshold=70,
        length_threshold=4.0,
        max_iterations=10,
        splice_threshold=45,
        path_precision=1,
    )
    svg = open(p_out, encoding="utf-8").read()
    paths = []
    for m in re.finditer(r'<path d="([^"]+)"[^>]*transform="translate\(([-\d.]+),([-\d.]+)\)"', svg):
        paths.append((m.group(1).strip(), float(m.group(2)), float(m.group(3))))
    if not paths:
        for m in re.finditer(r'<path d="([^"]+)"', svg):
            paths.append((m.group(1).strip(), 0.0, 0.0))
    return paths


def path_el(cls, d, tx, ty):
    tx += PAD_X
    ty += PAD_TOP
    tr = f' transform="translate({tx:g},{ty:g})"' if (tx or ty) else ""
    return f'<path class="{cls}" fill="{ROLES[cls] if cls in ROLES else "#000"}" d="{d}"{tr}/>'


def build(kind):
    src = os.path.join(SRC, f"{kind}-plate-raw.png")
    rgb = np.asarray(Image.open(src).convert("RGB")).astype(float)
    H, W, _ = rgb.shape
    role, names, L = classify(rgb)
    masks = nail_components(role, names)
    trims = TIP_TRIM.get(kind, {})
    measured = [anchor_of(m, f, trims.get(f, 0.0)) for m, f in zip(masks, FINGERS)]
    anchors = [a for a, _ in measured]
    role = erase_nails(role, names, L, masks)
    for (_, geom), f in zip(measured, FINGERS):
        if trims.get(f):
            role = trim_tip(role, names, geom)
    role = clean(role)

    def is_(*ns):
        return np.isin(role, [names.index(n) for n in ns])

    silhouette = ~is_("bg")
    silhouette = ndimage.binary_fill_holes(ndimage.binary_closing(silhouette, iterations=2))
    layers = {
        "skin": silhouette,
        "shade": is_("shade"),
        "light": is_("light", "nail"),
        "crease": is_("crease", "ring"),
        "outline": is_("outline"),
    }
    els = []
    with tempfile.TemporaryDirectory() as tmp:
        for cls in ["skin", *LAYERS]:
            for d, tx, ty in trace_mask(layers[cls], tmp):
                els.append(path_el(cls, d, tx, ty))
    vw, vh = W + 2 * PAD_X, H + PAD_TOP
    ys, xs = np.nonzero(silhouette)
    bounds = [int(xs.min()) + PAD_X, int(ys.min()) + PAD_TOP, int(xs.max()) + 1 + PAD_X, int(ys.max()) + 1 + PAD_TOP]
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vw} {vh}" width="{vw}" height="{vh}">'
        f'<g class="hand">{"".join(els)}</g></svg>\n'
    )
    out = os.path.join(SRC, f"{kind}-base.svg")
    with open(out, "w", encoding="utf-8", newline="\n") as f:
        f.write(svg)
    print(f"trace: {os.path.relpath(out, ROOT)} — {len(els)} путей, {len(svg) // 1024} КБ")
    return {"viewBox": [0, 0, vw, vh], "bounds": bounds, "anchors": anchors}


def main():
    kinds = sys.argv[1:] or ["her", "his"]
    art = {}
    if os.path.exists(ART_JSON):
        art = json.load(open(ART_JSON, encoding="utf-8"))
    for k in kinds:
        art[k] = build(k)
        for f, a in zip(FINGERS, art[k]["anchors"]):
            print(f"  {k} {f}: {a}")
    with open(ART_JSON, "w", encoding="utf-8", newline="\n") as f:
        json.dump(art, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"trace: {os.path.relpath(ART_JSON, ROOT)}")


if __name__ == "__main__":
    main()
