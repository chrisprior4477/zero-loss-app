import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

export const runtime = "nodejs";
type CampaignKey = "products" | "fulfillment" | "campaign" | "other" | "restaurant" | "tools";

const campaigns: Record<CampaignKey, { brand: string; title: string; reward: string; value: string; original: string; generated: string }> = {
  products: { brand: "HARBOR COFFEE", title: "Win a better morning.", reward: "Coffee Explorer Collection and one year of remarkable coffee", value: "$249", original: "harbor-coffee-board.png", generated: "harbor-coffee-campaign.png" },
  fulfillment: { brand: "NORTHSTAR REWARDS", title: "A reward made for you.", reward: "$150 dining, travel, shopping, or entertainment reward", value: "$150", original: "northstar-rewards-board.png", generated: "northstar-rewards-campaign.png" },
  campaign: { brand: "TRAILBOUND ADVENTURES", title: "Trade the routine for the ridgeline.", reward: "A mountain escape, guided trail day, and outdoor gear for four", value: "$1,200", original: "trailbound-adventures-board.png", generated: "trailbound-adventures-campaign.png" },
  other: { brand: "BUILD WITH MAYA", title: "Build the setup you actually want.", reward: "A creator-curated performance PC and complete desk package", value: "$2,499", original: "maya-chen-creator-board.png", generated: "maya-chen-creator-campaign.png" },
  restaurant: { brand: "BELLAMORA ITALIAN KITCHEN", title: "Dinner is on us.", reward: "A memorable Italian dinner for two with a $150 dining gift card", value: "$150", original: "bellamora-originals.png", generated: "bellamora-campaign.png" },
  tools: { brand: "FORGE & FIELD SUPPLY", title: "Build more. Spend less.", reward: "Professional tools and jobsite equipment from a ten-listing launch catalog", value: "$299", original: "forge-field-originals.png", generated: "forge-field-campaign.png" },
};

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const output: string[] = []; let line = "";
  for (const word of text.split(" ")) { const next = line ? `${line} ${word}` : word; if (font.widthOfTextAtSize(next, size) <= width) line = next; else { if (line) output.push(line); line = word; } }
  if (line) output.push(line); return output;
}

function drawQrLabel(page: PDFPage, qr: Awaited<ReturnType<PDFDocument["embedPng"]>>, x: number, y: number, size: number, bold: PDFFont) {
  page.drawRectangle({ x: x - 8, y: y - 8, width: size + 112, height: size + 16, color: rgb(1, 1, 1) });
  page.drawImage(qr, { x, y, width: size, height: size });
  page.drawText("ENTER THROUGH", { x: x + size + 9, y: y + size / 2 + 7, size: 7.5, font: bold, color: rgb(0, 19 / 255, 46 / 255) });
  page.drawText("ZERO LOSS", { x: x + size + 9, y: y + size / 2 - 5, size: 11, font: bold, color: rgb(0, 19 / 255, 46 / 255) });
}

export async function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("case") as CampaignKey | null; const key = requested && campaigns[requested] ? requested : "products"; const campaign = campaigns[key];
  const format = request.nextUrl.searchParams.get("format") === "cards" ? "card" : "flyer"; const design = request.nextUrl.searchParams.get("design") === "generated" ? "generated" : "original";
  const document = await PDFDocument.create(); const regular = await document.embedFont(StandardFonts.Helvetica); const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const image = await document.embedPng(await readFile(path.join(process.cwd(), "public", "business-demo", campaign[design])));
  const destination = key === "tools" ? "forge-field" : key === "restaurant" ? "bellamora" : key;
  const qrData = await QRCode.toDataURL(`${request.nextUrl.origin}/business-preview/${destination}`, { width: 420, margin: 1, errorCorrectionLevel: "H", color: { dark: "#00132e", light: "#ffffff" } });
  const qr = await document.embedPng(Buffer.from(qrData.split(",")[1], "base64"));
  const navy = rgb(0, 19 / 255, 46 / 255); const green = rgb(49 / 255, 232 / 255, 0); const cyan = rgb(0, 185 / 255, 1); const cream = rgb(.97, .95, .89);

  if (format === "card") {
    const page = document.addPage([432, 288]);
    page.drawRectangle({ x: 0, y: 0, width: 432, height: 288, color: navy });
    page.drawImage(image, { x: 144, y: 0, width: 288, height: 288 });
    page.drawRectangle({ x: 0, y: 0, width: 216, height: 288, color: navy });
    page.drawText(campaign.brand, { x: 18, y: 254, size: 7.5, font: bold, color: rgb(.45, .93, 1) });
    let y = 222; for (const line of wrap(campaign.title, bold, 22, 172).slice(0, 4)) { page.drawText(line, { x: 18, y, size: 22, font: bold, color: rgb(1, 1, 1) }); y -= 24; }
    y -= 4; for (const line of wrap(campaign.reward, regular, 8.5, 168).slice(0, 5)) { page.drawText(line, { x: 18, y, size: 8.5, font: regular, color: rgb(.8, .86, .91) }); y -= 11; }
    page.drawText(`${campaign.value} VALUE`, { x: 18, y: 88, size: 10, font: bold, color: green });
    page.drawText("ENTER FOR $1", { x: 18, y: 73, size: 9, font: bold, color: rgb(1, 1, 1) });
    drawQrLabel(page, qr, 18, 12, 44, bold);
  } else {
    const page = document.addPage([612, 792]); page.drawRectangle({ x: 0, y: 0, width: 612, height: 792, color: cream }); page.drawImage(image, { x: 0, y: 384, width: 612, height: 612 });
    page.drawRectangle({ x: 0, y: 384, width: 612, height: 408, color: navy, opacity: .25 }); page.drawText(`ZERO LOSS  x  ${campaign.brand}`, { x: 42, y: 748, size: 15, font: bold, color: rgb(1, 1, 1) });
    let y = 450; for (const line of wrap(campaign.title, bold, 38, 520).slice(0, 3)) { page.drawText(line, { x: 42, y, size: 38, font: bold, color: rgb(1, 1, 1) }); y -= 41; }
    page.drawText(`${campaign.value} VALUE`, { x: 42, y: 330, size: 18, font: bold, color: rgb(.09, .55, 0) }); y = 292; for (const line of wrap(campaign.reward, regular, 17, 500)) { page.drawText(line, { x: 42, y, size: 17, font: regular, color: rgb(.18, .28, .37) }); y -= 23; }
    page.drawRectangle({ x: 42, y: 72, width: 300, height: 62, color: cyan }); page.drawText("ENTER FOR $1", { x: 116, y: 94, size: 20, font: bold, color: navy }); drawQrLabel(page, qr, 395, 66, 70, bold);
    page.drawText("Campaign concept only - QR destination, dates, eligibility, and official rules require approval.", { x: 42, y: 32, size: 7, font: regular, color: rgb(.35, .4, .45) });
  }
  const bytes = await document.save(); return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="zero-loss-${key}-${format}.pdf"`, "Cache-Control": "no-store" } });
}
