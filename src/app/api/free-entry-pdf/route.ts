import { NextRequest } from "next/server";
import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";
import { demoProducts, getDemoProduct } from "@/lib/catalog/demo-products";

export const runtime = "nodejs";

const CODE39: Record<string, string> = {
  "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn", "4": "nnnwwnnnw", "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw", "8": "wnnwnnwnn", "9": "nnwwnnwnn",
  A: "wnnnnwnnw", B: "nnwnnwnnw", C: "wnwnnwnnn", D: "nnnnwwnnw", E: "wnnnwwnnn", F: "nnwnwwnnn", G: "nnnnnwwnw", H: "wnnnnwwnn", I: "nnwnnwwnn", J: "nnnnwwwnn",
  K: "wnnnnnnww", L: "nnwnnnnww", M: "wnwnnnnwn", N: "nnnnwnnww", O: "wnnnwnnwn", P: "nnwnwnnwn", Q: "nnnnnnwww", R: "wnnnnnwwn", S: "nnwnnnwwn", T: "nnnnwnwwn",
  U: "wwnnnnnnw", V: "nwwnnnnnw", W: "wwwnnnnnn", X: "nwnnwnnnw", Y: "wwnnwnnnn", Z: "nwwnwnnnn", "-": "nwnnnnwnw", "*": "nwnnwnwnn",
};

function safeText(value: string | null, fallback: string, maxLength: number) {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, maxLength) : fallback;
}

function fitText(text: string, font: PDFFont, size: number, maxWidth: number) {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let shortened = text;
  while (shortened.length > 1 && font.widthOfTextAtSize(`${shortened}...`, size) > maxWidth) shortened = shortened.slice(0, -1);
  return `${shortened}...`;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const product = getDemoProduct(params.get("offering") ?? "") ?? demoProducts[0];
  const name = safeText(params.get("name"), "Chris P.", 80);
  const account = safeText(params.get("account"), "DEMO-ACCOUNT-001", 80);
  const reference = safeText(params.get("reference"), "ZL-DEMO001", 24).toUpperCase();

  const document = await PDFDocument.create();
  const page = document.addPage([612, 792]);
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const mono = await document.embedFont(StandardFonts.CourierBold);

  const label = { x: 171, y: 540, width: 270, height: 180 };
  const navy = rgb(0, 19 / 255, 46 / 255);
  const blue = rgb(6 / 255, 122 / 255, 187 / 255);
  const orange = rgb(180 / 255, 61 / 255, 0);
  const slate = rgb(71 / 255, 85 / 255, 105 / 255);

  const dash = 5;
  const gap = 3;
  for (let x = label.x; x < label.x + label.width; x += dash + gap) {
    const width = Math.min(dash, label.x + label.width - x);
    page.drawLine({ start: { x, y: label.y }, end: { x: x + width, y: label.y }, thickness: 1.2, color: slate });
    page.drawLine({ start: { x, y: label.y + label.height }, end: { x: x + width, y: label.y + label.height }, thickness: 1.2, color: slate });
  }
  for (let y = label.y; y < label.y + label.height; y += dash + gap) {
    const height = Math.min(dash, label.y + label.height - y);
    page.drawLine({ start: { x: label.x, y }, end: { x: label.x, y: y + height }, thickness: 1.2, color: slate });
    page.drawLine({ start: { x: label.x + label.width, y }, end: { x: label.x + label.width, y: y + height }, thickness: 1.2, color: slate });
  }
  page.drawRectangle({ x: label.x + 7, y: label.y + 7, width: label.width - 14, height: label.height - 14, borderColor: rgb(203 / 255, 213 / 255, 225 / 255), borderWidth: 0.6 });

  const centered = (text: string, y: number, font: PDFFont, size: number, color = navy) => {
    const fitted = fitText(text, font, size, label.width - 28);
    page.drawText(fitted, { x: label.x + (label.width - font.widthOfTextAtSize(fitted, size)) / 2, y, size, font, color });
  };

  centered("ZERO LOSS AMOE ENTRY INSERT", 699, bold, 7.5, blue);
  centered(`Entrant: ${name}  |  Account: ${account}`, 680, regular, 7.5, slate);
  centered(`Offering: ${product.title}`, 668, regular, 7.5, slate);

  const encoded = `*${reference}*`;
  const units = [...encoded].reduce((total, character) => total + [...(CODE39[character] ?? CODE39["-"])].reduce((sum, width) => sum + (width === "w" ? 2.5 : 1), 0) + 1, 0);
  const unit = Math.min(1.05, 190 / units);
  let barX = label.x + (label.width - units * unit) / 2;
  for (const character of encoded) {
    const pattern = CODE39[character] ?? CODE39["-"];
    for (const [index, widthCode] of [...pattern].entries()) {
      const width = (widthCode === "w" ? 2.5 : 1) * unit;
      if (index % 2 === 0) page.drawRectangle({ x: barX, y: 620, width, height: 35, color: rgb(0, 0, 0) });
      barX += width;
    }
    barX += unit;
  }

  centered(reference, 609, mono, 7.5, navy);
  centered("Attach securely to a standard postcard. Keep the barcode flat,", 590, regular, 6.2, slate);
  centered("uncovered, and readable.", 581, regular, 6.2, slate);
  centered("PROTOTYPE - DO NOT MAIL", 564, bold, 6.5, orange);
  centered("CUT ALONG DOTTED LINE", 532, bold, 6, slate);

  const bytes = await document.save();
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="zero-loss-${product.slug}-entry-insert.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
