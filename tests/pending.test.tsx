import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/preact";
import { Maybe, Pending } from "../src/components/Pending";
import { STUDIO } from "../src/data/studio";

afterEach(cleanup);

describe("<Pending>", () => {
  it("рисует «уточняется»", () => {
    const { container } = render(<Pending />);
    expect(container.textContent).toBe("уточняется");
    expect(container.querySelector(".pending")).not.toBeNull();
  });

  it("с подсказкой — «уточняется — …»", () => {
    render(<Pending hint="спроси нас в Telegram" />);
    expect(screen.getByText("уточняется — спроси нас в Telegram")).toBeTruthy();
  });

  it("<Maybe>: null из данных → «уточняется», значение → значение", () => {
    const { container } = render(
      <p>
        Часы: <Maybe value={STUDIO.hours}>{(h) => <b>{h}</b>}</Maybe>; адрес:{" "}
        <Maybe value={STUDIO.address}>{(a) => <b>{a}</b>}</Maybe>
      </p>,
    );
    expect(container.textContent).toBe("Часы: уточняется; адрес: проспект Ленина, 7, корп. 1");
  });
});
