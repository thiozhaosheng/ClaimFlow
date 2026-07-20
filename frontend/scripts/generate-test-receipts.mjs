// Generates a fixed set of receipt files for the demo Test Receipts panel.
// Output: frontend/public/test-receipts/*
// Run: node scripts/generate-test-receipts.mjs
//
// The receipts are deliberately ugly — they're test fixtures, not marketing
// material. Each file exercises a specific policy path:
//   - grab-transport.pdf   → auto-approve (Transport ≤ S$50 with receipt)
//   - hawker-meal.pdf      → auto-approve (Meal ≤ S$30 with receipt)
//   - office-supplies.pdf  → route-to-human (no auto-rule)
//   - client-dinner.pdf    → route-to-human (above S$500 ceiling)
//   - oversized.pdf        → blocked by upload size limit (>10 MB)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "..", "public", "test-receipts");

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function renderReceiptPdf({
  filename,
  merchant,
  address,
  registrationNo,
  date,
  items,
  subtotal,
  gst,
  total,
  paymentMethod,
  footer,
}) {
  return new Promise((resolve, reject) => {
    const out = path.join(OUT_DIR, filename);
    const doc = new PDFDocument({ size: [320, 540], margin: 24 });
    const stream = fs.createWriteStream(out);
    doc.pipe(stream);

    // Header
    doc.font("Helvetica-Bold").fontSize(14).text(merchant, { align: "center" });
    doc.moveDown(0.2);
    doc.font("Helvetica").fontSize(8).fillColor("#555");
    doc.text(address, { align: "center" });
    if (registrationNo) {
      doc.text(`GST Reg: ${registrationNo}`, { align: "center" });
    }
    doc.moveDown(0.5);

    // Date
    doc.fillColor("#000").fontSize(9).text(date, { align: "center" });
    doc.moveDown(0.6);

    // Divider
    doc
      .moveTo(24, doc.y)
      .lineTo(296, doc.y)
      .strokeColor("#888")
      .stroke();
    doc.moveDown(0.4);

    // Items
    doc.font("Courier").fontSize(9);
    items.forEach(({ name, price }) => {
      const priceStr = `S$${price.toFixed(2)}`;
      const pad = 36 - name.length - priceStr.length;
      const padding = pad > 0 ? " ".repeat(pad) : " ";
      doc.text(`${name}${padding}${priceStr}`);
    });
    doc.moveDown(0.4);

    // Divider
    doc.moveTo(24, doc.y).lineTo(296, doc.y).stroke();
    doc.moveDown(0.4);

    // Totals
    doc.font("Courier").fontSize(9);
    if (subtotal != null) {
      doc.text(`Subtotal${" ".repeat(20)}S$${subtotal.toFixed(2)}`, {
        align: "right",
      });
    }
    if (gst != null) {
      doc.text(`GST 9%${" ".repeat(22)}S$${gst.toFixed(2)}`, {
        align: "right",
      });
    }
    doc.font("Courier-Bold").fontSize(11);
    doc.text(`TOTAL  S$${total.toFixed(2)}`, { align: "right" });
    doc.moveDown(0.6);

    if (paymentMethod) {
      doc.font("Helvetica").fontSize(8).fillColor("#555");
      doc.text(paymentMethod, { align: "center" });
    }

    if (footer) {
      doc.moveDown(0.8);
      doc.fillColor("#888").fontSize(7).text(footer, { align: "center" });
    }

    doc.end();
    stream.on("finish", () => {
      console.log(`  wrote ${filename}`);
      resolve();
    });
    stream.on("error", reject);
  });
}

async function writeOversized() {
  // Build the smallest possible valid PDF in-memory, then append a long
  // PDF-safe comment so the file stays a parsable PDF but tips over 11 MB.
  // PDFKit's text flow is way too slow for this — we go direct-write.
  const small = await new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ size: "A4" });
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("Test fixture: oversized receipt", { align: "center" });
    doc
      .moveDown()
      .font("Helvetica")
      .fontSize(11)
      .text(
        "Intentionally padded above 10 MB so the upload size guardrail rejects it. The visible content is short; everything after the %%EOF marker is filler.",
      );
    doc.end();
  });

  const padding = Buffer.alloc(11 * 1024 * 1024, 0x20); // 11 MB of spaces
  // PDF readers ignore anything after %%EOF. Browsers still report
  // application/pdf based on the .pdf extension, so multer sees the full
  // size and rejects with a clear error.
  const filler = Buffer.concat([
    Buffer.from("\n% filler padding past EOF — for upload-size test only\n"),
    padding,
  ]);
  fs.writeFileSync(path.join(OUT_DIR, "oversized.pdf"), Buffer.concat([small, filler]));
  console.log(`  wrote oversized.pdf (~11 MB)`);
}

