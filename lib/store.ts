import type { AppSettings, ImportPreview, Quote } from "./domain";
import { isValidPricedQuote } from "./domain";
import { normalizeMill } from "./normalize";
export const QUOTES="lumber-intelligence.quotes.v1"; export const BATCHES="lumber-intelligence.batches.v1"; export const SETTINGS="lumber-intelligence.settings.v1";
export interface BatchSummary {id:string;fileName:string;fileHash:string;committedAt:string;records:number;}
export const DEFAULT_SETTINGS:AppSettings={freshDays:3,agingDays:6};
export const loadAllStoredQuotes=():Quote[]=>JSON.parse(localStorage.getItem(QUOTES)||"[]");
export const loadQuotes=():Quote[]=>loadAllStoredQuotes().map(q=>({...q,mill:normalizeMill(q.rawMill||q.mill)})).filter(isValidPricedQuote);
export const loadBatches=():BatchSummary[]=>JSON.parse(localStorage.getItem(BATCHES)||"[]");
export const loadSettings=():AppSettings=>{try{const value={...DEFAULT_SETTINGS,...JSON.parse(localStorage.getItem(SETTINGS)||"{}")};return value.freshDays>=0&&value.agingDays>value.freshDays?value:DEFAULT_SETTINGS;}catch{return DEFAULT_SETTINGS;}};
export const saveSettings=(value:AppSettings)=>{if(value.freshDays<0||value.agingDays<=value.freshDays)throw new Error("Aging must be greater than fresh.");localStorage.setItem(SETTINGS,JSON.stringify(value));};
export function commitPreview(p:ImportPreview){const existing=loadAllStoredQuotes();const fps=new Set(existing.map(q=>q.fingerprint));const added=p.quotes.filter(q=>!fps.has(q.fingerprint));localStorage.setItem(QUOTES,JSON.stringify([...existing,...added]));const batches=loadBatches();if(!batches.some(b=>b.fileHash===p.fileHash))localStorage.setItem(BATCHES,JSON.stringify([{id:crypto.randomUUID(),fileName:p.fileName,fileHash:p.fileHash,committedAt:new Date().toISOString(),records:added.length},...batches]));return added.length;}
export function exportBackup(){return JSON.stringify({version:1,exportedAt:new Date().toISOString(),quotes:loadAllStoredQuotes(),batches:loadBatches(),settings:loadSettings()},null,2);}
export function restoreBackup(text:string){const data=JSON.parse(text) as {quotes?:Quote[];batches?:BatchSummary[];settings?:AppSettings};if(!Array.isArray(data.quotes)||!Array.isArray(data.batches))throw new Error("This is not a Lumber Intelligence backup.");const existing=loadAllStoredQuotes();const keys=new Set(existing.map(q=>q.fingerprint||q.id));const added=data.quotes.filter(q=>q&&q.id&&!keys.has(q.fingerprint||q.id));localStorage.setItem(QUOTES,JSON.stringify([...existing,...added]));const batches=loadBatches();const batchKeys=new Set(batches.map(b=>b.fileHash||b.id));localStorage.setItem(BATCHES,JSON.stringify([...batches,...data.batches.filter(b=>b&&b.id&&!batchKeys.has(b.fileHash||b.id))]));if(data.settings)saveSettings(data.settings);return added.length;}
