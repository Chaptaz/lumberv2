import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { analyzeWorkbook } from "@/lib/importer";

describe("workbook import", () => {
  it("imports real prices, skips blanks, retains provenance, and is idempotent", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Quote Log");
    sheet.addRow(["Mill", "Grade", "Size", "Quote Date", "Destination", "Price Low", "Price High", "Pricing Basis", "Status"]);
    sheet.addRow(["Shuqualak Lumber Co.", "#2", "2x4x16", new Date("2026-08-18T12:00:00Z"), "Mobile, AL", 400, 410, "Delivered", "Open"]);
    sheet.addRow(["Canfor", "#2 Prime", "2x4x16", new Date("2026-08-18T12:00:00Z"), "Mobile, AL", "", "", "Delivered", "NQ"]);
    const bytes = await workbook.xlsx.writeBuffer();
    const file = new File([bytes], "test-quotes.xlsx");

    const first = await analyzeWorkbook(file);
    expect(first.quotes).toHaveLength(1);
    expect(first.quotes[0]).toMatchObject({ mill: "Shuqualak Lumber", priceLow: 400, priceHigh: 410, sourceWorkbook: "test-quotes.xlsx", sourceSheet: "Quote Log", sourceRow: 2 });
    expect(first.quotes[0].rawValues).toBeDefined();

    const second = await analyzeWorkbook(file, new Set(first.quotes.map(q => q.fingerprint)));
    expect(second.newQuotes).toBe(0);
    expect(second.duplicates).toBe(1);
  });
});
