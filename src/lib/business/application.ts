import { addressRequirements } from "@/lib/account/address-requirements";

export type Partnership = "products" | "fulfillment" | "campaign" | "other";
export type DemoCase = Partnership | "restaurant" | "tools";
export type FormValues = Record<string, string | boolean>;
export type PartnerListing = {
  id?: string;
  title: string; brand: string; category: string; value: number; entryPrice: number; capacity: number;
  capacityManuallySet?: boolean;
  demoArtworkIndex?: number;
  summary: string; highlights: string[]; specifications: [string, string][]; included: string[];
  fulfillment: string; availability: string;
};
export type BusinessFile = { id: string; name: string; listingIndex: number | null; mediaType?: string };
export type BusinessDraft = { version: 1; step: number; values: FormValues; listings: PartnerListing[]; files: BusinessFile[] };
export type BusinessRecord = { document: BusinessDraft; revision: number; status: "draft" | "submitted" };
export const businessSignupPath = "/signup?account=business";
export const materialsBucket = "business-materials";
export const businessFileNameLimit = 255;
export const guestDraftKey = "zero-loss-business-partnership-draft-v1";
export const initialValues: FormValues = { partnership: "products", relationship: "one-time", fulfillment_owner: "business", asset_rights: false, submit_authority: false, creator_notice: false };
export const blankDraft: BusinessDraft = { version: 1, step: 0, values: initialValues, listings: [], files: [] };

export function demoOf(values: FormValues): DemoCase | null {
  const demo = values.demo_variant;
  if (demo === "tools" || demo === "restaurant") return values.partnership === "products" ? demo : null;
  if (demo === "products" || demo === "fulfillment" || demo === "campaign" || demo === "other") return demo === values.partnership ? demo : null;
  return null;
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === "string");
function validListing(value: unknown): value is PartnerListing {
  return object(value) && ["title","brand","category","summary","fulfillment","availability"].every(k => typeof value[k] === "string")
    && (value.id === undefined || (typeof value.id === "string" && /^[a-z0-9-]{1,80}$/.test(value.id)))
    && ["value","entryPrice","capacity"].every(k => Number.isFinite(value[k]))
    && (value.capacityManuallySet === undefined || typeof value.capacityManuallySet === "boolean")
    && (value.demoArtworkIndex === undefined || (Number.isSafeInteger(value.demoArtworkIndex) && Number(value.demoArtworkIndex) >= 0))
    && strings(value.highlights) && strings(value.included) && Array.isArray(value.specifications)
    && value.specifications.every(pair => strings(pair) && pair.length === 2);
}
const checkboxFields = new Set(["auto_relist", "card_billing", "asset_rights", "submit_authority", "capacity_ack", "creator_notice", "proof_generated"]);
const validValues = (v: unknown): v is FormValues => object(v)
  && Object.entries(v).every(([key, item]) => typeof item === (checkboxFields.has(key) ? "boolean" : "string"))
  && ["products","fulfillment","campaign","other"].includes(String(v.partnership));

export function isBusinessDraft(value: unknown): value is BusinessDraft {
  if (!object(value) || value.version !== 1 || !validValues(value.values) || !Number.isInteger(value.step)
      || Number(value.step) < 0 || Number(value.step) > 4 || !Array.isArray(value.listings) || !value.listings.every(validListing)
      || !Array.isArray(value.files)) return false;
  const count = value.listings.length;
  const assignedIds = value.listings.flatMap(item => item.id ?? []);
  if (new Set(assignedIds).size !== assignedIds.length) return false;
  return value.files.every(file => object(file) && typeof file.name === "string" && file.name.length > 0 && file.name.length <= businessFileNameLimit
    && (file.mediaType === undefined || typeof file.mediaType === "string" && file.mediaType.length <= 128)
    && typeof file.id === "string" && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(file.id)
    && (file.listingIndex === null || (Number.isInteger(file.listingIndex) && Number(file.listingIndex) >= 0 && Number(file.listingIndex) < count)));
}

export function readDeviceDraft(json: string): BusinessDraft | null {
  const saved: unknown = JSON.parse(json);
  if (isBusinessDraft(saved)) return saved;
  return validValues(saved) ? { ...blankDraft, values: { ...initialValues, ...saved } } : null;
}

export function businessIdentityFields(values: FormValues) {
  const rules = addressRequirements(String(values.country ?? "").trim());
  const addressKeys = { city: "C", region: "S", postal_code: "Z" } as Record<string, string>;
  const required: [string, string][] = [["business_name","Business name"],["address_line_1","Street address"],["city","City"],["region","State or region"],["postal_code","ZIP or postal code"],["country","Country"],["contact_name","Authorized contact"],["work_email","Work email"],["business_type","Business type"],["service_area","Service area"]];
  return required.filter(([key]) => !addressKeys[key] || !rules || rules.required.includes(addressKeys[key]));
}

export function invalidBusinessCounts(values: FormValues) {
  const counts = [["listing_count", "Number of listings"], ["recurrence_limit", "Maximum number of releases"]] as const;
  return counts.filter(([name]) => {
    const value = String(values[name] ?? "").trim();
    return value && (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)));
  });
}

