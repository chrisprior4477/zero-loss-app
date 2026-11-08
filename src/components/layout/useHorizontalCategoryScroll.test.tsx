import { afterEach, expect, test } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRef } from "react";
import { useHorizontalScrollEdges } from "./useHorizontalCategoryScroll";

afterEach(cleanup);
function Row() {
  const ref = useRef<HTMLDivElement>(null);
  const edges = useHorizontalScrollEdges(ref);
  return <><div ref={ref} data-testid="row" /><button disabled={!edges.left}>Previous</button><button disabled={!edges.right}>Next</button></>;
}

test("the arrows follow scroll, resize and changes to the available cards", async () => {
  render(<Row />);
  const row = screen.getByTestId("row");
  const previous = screen.getByText("Previous"), next = screen.getByText("Next");
  let width = 300;
  Object.defineProperties(row, {
    scrollWidth: { get: () => width + row.childElementCount * 100 },
    clientWidth: { get: () => 200 },
  });
  fireEvent.resize(window);
  expect(previous).toHaveProperty("disabled", true);
  expect(next).toHaveProperty("disabled", false);
  row.scrollLeft = 50;
  fireEvent.scroll(row);
  expect(previous).toHaveProperty("disabled", false);
  expect(next).toHaveProperty("disabled", false);
  row.scrollLeft = 99.7;
  fireEvent.scroll(row);
  expect(next).toHaveProperty("disabled", true);
  await act(async () => { row.appendChild(document.createElement("div")); });
  await waitFor(() => expect(next).toHaveProperty("disabled", false));
  width = 100;
  row.scrollLeft = 0;
  fireEvent.resize(window);
  expect(previous).toHaveProperty("disabled", true);
  expect(next).toHaveProperty("disabled", true);
});
