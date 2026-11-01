"""Якоря ногтей её руки — по ногтям утверждённого макета (а не по ложам платы).

    py -3 -I scripts/hands/comp_nails.py

Вход:  .impeccable/mocks/comp-1.png (только чтение), src/constructor/handArt.json (bounds её руки)
Выход: src/constructor/handArt.json — anchors руки «her»; у большого пальца обеих рук — cap/taper
       (палец виден сбоку, ноготь в перспективе сужается к краю, как в макете).

Запускать после scripts/hands/trace.py (тот пишет якоря по ложам платы).

Как меряется: внутренность каждого ногтя макета — пиксели внутри его контура (светлые для нюда,
вишнёвые для безымянного), центральная линия контура — эта область, расширенная на полтолщины обводки.
По ней — ось (главная компонента), кутикула (крайняя точка оси со стороны пальца), длина и наибольшая
ширина. Пиксели макета → единицы руки — тем же кадром, что плата (scripts/hands/build.mjs: COMP_HAND).
Ширина и длина ложа выводятся из формы «овал / короткие» (src/constructor/geometry.ts):
длина ногтя = bed + 0.3·width, у края ноготь шире ложа в 1.036 раза.
"""
import json
import os

import numpy as np
from PIL import Image
from scipy import ndimage
from skimage.color import rgb2lab

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
COMP = os.path.join(ROOT, ".impeccable", "mocks", "comp-1.png")
ART_JSON = os.path.join(ROOT, "src", "constructor", "handArt.json")

# Кадр платы в макете — как в scripts/hands/build.mjs: область «hand» начинается на y = 860 px макета,
# контур руки в ней — от x = 183 до x = 1229, верх силуэта — на 39 px ниже верха области.
REGION_TOP = 860
COMP_HAND = {"x0": 183, "y0": 39, "x1": 1229}

# Точка внутри каждого ногтя и окно поиска, px макета (1536×2752).
SEEDS = {"thumb": (340, 1060), "index": (520, 1300), "middle": (670, 1440), "ring": (770, 1640), "pinky": (940, 1640)}
WINDOWS = {
    "thumb": (250, 880, 440, 1210),
    "index": (430, 1150, 630, 1460),
    "middle": (570, 1310, 780, 1620),
    "ring": (660, 1490, 880, 1800),
    "pinky": (830, 1510, 1050, 1750),
}
FINGERS = ["thumb", "index", "middle", "ring", "pinky"]

# Форма «овал / короткие» из geometry.ts
TIP_OVAL = 0.3
FLARE_SHORT_OVAL = 1 + 0.03 + TIP_OVAL * 0.02
# Большой палец виден сбоку: подогнано по профилю ширины его ногтя в макете (ошибка ≈ 1 px).
THUMB_VIEW = {"cap": 3.76, "taper": 0.73}
THUMB_NOMINAL = 71.1 / 58.9  # номинальная ширина (до сужения) к наибольшей видимой


def nail_mask(lab, k):
    L, A, B = lab[..., 0], lab[..., 1], lab[..., 2]
    x0, y0, x1, y1 = WINDOWS[k]
    sub = np.s_[y0:y1, x0:x1]
    if k == "ring":
        inside = (A[sub] > 36) | ((B[sub] < 6) & (L[sub] > 70)) | ((A[sub] > 20) & (L[sub] > 40) & (B[sub] < 12))
        inside = ndimage.binary_opening(inside, iterations=1)
    else:
        inside = L[sub] > 62  # всё светлее обводки
    lab_, _ = ndimage.label(inside)
    sx, sy = SEEDS[k]
    m = lab_ == lab_[sy - y0, sx - x0]
    m = ndimage.binary_fill_holes(ndimage.binary_closing(ndimage.binary_fill_holes(m), iterations=2))
    m = ndimage.binary_dilation(m, iterations=3)  # до середины обводки
    ys, xs = np.nonzero(m)
    return np.stack([xs + x0, ys + y0], 1).astype(float)


def measure(pts, k):
    c = pts.mean(0)
    w, v = np.linalg.eigh(np.cov((pts - c).T))
    e1 = v[:, np.argmax(w)]
    # большой палец смотрит вверх (свободный край сверху), остальные согнуты — край внизу
    if (k == "thumb") == (e1[1] > 0):
        e1 = -e1
    e2 = np.array([-e1[1], e1[0]])
    t = (pts - c) @ e1
    s = (pts - c) @ e2
    t0, t1 = t.min(), t.max()
    widths = []
    for f in np.linspace(0.05, 0.95, 37):
        sel = np.abs(t - (t0 + (t1 - t0) * f)) < 1.0
        if sel.any():
            widths.append(s[sel].max() - s[sel].min())
    cut = c + e1 * t0
    angle = float(np.degrees(np.arctan2(e1[0], -e1[1])))
    return cut, angle, float(t1 - t0), float(max(widths))


def main():
    art = json.load(open(ART_JSON, encoding="utf-8"))
    bx0, by0, bx1, _ = art["her"]["bounds"]
    scale = (bx1 - bx0) / (COMP_HAND["x1"] - COMP_HAND["x0"])  # единиц руки на px макета
    to_u = lambda px, py: (bx0 + (px - COMP_HAND["x0"]) * scale, by0 + (py - REGION_TOP - COMP_HAND["y0"]) * scale)

    rgb = np.asarray(Image.open(COMP).convert("RGB")).astype(float)
    lab = rgb2lab(rgb / 255.0)
    anchors = []
    for k in FINGERS:
        cut, angle, length, wmax = measure(nail_mask(lab, k), k)
        x, y = to_u(*cut)
        if k == "thumb":
            width = wmax * THUMB_NOMINAL / FLARE_SHORT_OVAL * scale
        else:
            width = wmax / FLARE_SHORT_OVAL * scale
        L = length * scale
        a = {"x": round(x, 1), "y": round(y, 1), "angle": round(angle, 1), "width": round(width, 1), "bed": round(L - TIP_OVAL * width, 1)}
        if k == "thumb":
            a.update(THUMB_VIEW)
        anchors.append(a)
        print(f"  her {k}: comp {length:.0f}x{wmax:.0f} px -> {a}")
    art["her"]["anchors"] = anchors
    # его рука: якоря по ложам платы (trace.py), большой палец — в той же перспективе, что её
    his_thumb = art["his"]["anchors"][0]
    if "taper" not in his_thumb:
        his_thumb["width"] = round(his_thumb["width"] * THUMB_NOMINAL, 1)
        his_thumb.update(THUMB_VIEW)
    with open(ART_JSON, "w", encoding="utf-8", newline="\n") as f:
        json.dump(art, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"comp_nails: {os.path.relpath(ART_JSON, ROOT)}")


if __name__ == "__main__":
    main()
