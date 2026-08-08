import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outDir = path.join(__dirname, 'public', 'test-receipts');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const receipts = [
  {
    name: 'real-grab.png',
    width: 400,
    height: 700,
    html: `
      <html>
      <body style="margin:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f2f2f5; padding: 20px; display:flex; justify-content:center;">
        <div style="background: white; border-radius: 12px; padding: 24px; width: 320px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="background: #00B14F; color: white; border-radius: 8px; width: 48px; height: 48px; line-height: 48px; font-weight: bold; font-size: 24px; margin: 0 auto 12px;">G</div>
            <h1 style="margin: 0; font-size: 18px; color: #1c1c1c;">Here's your receipt for your ride, Rachel</h1>
          </div>
          <div style="border-top: 1px dashed #e0e0e0; border-bottom: 1px dashed #e0e0e0; padding: 16px 0; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #666; font-size: 14px;">Total</span>
              <span style="font-weight: bold; font-size: 16px;">SGD 24.50</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #666; font-size: 14px;">Includes 9% GST</span>
              <span style="font-size: 14px;">SGD 2.02</span>
            </div>
          </div>
          <div style="font-size: 13px; color: #444; line-height: 1.5; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #888;">Date</span>
              <span>18 July 2026</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #888;">Merchant</span>
              <span>GrabTaxi Holdings Pte Ltd</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #888;">GST Reg No</span>
              <span>201316157E</span>
            </div>
          </div>
          <div style="background: #f9f9f9; padding: 12px; border-radius: 8px; font-size: 12px; color: #666;">
            <strong>Pick-up:</strong> Office (Toa Payoh)<br>
            <strong>Drop-off:</strong> Client (Marina Bay)
          </div>
        </div>
      </body>
      </html>
    `
  },
  {
    name: 'real-fairprice.png',
    width: 320,
    height: 600,
    html: `
      <html>
      <body style="margin:0; font-family: 'Courier New', Courier, monospace; background-color: #fff; padding: 20px;">
        <div style="width: 280px; text-align: center; margin: 0 auto; color: #000;">
          <h2 style="margin:0 0 5px 0; font-size: 20px;">NTUC FairPrice</h2>
          <p style="margin:0; font-size: 12px;">FairPrice Hub, 1 Joo Koon Circle</p>
          <p style="margin:0 0 15px 0; font-size: 12px;">GST Reg No: M2-0012345-X</p>
          
          <div style="text-align: left; font-size: 13px; border-top: 1px dashed #000; padding-top: 10px; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between;">
              <span>18-07-26</span>
              <span>12:45 PM</span>
            </div>
          </div>
          
          <div style="text-align: left; font-size: 13px; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between;">
              <span>A4 COPY PAPER</span>
              <span>15.50</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>NESPRESSO CAPSULES</span>
              <span>22.90</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>WHITEBOARD MARKERS</span>
              <span>8.20</span>
            </div>
          </div>
          
          <div style="text-align: left; font-size: 14px; font-weight: bold; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between;">
              <span>TOTAL AMT</span>
              <span>$46.60</span>
            </div>
          </div>
          
          <div style="text-align: left; font-size: 12px;">
            <div style="display: flex; justify-content: space-between;">
              <span>CASH</span>
              <span>$50.00</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>CHANGE</span>
              <span>$3.40</span>
            </div>
            <br>
            <div style="display: flex; justify-content: space-between;">
              <span>GST 9% INCLUDED</span>
              <span>$3.85</span>
            </div>
          </div>
          <p style="margin-top: 20px; font-size: 12px;">THANK YOU FOR SHOPPING</p>
        </div>
      </body>
      </html>
    `
  },
  {
    name: 'real-paynow.png',
    width: 375,
    height: 700,
    html: `
      <html>
      <body style="margin:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #fff; padding: 0;">
        <div style="background-color: #8c1a1a; padding: 40px 20px 20px; color: white; text-align: center;">
          <h1 style="margin:0; font-size: 18px; font-weight: 500;">Transfer Successful</h1>
        </div>
        <div style="padding: 30px 20px; text-align: center;">
          <div style="font-size: 14px; color: #666; margin-bottom: 8px;">Amount Transferred</div>
          <div style="font-size: 36px; font-weight: bold; color: #111; margin-bottom: 40px;">SGD 135.00</div>
          
          <div style="text-align: left; border-top: 1px solid #eee; padding-top: 20px;">
            <div style="margin-bottom: 20px;">
              <div style="font-size: 13px; color: #666; margin-bottom: 4px;">To</div>
              <div style="font-size: 15px; font-weight: 500;">JUMBO SEAFOOD (RIVERSIDE)</div>
              <div style="font-size: 13px; color: #666;">UEN: 199000123D</div>
            </div>
            <div style="margin-bottom: 20px;">
              <div style="font-size: 13px; color: #666; margin-bottom: 4px;">When</div>
              <div style="font-size: 15px; font-weight: 500;">19 Jul 2026, 21:30</div>
            </div>
            <div style="margin-bottom: 20px;">
              <div style="font-size: 13px; color: #666; margin-bottom: 4px;">Reference ID</div>
              <div style="font-size: 15px; font-weight: 500;">202607191234567890</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }
];

async function generate() {
  const browser = await chromium.launch();
  
  for (const receipt of receipts) {
    const page = await browser.newPage({ viewport: { width: receipt.width, height: receipt.height } });
    await page.setContent(receipt.html);
    const dest = path.join(outDir, receipt.name);
    await page.screenshot({ path: dest });
    console.log('Generated ' + receipt.name);
    await page.close();
  }
  
  await browser.close();
}

generate().catch(console.error);
