// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "@/components/LumberApp";
import type { Quote } from "@/lib/domain";
import { BATCHES, QUOTES, restoreBackup } from "@/lib/store";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const quote:Quote={id:"q1",mill:"Shuqualak Lumber",rawMill:"Shuqualak Lumber Co.",grade:"#2",rawGrade:"#2",size:"2x4x16",rawSize:"2x4x16",quoteDate:"2026-08-17T12:00:00.000Z",contact:"",destination:"Mobile, AL",rawDestination:"Mobile, AL",priceLow:400,priceHigh:400,pricingBasis:"Delivered",rawPricingBasis:"Delivered",quantity:null,quantityUnit:"",availability:"Prompt",status:"Open",notes:"",source:"test",fingerprint:"fp1",review:[]};
class MemoryStorage implements Storage{private data=new Map<string,string>();get length(){return this.data.size}clear(){this.data.clear()}getItem(k:string){return this.data.get(k)??null}key(i:number){return [...this.data.keys()][i]??null}removeItem(k:string){this.data.delete(k)}setItem(k:string,v:string){this.data.set(k,String(v))}}
Object.defineProperty(globalThis,"localStorage",{value:new MemoryStorage(),configurable:true});
let root:Root|undefined;let host:HTMLDivElement;
beforeEach(()=>{localStorage.clear();localStorage.setItem(QUOTES,JSON.stringify([quote]));host=document.createElement("div");document.body.append(host);root=createRoot(host);act(()=>root!.render(<App/>));});
afterEach(()=>{if(root)act(()=>root!.unmount());root=undefined;host?.remove();});
const click=(el:Element)=>act(()=>el.dispatchEvent(new MouseEvent("click",{bubbles:true})));

describe("application interaction",()=>{
  it("opens a separate Mill Comparison screen and Settings",()=>{const comparison=[...host.querySelectorAll("button")].find(x=>x.textContent?.includes("Mill Comparison"))!;click(comparison);expect(host.querySelector("h1")?.textContent).toBe("Mill comparison");expect(host.querySelector('select[aria-label="Comparison destination"]')).not.toBeNull();const settings=[...host.querySelectorAll("button")].find(x=>x.textContent?.includes("Settings"))!;click(settings);expect(host.querySelector("h1")?.textContent).toBe("Settings");expect(host.textContent).toContain("Freshness thresholds");});
  it("opens search with Command-K and navigates a mill result",()=>{act(()=>window.dispatchEvent(new KeyboardEvent("keydown",{key:"k",metaKey:true,bubbles:true})));const input=host.querySelector<HTMLInputElement>('input[aria-label="Search"]')!;expect(input).not.toBeNull();act(()=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!;setter.call(input,"Shuqualak");input.dispatchEvent(new Event("input",{bubbles:true}));});const result=[...host.querySelectorAll(".results button")].find(x=>x.textContent?.includes("Shuqualak Lumber"))!;click(result);expect(host.querySelector("h1")?.textContent).toBe("Mill profile");expect(host.textContent).toContain("Shuqualak Lumber");});
});

describe("backup restore",()=>{it("is additive and never overwrites existing quotes",()=>{const incoming={...quote,id:"q2",fingerprint:"fp2",priceLow:410,priceHigh:410};const backup=JSON.stringify({version:1,quotes:[{...quote,priceLow:999},incoming],batches:[{id:"b1",fileName:"source.xlsx",fileHash:"hash",committedAt:"2026-08-18T00:00:00Z",records:2}]});expect(restoreBackup(backup)).toBe(1);const stored=JSON.parse(localStorage.getItem(QUOTES)!);expect(stored).toHaveLength(2);expect(stored.find((q:Quote)=>q.id==="q1").priceLow).toBe(400);expect(JSON.parse(localStorage.getItem(BATCHES)!)).toHaveLength(1);});});
