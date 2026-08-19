export type Freshness = "fresh" | "aging" | "stale" | "future";
export type SheetKind = "quotes" | "suppliers" | "requests" | "purchases" | "calculated" | "helper" | "unknown";

export interface Quote {
  id: string; mill: string; rawMill: string; grade: string; rawGrade: string; size: string; rawSize: string;
  quoteDate: string; contact: string; destination: string | null; rawDestination: string; priceLow: number;
  priceHigh: number; pricingBasis: string; rawPricingBasis: string; quantity: number | null; quantityUnit: string;
  availability: string; status: string; notes: string; source: string; fingerprint: string; review: string[];
  sourceWorkbook?: string; sourceSheet?: string; sourceRow?: number; importedAt?: string; rawValues?: Record<string, unknown>;
}
export interface AppSettings { freshDays: number; agingDays: number; }
export interface SheetDiscovery { name: string; kind: SheetKind; rows: number; headerRow?: number; confidence: number; }
export interface ImportPreview { fileName: string; fileHash: string; sheets: SheetDiscovery[]; quotes: Quote[]; newQuotes: number; duplicates: number; needsReview: number; errors: string[]; }
export interface MarketSnapshot { key: string; size: string; grade: string; destination: string; best: Quote; average: number; median: number; high: number; spread: number; quoteCount: number; }

export const DAY = 86_400_000;
export function freshness(date: string, asOf = new Date(), freshDays = 3, agingDays = 6): Freshness {
  const quote = new Date(date); if (!Number.isFinite(quote.valueOf())) return "stale"; const age = Math.floor((Date.UTC(asOf.getFullYear(), asOf.getMonth(), asOf.getDate()) - Date.UTC(quote.getFullYear(), quote.getMonth(), quote.getDate())) / DAY);
  if (age < 0) return "future"; if (age <= freshDays) return "fresh"; if (age <= agingDays) return "aging"; return "stale";
}
export const midpoint = (q: Pick<Quote, "priceLow" | "priceHigh">) => (q.priceLow + q.priceHigh) / 2;
export const isValidPricedQuote = (q: Quote) => Number.isFinite(q.priceLow) && Number.isFinite(q.priceHigh) && q.priceLow > 0 && q.priceHigh > 0 && !!q.quoteDate && q.mill !== "Unresolved" && !isUnavailableStatus(q.status);
export const isUnavailableStatus = (status: string) => /\b(nq|no quote|not available|do not produce|declined|expired)\b/i.test(status);
export function median(values: number[]) { const s = [...values].sort((a,b)=>a-b); return s.length ? s.length % 2 ? s[(s.length-1)/2] : (s[s.length/2-1]+s[s.length/2])/2 : NaN; }
export function currentSnapshots(quotes: Quote[], asOf = new Date(), freshDays = 3, agingDays = 6): MarketSnapshot[] {
  const current = quotes.filter(q => ["fresh","aging"].includes(freshness(q.quoteDate, asOf, freshDays, agingDays)) && isValidPricedQuote(q) && !isUnavailableStatus(q.status) && q.destination && /delivered/i.test(q.pricingBasis));
  return buildSnapshots(current);
}
export function allMarketSnapshots(quotes: Quote[]): MarketSnapshot[] {
  return buildSnapshots(quotes.filter(q => isValidPricedQuote(q) && !isUnavailableStatus(q.status) && q.destination && /delivered/i.test(q.pricingBasis)));
}
function buildSnapshots(current: Quote[]): MarketSnapshot[] {
  const latestByMill = new Map<string, Quote>();
  for (const q of current) { const k = `${q.size}|${q.grade}|${q.destination}|${q.mill}`; if (!latestByMill.has(k) || q.quoteDate > latestByMill.get(k)!.quoteDate) latestByMill.set(k,q); }
  const groups = new Map<string, Quote[]>();
  for (const q of latestByMill.values()) { const k = `${q.size}|${q.grade}|${q.destination}`; groups.set(k,[...(groups.get(k)||[]),q]); }
  return [...groups.entries()].map(([key, rows]) => { const prices=rows.map(midpoint); const best=rows.reduce((a,b)=>midpoint(a)<=midpoint(b)?a:b); const average=prices.reduce((a,b)=>a+b,0)/prices.length; const high=Math.max(...prices); return {key,size:best.size,grade:best.grade,destination:best.destination!,best,average,median:median(prices),high,spread:high-midpoint(best),quoteCount:rows.length}; }).sort((a,b)=>a.size.localeCompare(b.size,undefined,{numeric:true})||a.grade.localeCompare(b.grade)||a.destination.localeCompare(b.destination));
}
export function sameMillMovements(quotes: Quote[], size: string, grade: string, destination: string) {
  const grouped = new Map<string,Quote[]>(); quotes.filter(q=>q.size===size&&q.grade===grade&&q.destination===destination).forEach(q=>grouped.set(q.mill,[...(grouped.get(q.mill)||[]),q]));
  return [...grouped.entries()].flatMap(([mill,rows])=>{ const s=rows.sort((a,b)=>a.quoteDate.localeCompare(b.quoteDate)); if(s.length<2)return[]; const latest=s.at(-1)!;const previous=s.at(-2)!;return [{mill,latest,previous,change:midpoint(latest)-midpoint(previous)}];});
}
export function dataUpdatedThrough(quotes: Quote[]) {
  const dated = quotes.filter(isValidPricedQuote).map(q=>q.quoteDate).filter(Boolean).sort();
  return dated.length ? new Date(dated.at(-1)!) : null;
}
export function lumberSizeCompare(a:string,b:string){
  const nums=(v:string)=>v.split("x").map(Number); const av=nums(a),bv=nums(b);
  for(let i=0;i<Math.max(av.length,bv.length);i++){const d=(av[i]||0)-(bv[i]||0);if(d)return d;}
  return a.localeCompare(b);
}
