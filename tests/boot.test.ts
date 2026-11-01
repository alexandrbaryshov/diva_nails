import { afterEach, describe, expect, it } from "vitest";
import { bootFromLocation, linkNotice } from "../src/state/boot";
import { createDesignStore } from "../src/state/store";
import { encodeDesign } from "../src/state/link";
import { MONTH_PRESET, PRESETS } from "../src/data/designs";

let dispose: () => void = () => {};
afterEach(() => {
  dispose();
  history.replaceState(null, "", "/diva_nails/");
});

describe("старт конструктора из адреса", () => {
  it("ссылка открывает тот же дизайн, правки сразу пишутся в адрес", () => {
    const d = PRESETS[3].design;
    history.replaceState(null, "", `/diva_nails/d/#d=${encodeDesign(d)}`);
    const s = createDesignStore(MONTH_PRESET.design);
    dispose = bootFromLocation(s, location);
    expect(s.design.value).toEqual(d);
    expect(linkNotice.value).toEqual([]);

    s.paint(1, "DN28");
    expect(location.pathname).toBe("/diva_nails/d/");
    expect(location.hash).toBe(`#d=${encodeDesign(s.design.value)}`);
  });

  it("битая ссылка — дизайн месяца и пометка; адрес исправляется на дизайн месяца", () => {
    history.replaceState(null, "", "/diva_nails/#d=garbage!");
    const s = createDesignStore(PRESETS[1].design);
    dispose = bootFromLocation(s, location);
    expect(s.design.value).toEqual(MONTH_PRESET.design);
    expect(linkNotice.value).toEqual(["bad-link"]);
    expect(location.hash).toBe(`#d=${encodeDesign(MONTH_PRESET.design)}`);
  });

  it("без ссылки адрес не трогается, пока дизайн не изменился", () => {
    history.replaceState(null, "", "/diva_nails/");
    const s = createDesignStore(MONTH_PRESET.design);
    dispose = bootFromLocation(s, location);
    expect(location.hash).toBe("");
    expect(s.canUndo.value).toBe(false);
    s.setShape("square");
    expect(location.hash).toBe(`#d=${encodeDesign(s.design.value)}`);
  });
});