export function invalidBusinessListings(listings: PartnerListing[]) {
  const validPrice = (value: number) => value > 0 && Number.isSafeInteger(Math.round(value * 100)) && Number(value.toFixed(2)) === value;
  return listings.flatMap((listing, index) => {
    const fields = [
      !listing.title.trim() ? "a product name" : "",
      !validPrice(listing.value) ? "positive retail value in dollars and cents" : "",
      !validPrice(listing.entryPrice) ? "positive entry price in dollars and cents" : "",
      !Number.isSafeInteger(listing.capacity) || listing.capacity < 1 ? "positive whole-number capacity" : "",
    ].filter(Boolean);
    return fields.length ? [{ index, message: `Listing ${index + 1} needs ${fields.join(", ")}` }] : [];
  });
}

export function invalidBusinessOfferFields(values: FormValues): [string, string][] {
  const issues: [string, string][] = [];
  const website = String(values.website ?? "").trim();
  if (website && !URL.canParse(website)) issues.push(["website", "Valid business website"]);
  else if (website && !["https:", "http:"].includes(new URL(website).protocol)) issues.push(["website", "Valid business website"]);
  const docs = String(values.integration_docs ?? "").trim();
  if (values.partnership === "fulfillment" && docs && !/^https?:$/i.test(URL.parse(docs)?.protocol ?? "")) {
    issues.push(["integration_docs", "Valid public integration documentation URL"]);
  }
  const isCampaign = values.partnership === "campaign";
  if (values.partnership !== "products" && !isCampaign) return issues;

  const amount = "(\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.(\\d{1,2}))?";
  const priceField = isCampaign ? "campaign_value" : "retail_value";
  const price = String(values[priceField] ?? "").trim();
  const match = new RegExp(`^\\$?${amount}(?:\\s*[–—-]\\s*\\$?${amount})?(?:\\s+per listing)?$`, "i").exec(price);
  const asCents = (whole: string, fractional = "") => Number(whole.replaceAll(",", "")) * 100 + Number(fractional.padEnd(2, "0"));
  if (price) {
    const min = match ? asCents(match[1], match[2]) : 0;
    const max = match?.[3] ? asCents(match[3], match[4]) : min;
    if (min <= 0 || max < min || !Number.isSafeInteger(max)) issues.push([priceField, "Positive retail value in dollars and cents"]);
  }
  const quantityField = isCampaign ? "campaign_capacity" : "quantity";
  const quantity = String(values[quantityField] ?? "").trim();
  const capacity = /^(?:up to\s+)?([1-9]\d*|[1-9]\d{0,2}(?:,\d{3})+)(?:\s+[\p{L}][\s\S]*)?$/iu.exec(quantity);
  if (quantity && (!capacity || !Number.isSafeInteger(Number(capacity[1].replaceAll(",", ""))))) {
    issues.push([quantityField, "Positive whole-number quantity or capacity"]);
  }
  return issues;
}

export function defaultBusinessListingCapacity(value: number) {
  return Math.ceil(Math.round(value * 100) * 3 / 100);
}

export function businessFieldIssues(values: FormValues, files: BusinessFile[], listings: PartnerListing[] = []) {
  const identity = businessIdentityFields(values);
  const required: [string, string][] = [];
  if (values.partnership === "products") required.push(["offer_name","Offer name"],["offer_type","Offer type"],["description","Customer-facing description"],["retail_value","Retail value"],["quantity","Quantity or capacity"],["relationship","Relationship"],["fulfillment_owner","Fulfillment responsibility"]);
  if (values.partnership === "fulfillment") required.push(["provider_name","Provider name"],["reward_types","Reward types"],["coverage","Geographic coverage"],["delivery_method","Delivery method"],["delivery_time","Delivery time"],["pricing_terms","Pricing terms"],["technical_contact","Technical contact"]);
  if (values.partnership === "campaign") required.push(["campaign_name","Campaign name"],["campaign_offer","Campaign offer"],["objective","Campaign objective"],["relationship","Relationship"],["campaign_supply","What the business supplies"],["audience","Intended audience"]);
  if (values.partnership === "other") required.push(["other_partnership","Partnership explanation"]);
  const missing: { message: string; step: number; field?: string; listing?: number }[] = [];
  for (const [step, fields] of [[0, identity], [2, required]] as const) {
    for (const [field, message] of fields) {
      if (typeof values[field] !== "string" || !String(values[field]).trim()) missing.push({ step, field, message });
    }
  }
  missing.push(...invalidBusinessCounts(values).map(([field, label]) => ({ step: 2, field, message: `${label} must be a positive whole number` })));
  missing.push(...invalidBusinessOfferFields(values).map(([field, message]) => ({ step: field === "website" ? 0 : 2, field, message })));
  if (values.partnership === "products") missing.push(...invalidBusinessListings(listings).map(({ index, message }) => ({ step: 2, listing: index, message })));
  if (values.work_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(values.work_email))) missing.push({ step: 0, field: "work_email", message: "Valid work email" });
  if (values.capacity_ack !== true) missing.push({ step: 2, field: "capacity_ack", message: "Fulfillment-capacity acknowledgment" });
  if (values.auto_relist === true && values.card_billing !== true) missing.push({ step: 2, field: "card_billing", message: "Card-on-file billing authorization" });
  if (files.length && values.asset_rights !== true) missing.push({ step: 3, field: "asset_rights", message: "Rights to supply the attached materials" });
  return missing;
}

export function missingBusinessFields(values: FormValues, files: BusinessFile[], listings: PartnerListing[] = []) {
  return businessFieldIssues(values, files, listings).map(issue => issue.message);
}
