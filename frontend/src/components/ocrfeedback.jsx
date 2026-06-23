import { useEffect, useState } from "react";
import {
  ScanLine,
  Sparkles,
  FlaskConical,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { describeOcrSource } from "../lib/ocr.js";

const TONE_ICON = {
  azure: Sparkles,
  sample: FlaskConical,
  unavailable: AlertTriangle,
  unknown: CheckCircle2,
};

/**
 * Prominent banner that tells the user exactly which engine produced the
 * extracted values — live Azure Document Intelligence, demo data, or a failure.
 * This is the answer to "how do I know when real OCR is being used?".
 */
export function OcrSourceBadge({ source }) {
  const info = describeOcrSource(source);
  const Icon = TONE_ICON[info.kind] || CheckCircle2;
  return (
    <div className={`ocr-result ocr-result-${info.tone}`} role="status" aria-live="polite">
      <div className="ocr-result-icon">
        <Icon className="h-4 w-4" />
      </div>
      <div className="ocr-result-body">
        <div className="ocr-result-head">
          <strong>{info.label}</strong>
          <span className={`ocr-engine-chip ocr-engine-${info.tone}`}>
            {info.live && <span className="ocr-live-dot" aria-hidden="true" />}
            {info.engine}
          </span>
        </div>
        <p className="ocr-result-desc">{info.description}</p>
      </div>
    </div>
  );
}

/**
 * Tiny inline marker shown next to a field label when OCR auto-filled it.
 * Disappears once the user edits the field, so it always reflects reality.
 */
export function OcrFieldTag({ live }) {
  return (
    <span
      className={`ocr-field-tag ${live ? "ocr-field-tag-live" : "ocr-field-tag-sample"}`}
      title={
        live
          ? "Auto-filled from your receipt by Azure Document Intelligence"
          : "Pre-filled with demo data — please verify"
      }
    >
      {live ? <Sparkles className="h-2.5 w-2.5" /> : <FlaskConical className="h-2.5 w-2.5" />}
      {live ? "auto-filled" : "demo"}
    </span>
  );
}

const STAGES = [
  { key: "upload", label: "Uploading receipt" },
  { key: "analyze", label: "Analysing document" },
  { key: "extract", label: "Extracting merchant, amount, GST & date" },
];

/**
 * Animated, staged progress shown while a receipt is being parsed. The stages
 * advance on a timer to reassure the user that work is happening; the final
 * "extract" stage holds until the network call resolves. A scan-line sweeps the
 * panel for tactile feedback. Respects prefers-reduced-motion via CSS.
 */
export function OcrProgress() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Advance through the first stages, then hold on the last one until the
    // parent unmounts this component (i.e. the parse resolves).
    const timers = [
      setTimeout(() => setStage(1), 550),
      setTimeout(() => setStage(2), 1300),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="ocr-progress" role="status" aria-live="polite" aria-busy="true">
      <div className="ocr-progress-scan" aria-hidden="true">
        <ScanLine className="h-7 w-7" strokeWidth={1.5} />
        <span className="ocr-scanline" />
      </div>
      <p className="ocr-progress-title">Reading your receipt…</p>
      <ol className="ocr-progress-steps">
        {STAGES.map((s, i) => {
          const state = i < stage ? "done" : i === stage ? "active" : "pending";
          return (
            <li key={s.key} className={`ocr-step ocr-step-${state}`}>
              <span className="ocr-step-dot" aria-hidden="true">
                {state === "done" ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
              </span>
              <span className="ocr-step-label">{s.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
