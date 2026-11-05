export type Partnership = "products" | "fulfillment" | "campaign" | "other";
export type DemoCase = Partnership | "restaurant" | "tools";
export type FormValues = Record<string, string | boolean>;
export type PartnerListing = {
  title: string; brand: string; category: string; value: number; entryPrice: number; capacity: number;
  summary: string; highlights: string[]; specifications: [string, string][]; included: string[];
  fulfillment: string; availability: string;
};
export type BusinessFile = { id: string; name: string; listingIndex: number | null };
export type BusinessDraft = { version: 1; step: number; values: FormValues; listings: PartnerListing[]; files: BusinessFile[] };
export type BusinessRecord = { document: BusinessDraft; revision: number; status: "draft" | "submitted" };
export const businessSignupPath = "/signup?account=business";
export const materialsBucket = "business-materials";
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
    && ["value","entryPrice","capacity"].every(k => Number.isFinite(value[k]))
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
  return value.files.every(file => object(file) && typeof file.name === "string" && file.name.length > 0 && file.name.length <= 255
    && typeof file.id === "string" && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(file.id)
    && (file.listingIndex === null || (Number.isInteger(file.listingIndex) && Number(file.listingIndex) >= 0 && Number(file.listingIndex) < count)));
}

export function readDeviceDraft(json: string): BusinessDraft | null {
  const saved: unknown = JSON.parse(json);
  if (isBusinessDraft(saved)) return saved;
  return validValues(saved) ? { ...blankDraft, values: { ...initialValues, ...saved } } : null;
}

export function missingBusinessFields(values: FormValues, files: BusinessFile[]) {
  const required: [string, string][] = [["business_name","Business name"],["address_line_1","Street address"],["city","City"],["region","State or region"],["postal_code","ZIP or postal code"],["country","Country"],["contact_name","Authorized contact"],["work_email","Work email"],["business_type","Business type"],["service_area","Service area"]];
  if (values.partnership === "products") required.push(["offer_name","Offer name"],["offer_type","Offer type"],["description","Customer-facing description"],["retail_value","Retail value"],["quantity","Quantity or capacity"],["relationship","Relationship"],["fulfillment_owner","Fulfillment responsibility"]);
  if (values.partnership === "fulfillment") required.push(["provider_name","Provider name"],["reward_types","Reward types"],["coverage","Geographic coverage"],["delivery_method","Delivery method"],["delivery_time","Delivery time"],["pricing_terms","Pricing terms"],["technical_contact","Technical contact"]);
  if (values.partnership === "campaign") required.push(["campaign_name","Campaign name"],["campaign_offer","Campaign offer"],["objective","Campaign objective"],["relationship","Relationship"],["campaign_supply","What the business supplies"],["audience","Intended audience"]);
  if (values.partnership === "other") required.push(["other_partnership","Partnership explanation"]);
  const missing = required.filter(([key]) => typeof values[key] !== "string" || !String(values[key]).trim()).map(([,label]) => label);
  if (values.work_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(values.work_email))) missing.push("Valid work email");
  if (values.capacity_ack !== true) missing.push("Fulfillment-capacity acknowledgment");
  if (values.auto_relist === true && values.card_billing !== true) missing.push("Card-on-file billing authorization");
  if (files.length && values.asset_rights !== true) missing.push("Rights to supply the attached materials");
  return missing;
}
