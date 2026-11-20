import { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";
import { freeEntryProduct } from "@/lib/catalog/shopping-catalog";

export const runtime = "nodejs";

const CODE39: Record<string, string> = {
  "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn", "4": "nnnwwnnnw", "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw", "8": "wnnwnnwnn", "9": "nnwwnnwnn",
  A: "wnnnnwnnw", B: "nnwnnwnnw", C: "wnwnnwnnn", D: "nnnnwwnnw", E: "wnnnwwnnn", F: "nnwnwwnnn", G: "nnnnnwwnw", H: "wnnnnwwnn", I: "nnwnnwwnn", J: "nnnnwwwnn",
  K: "wnnnnnnww", L: "nnwnnnnww", M: "wnwnnnnwn", N: "nnnnwnnww", O: "wnnnwnnwn", P: "nnwnwnnwn", Q: "nnnnnnwww", R: "wnnnnnwwn", S: "nnwnnnwwn", T: "nnnnwnwwn",
  U: "wwnnnnnnw", V: "nwwnnnnnw", W: "wwwnnnnnn", X: "nwnnwnnnw", Y: "wwnnwnnnn", Z: "nwwnwnnnn", "-": "nwnnnnwnw", "*": "nwnnwnwnn",
};

function safeText(value: string | null, fallback: string, maxLength: number) {
  const normalized = value?.trim().normalize("NFC").replace(/\s+/gu, " ");
  return normalized ? Array.from(normalized).slice(0, maxLength).join("") : fallback;
}

function supportsText(font: PDFFont, text: string) {
  const characters = new Set(font.getCharacterSet());
  return Array.from(text).every(character => characters.has(character.codePointAt(0)!));
}

export async function GET(request: NextRequest) {
  const offering = request.nextUrl.searchParams.get("offering");
  if (["name", "account", "reference"].some(key => request.nextUrl.searchParams.has(key))) {
    const instructions = new URL("/free-entry", request.url);
    if (offering) instructions.searchParams.set("offering", offering);
    return Response.redirect(instructions, 303);
  }
  return printPdf(request, offering, null, null, null);
}

export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  if (!form) return new Response("Print details could not be read.", { status: 400 });
  const field = (key: string) => {
    const value = form.get(key);
    return typeof value === "string" ? value : null;
  };
  return printPdf(request, field("offering"), field("name"), field("account"), field("reference"));
}

async function printPdf(request: NextRequest, offering: string | null, entrant: string | null, accountReference: string | null, entryReference: string | null) {
  const product = await freeEntryProduct(offering);
  if (product === undefined) return new Response("Prize availability is temporarily unavailable. Return to your free-entry instructions and try again.", { status: 503 });
  if (!product) return Response.redirect(new URL("/browse", request.url), 303);
  const name = safeText(entrant, "LEGAL NAME NEEDED", 80);
  const account = safeText(accountReference, "DEMO ACCOUNT NEEDED", 80);
  const rawReference = entryReference?.trim().toUpperCase() ?? "";
  const reference = /^[A-Z0-9-]{1,24}$/.test(rawReference) ? rawReference : "ZL-DEMO001";

  const document = await PDFDocument.create();
  const page = document.addPage([612, 792]);
  let regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const mono = await document.embedFont(StandardFonts.CourierBold);
  const variableText = `${name}${account}${product.title}`;
  if (!supportsText(regular, variableText)) {
    document.registerFontkit(fontkit);
    const fontBytes = await readFile(path.join(process.cwd(), "src/lib/compliance/fonts/NotoSans-Regular.ttf"));
    regular = await document.embedFont(fontBytes, { subset: true });
    if (!supportsText(regular, variableText)) {
      return new Response("Use Open print dialog to print every character in your entry details.", { status: 422 });
    }
  }

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
    const width = font.widthOfTextAtSize(text, size);
    const fittedSize = width > label.width - 28 ? size * (label.width - 28) / width : size;
    page.drawText(text, { x: label.x + (label.width - font.widthOfTextAtSize(text, fittedSize)) / 2, y, size: fittedSize, font, color });
  };

  centered("ZERO LOSS AMOE ENTRY INSERT", 699, bold, 7.5, blue);
  centered(`Entrant: ${name}`, 683, regular, 7.5, slate);
  centered(`Account: ${account}`, 673, regular, 7.5, slate);
  centered(`Offering: ${product.title}`, 663, regular, 7.5, slate);

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
