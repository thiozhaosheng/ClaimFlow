import { render, screen } from "@testing-library/react";
import { OcrSourceBadge, OcrFieldTag, OcrProgress } from "./ocrfeedback.jsx";

describe("OcrSourceBadge", () => {
  it("says the receipt was read live, in plain words, with a live indicator", () => {
    const { container } = render(<OcrSourceBadge source="azure" />);
    expect(screen.getByText(/read from your receipt/i)).toBeInTheDocument();
    expect(screen.getByText(/live scan/i)).toBeInTheDocument();
    // The claimant-facing badge names no vendor — "Azure Document
    // Intelligence" is jargon to the person claiming a kopi.
    expect(screen.queryByText(/azure/i)).not.toBeInTheDocument();
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
  it("reads 'from receipt' for live OCR and 'demo' otherwise", () => {
    const { rerender } = render(<OcrFieldTag live />);
    expect(screen.getByText("from receipt")).toBeInTheDocument();
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
