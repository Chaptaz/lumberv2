import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeWorkbook } from "@/lib/importer";

const workbookPath = process.env.LUMBER_REFERENCE_WORKBOOK;

describe.runIf(Boolean(workbookPath))("reference workbook", () => {
  it("matches the verified source structure and currency boundary", async () => {
    const bytes = await readFile(workbookPath!);
    const fileName = basename(workbookPath!);
    const preview = await analyzeWorkbook(new File([bytes], fileName));

    expect(preview.sheets).toHaveLength(9);
    expect(preview.sheets.find(sheet => sheet.name === "Quote Log")?.kind).toBe("quotes");
    expect(preview.sheets.find(sheet => sheet.name === "Daily Dashboard")?.kind).toBe("calculated");
    expect(preview.quotes).toHaveLength(666);
    expect(preview.quotes.every(quote => quote.priceLow > 0 && quote.priceHigh > 0)).toBe(true);
    expect(preview.quotes.every(quote => quote.sourceWorkbook === fileName && quote.sourceSheet && quote.sourceRow)).toBe(true);
    expect(preview.quotes.map(quote => quote.quoteDate).sort().at(-1)?.slice(0, 10)).toBe("2026-08-12");
    expect(preview.quotes.some(quote => /^2026-08-1[3-7]/.test(quote.quoteDate))).toBe(false);
  });
});