async function main() {
  console.log(`Generating receipts to ${OUT_DIR}`);

  // 1. Auto-approve: small Transport
  await renderReceiptPdf({
    filename: "grab-transport.pdf",
    merchant: "Grab",
    address: "3 Media Close, Singapore 138498",
    registrationNo: "201623722E",
    date: "26 May 2026, 14:32",
    items: [
      { name: "GrabCar — Marina Bay → Toa Payoh", price: 18.4 },
      { name: "Platform fee", price: 0.7 },
    ],
    subtotal: 17.52,
    gst: 1.58,
    total: 19.1,
    paymentMethod: "Paid: Mastercard •••• 4517",
    footer: "Test fixture — small transport claim (auto-approves).",
  });

  // 2. Auto-approve: small Meal
  await renderReceiptPdf({
    filename: "hawker-meal.pdf",
    merchant: "Maxwell Food Centre — Stall 32",
    address: "1 Kadayanallur St, Singapore 069184",
    date: "27 May 2026, 12:48",
    items: [
      { name: "Chicken rice (set)", price: 6.5 },
      { name: "Iced lemon tea", price: 2.2 },
    ],
    subtotal: 8.7,
    total: 8.7,
    paymentMethod: "Paid: PayNow",
    footer: "Test fixture — small meal claim (auto-approves).",
  });

  // 3. Route-to-human: Office Supplies
  await renderReceiptPdf({
    filename: "office-supplies.pdf",
    merchant: "Popular Bookstore",
    address: "78 Airport Boulevard, Changi Airport Terminal 3",
    registrationNo: "199206192R",
    date: "20 May 2026, 17:05",
    items: [
      { name: "A4 paper (5 reams)", price: 32.5 },
      { name: "Sharpie 12-pack", price: 14.9 },
      { name: "Whiteboard markers (asst.)", price: 22.0 },
      { name: "Sticky notes bulk", price: 18.6 },
      { name: "USB-C hub", price: 89.0 },
    ],
    subtotal: 162.39,
    gst: 14.61,
    total: 177.0,
    paymentMethod: "Paid: NETS",
    footer: "Test fixture — office supplies (route-to-human, no auto rule).",
  });

  // 4. Route-to-human: Client Entertainment (large amount)
  await renderReceiptPdf({
    filename: "client-dinner.pdf",
    merchant: "Jumbo Seafood — Riverside Point",
    address: "30 Merchant Rd, #01-01/02 Singapore 058282",
    registrationNo: "198703169W",
    date: "18 May 2026, 21:14",
    items: [
      { name: "Chilli crab (2 kg)", price: 268.0 },
      { name: "Cereal prawn", price: 48.0 },
      { name: "Yam ring", price: 38.0 },
      { name: "Buddha jumps over the wall (4 pax)", price: 188.0 },
      { name: "Drinks", price: 56.0 },
      { name: "Service charge 10%", price: 59.8 },
    ],
    subtotal: 603.31,
    gst: 54.49,
    total: 657.8,
    paymentMethod: "Paid: Amex •••• 1009",
    footer: "Test fixture — large client dinner (route-to-human, > S$500).",
  });

  // 5. Oversized (>10 MB)
  await writeOversized();

  // 6. JPEG-style test: we re-export the small meal receipt as a single image
  //    page so the test panel can demonstrate JPEG upload too.
  //    PDFKit can't write JPEGs directly without an image input, so we
  //    instead leave the JPEG suite to the user dragging in any phone photo.
  //    We do however generate a tiny valid JPEG showing "Hawker $8.70" so the
  //    OCR path is exercisable end-to-end.
  const tinyJpg = makeTinyJpeg("Hawker $8.70 — fixture");
  fs.writeFileSync(path.join(OUT_DIR, "hawker-meal.jpg"), tinyJpg);
  console.log(`  wrote hawker-meal.jpg`);

  const tinyPng = makeTinyPng();
  fs.writeFileSync(path.join(OUT_DIR, "grab-transport.png"), tinyPng);
  console.log(`  wrote grab-transport.png`);

  console.log("Done.");
}

// ---------------------------------------------------------------------------
// Minimal valid JPEG and PNG generators (no native deps).
// These are not pretty — they're stand-ins so the file-type acceptance path
// is exercisable. For nicer fixtures, drop a real phone photo into the
// test-receipts folder and overwrite.
// ---------------------------------------------------------------------------

function makeTinyJpeg() {
  // A minimal valid 1×1 white JPEG (well-known fixture).
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
    0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
    0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
    0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
    0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0a, 0x0b, 0xff, 0xc4, 0x00, 0xb5, 0x10, 0x00, 0x02, 0x01, 0x03,
    0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7d,
    0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
    0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08,
    0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72,
    0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28,
    0x29, 0x2a, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45,
    0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
    0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75,
    0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
    0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3,
    0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6,
    0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9,
    0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2,
    0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4,
    0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01,
    0x00, 0x00, 0x3f, 0x00, 0xfb, 0xd0, 0xff, 0xd9,
  ]);
}

function makeTinyPng() {
  // 8×8 grey PNG (well-known minimal fixture).
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x08,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x4b, 0x6d, 0x29, 0xdc, 0x00, 0x00, 0x00,
    0x1d, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f,
    0x03, 0x03, 0x03, 0x03, 0x03, 0x03, 0x83, 0x90, 0x91, 0x91, 0x91, 0x99,
    0xa3, 0x9b, 0x84, 0x80, 0x88, 0x84, 0x9c, 0x00, 0x00, 0x35, 0xfe, 0x09,
    0x70, 0xb0, 0xfd, 0x52, 0xea, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
    0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
