import { render, screen } from "@testing-library/react";
import { OcrSourceBadge, OcrFieldTag, OcrProgress } from "./ocrfeedback.jsx";

describe("OcrSourceBadge", () => {
  it("names Azure and shows a live indicator for a live read", () => {
    const { container } = render(<OcrSourceBadge source="azure" />);
    // Appears in both the headline and the engine chip.
    expect(screen.getAllByText(/Azure Document Intelligence/).length).toBeGreaterThan(0);
    expect(container.querySelector(".ocr-live-dot")).toBeInTheDocument();
    expect(container.querySelector(".ocr-result-accent")).toBeInTheDocument();
  });

  // "demo" was retired with the frontend mock API, so it no longer maps to a
  // sample badge — it falls through to the neutral unknown bucket. The point
  // that still matters is that nothing but a live Azure read shows the dot.
  it("renders a retired source neutrally with no live dot", () => {
    const { container } = render(<OcrSourceBadge source="demo" />);
    expect(screen.getByText(/receipt processed/i)).toBeInTheDocument();
    expect(container.querySelector(".ocr-live-dot")).not.toBeInTheDocument();
    expect(container.querySelector(".ocr-result-accent")).not.toBeInTheDocument();
    expect(container.querySelector(".ocr-result-neutral")).toBeInTheDocument();
  });

  it("explains an unavailable parse and warns rather than reassures", () => {
    const { container } = render(<OcrSourceBadge source="unavailable" />);
    expect(screen.getByText(/couldn't read/i)).toBeInTheDocument();
    expect(container.querySelector(".ocr-live-dot")).not.toBeInTheDocument();
    expect(container.querySelector(".ocr-result-warning")).toBeInTheDocument();
  });
});

describe("OcrFieldTag", () => {
  it("reads 'auto-filled' for live OCR and 'demo' otherwise", () => {
    const { rerender } = render(<OcrFieldTag live />);
    expect(screen.getByText("auto-filled")).toBeInTheDocument();
    rerender(<OcrFieldTag live={false} />);
    expect(screen.getByText("demo")).toBeInTheDocument();
  });
});

describe("OcrProgress", () => {
  it("renders the staged steps with the first one active", () => {
    const { container } = render(<OcrProgress />);
    expect(screen.getByText(/Reading your receipt/)).toBeInTheDocument();
    const steps = container.querySelectorAll(".ocr-step");
    expect(steps).toHaveLength(3);
    expect(container.querySelector(".ocr-step-active")).toBeInTheDocument();
    // marks itself busy for assistive tech
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });
});
