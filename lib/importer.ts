import { freshness, type ImportPreview, type Quote, type SheetDiscovery, type SheetKind } from "./domain";
import { normalizeBasis, normalizeDestination, normalizeGrade, normalizeHeader, normalizeMill, normalizeSize } from "./normalize";

const quoteRequired = ["mill","grade","size","quote date","destination","price low","price high"];
const signatures: Array<[SheetKind,string[]]> = [["quotes",quoteRequired],["suppliers",["mill supplier","contact","email","office"]],["requests",["request date","destination","size","grade requested"]],["purchases",["po number","po date","mill","volume","price"]]];
const calculatedNames = /dashboard|price view|price history|comparison/i;
const helperNames = /lists?|helper|reference/i;
const unwrap=(value:unknown):unknown=>{if(value&&typeof value==="object"){const v=value as Record<string,unknown>;if("result" in v)return v.result;if("text" in v)return v.text;if("richText" in v&&Array.isArray(v.richText))return v.richText.map(x=>unwrap(x)).join("");}return value;};
const excelDate = (input: unknown) => { const value=unwrap(input); if (value instanceof Date) return value.toISOString(); if(typeof value==="number") return new Date(Date.UTC(1899,11,30)+value*86_400_000).toISOString(); const d=new Date(String(value)); return Number.isNaN(d.valueOf())?"":d.toISOString(); };
const text=(v:unknown)=>String(unwrap(v)??"").trim(); const number=(v:unknown)=>{const raw=String(unwrap(v)??"").trim();if(!raw)return null;const n=Number(raw.replace(/[$,]/g,""));return Number.isFinite(n)?n:null;};
const digest = async (bytes:ArrayBuffer) => [...new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))].map(b=>b.toString(16).padStart(2,"0")).join("");
const fingerprint = async (parts:unknown[]) => digest(new TextEncoder().encode(JSON.stringify(parts)).buffer);

function discover(name:string, rows:unknown[][]): SheetDiscovery {
  let best:{kind:SheetKind;score:number;headerRow?:number}={kind:calculatedNames.test(name)?"calculated":helperNames.test(name)?"helper":"unknown",score:calculatedNames.test(name)||helperNames.test(name)?1:.2};
  rows.slice(0,12).forEach((row,i)=>{const headers=row.map(normalizeHeader); for(const [kind,needed] of signatures){const hits=needed.filter(x=>headers.includes(x)).length;const score=hits/needed.length;if(score>best.score)best={kind,score,headerRow:i};}});
  return {name,kind:best.kind,rows:Math.max(0,rows.filter(r=>r.some(v=>v!==null&&v!==undefined&&v!=="")).length-(best.headerRow===undefined?0:best.headerRow+1)),headerRow:best.headerRow===undefined?undefined:best.headerRow+1,confidence:best.score};
}

export async function analyzeWorkbook(file:File, existingFingerprints=new Set<string>()):Promise<ImportPreview>{
  const ExcelJS=(await import("exceljs")).default;const bytes=await file.arrayBuffer(); const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(bytes as never);const sheets:SheetDiscovery[]=[];const quotes:Quote[]=[];const errors:string[]=[];let duplicates=0;const importedAt=new Date().toISOString();
  for(const sheet of workbook.worksheets){const name=sheet.name;const rows:unknown[][]=[];sheet.eachRow({includeEmpty:true},row=>{const values=row.values as unknown[];rows.push(Array.from({length:sheet.columnCount},(_,i)=>unwrap(values[i+1])));});const discovery=discover(name,rows);sheets.push(discovery);if(discovery.kind!=="quotes"||!discovery.headerRow)continue;
    const headerIndex=discovery.headerRow-1;const headers=rows[headerIndex].map(normalizeHeader);const ix=(...names:string[])=>names.map(n=>headers.indexOf(n)).find(i=>i>=0)??-1;
    for(let i=headerIndex+1;i<rows.length;i++){const r=rows[i];if(!r||r.every(v=>v===null||v===""))continue;const rawMill=text(r[ix("mill")]);const rawGrade=text(r[ix("grade")]);const rawSize=text(r[ix("size")]);const rawDestination=text(r[ix("destination")]);const low=number(r[ix("price low")]);const high=number(r[ix("price high")]);const date=excelDate(r[ix("quote date")]);if(!rawMill&&!rawSize&&low===null)continue;if(low===null||low<=0)continue;const review:string[]=[];if(!date)review.push("Invalid quote date");if(date&&freshness(date,new Date())==="future")review.push("Future quote date");if(!normalizeDestination(rawDestination))review.push("Destination unresolved");if(/not stated|mixed|see source|unresolved/i.test(rawGrade))review.push("Grade needs review");
      const mill=normalizeMill(rawMill),grade=normalizeGrade(rawGrade),size=normalizeSize(rawSize),destination=normalizeDestination(rawDestination),pricingBasis=normalizeBasis(r[ix("pricing basis")]);const priceLow=low,priceHigh=high&&high>0?high:low;const source=text(r[ix("source")]);const fp=await fingerprint([mill,size,grade,destination,date,priceLow,priceHigh,pricingBasis,number(r[ix("quantity")]),text(r[ix("quantity unit")]),source]);if(existingFingerprints.has(fp)){duplicates++;continue;}existingFingerprints.add(fp);
      const rawValues=Object.fromEntries(headers.map((h,index)=>[h,r[index]]).filter(([h])=>h));
      quotes.push({id:`${name}-${i+1}`,mill,rawMill,grade,rawGrade,size,rawSize,quoteDate:date,contact:text(r[ix("contact")]),destination,rawDestination,priceLow,priceHigh,pricingBasis,rawPricingBasis:text(r[ix("pricing basis")]),quantity:number(r[ix("quantity")]),quantityUnit:text(r[ix("quantity unit")]),availability:text(r[ix("lead time availability")]),status:text(r[ix("status")]),notes:text(r[ix("notes")]),source,fingerprint:fp,review,sourceWorkbook:file.name,sourceSheet:name,sourceRow:i+1,importedAt,rawValues});
    }
  }
  if(!sheets.some(s=>s.kind==="quotes"))errors.push("No quote source worksheet was detected.");
  return {fileName:file.name,fileHash:await digest(bytes),sheets,quotes,newQuotes:quotes.length,duplicates,needsReview:quotes.filter(q=>q.review.length).length,errors};
}
