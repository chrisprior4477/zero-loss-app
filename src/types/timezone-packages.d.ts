declare module "zipcodes" {
  const zipcodes: {
    lookup(zip: string): { latitude: number; longitude: number; state: string; country: string } | undefined;
    states: { normalize(state: string): string | undefined };
  };
  export default zipcodes;
}
declare module "tz-lookup" {
  export default function tzLookup(latitude: number, longitude: number): string;
}
