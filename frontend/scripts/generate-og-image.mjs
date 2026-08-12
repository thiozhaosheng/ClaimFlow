/**
 * Renders public/og-image.png (1200×630) — the link-preview card shown when
 * the site is shared in WhatsApp, Telegram, LinkedIn, etc.
 *
 * Same Editorial Ledger language as the homepage: Geist, cool slate
 * neutrals, the ruled kicker, and the brand gradient spent only on the
 * logo mark. Colours are pinned to the light palette because a link
 * preview renders on whatever background the chat app chooses.
 *
 * Run: node scripts/generate-og-image.mjs
 */
import { chromium } from "@playwright/test";

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px;
    font-family: "Geist", sans-serif;
    background: #f8fafc;
    color: #111827;
    padding: 72px 80px;
    display: flex; flex-direction: column; justify-content: space-between;
    letter-spacing: -0.006em;
  }
  .brand { display: flex; align-items: center; gap: 16px; }
  .brand svg { width: 52px; height: 52px; }
  .brand span { font-size: 30px; font-weight: 600; letter-spacing: -0.015em; }
  .kicker {
    display: flex; align-items: center; gap: 18px;
    font-size: 20px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.09em; color: #6b7280;
  }
  .kicker::after { content: ""; flex: 0 0 160px; height: 1px; background: #d1d5db; }
  h1 {
    margin-top: 28px;
    font-size: 84px; font-weight: 600; line-height: 1.06;
    letter-spacing: -0.025em;
  }
  .sub { margin-top: 26px; font-size: 30px; color: #6b7280; }
  .foot {
    display: flex; justify-content: space-between; align-items: baseline;
    border-top: 1px solid #e5e7eb; padding-top: 24px;
    font-size: 21px; color: #9ca3af;
  }
</style>
</head>
<body>
  <div class="brand">
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="a" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stop-color="#4f46e5"/><stop offset="1" stop-color="#8b5cf6"/>
        </linearGradient>
        <linearGradient id="b" x1="0" y1="50" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stop-color="#4f46e5" stop-opacity="0.9"/><stop offset="1" stop-color="#8b5cf6" stop-opacity="0.4"/>
        </linearGradient>
      </defs>
      <path d="M50 18 L82 36 L50 54 L18 36 Z" fill="url(#a)"/>
      <path d="M18 50 L50 68 L82 50" stroke="url(#b)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M18 66 L50 84 L82 66" stroke="url(#b)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span>ClaimFlow</span>
  </div>
  <div>
    <div class="kicker">Built for Singapore SMEs</div>
    <h1>Get reimbursed<br>without chasing anyone.</h1>
    <p class="sub">Capture, policy check, approval, payout — every step recorded.</p>
  </div>
  <div class="foot">
    <span>Receipt OCR · IRAS-aligned policy checks · Full audit trail</span>
  </div>
</body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: "public/og-image.png" });
await browser.close();
console.log("wrote public/og-image.png");
