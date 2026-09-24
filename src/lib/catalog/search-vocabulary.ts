// Search-owned discovery metadata, not inventory or redemption guarantees.
// Apply retailer terms only to existing gift-card offerings, not all products
// sold by that retailer. Keep additions specific and regression-tested.
export const productSearchTerms: Readonly<Record<string, string>> = {
  "babys-essentials-bundle": "baby infant newborn diaper formula baby supplies",
  "nike-court-shot-shoes": "sneaker trainer tennis shoe footwear",
};

export const retailerSearchTerms: Readonly<Record<string, string>> = {
  "The Home Depot": "tool power tool hand tool reciprocating saw sawzall drill screwdriver hammer hardware lumber paint garden gardening home improvement repair renovation",
  PetSmart: "pet dog puppy cat kitten food treat kibble pet supply pet toy cat litter aquarium fish bird grooming",
  Walmart: "baby infant newborn diaper formula grocery groceries food household cleaning school supply",
  CVS: "baby diaper formula personal care toiletries shampoo toothpaste health beauty skincare",
  Adidas: "shoe sneaker trainer footwear sportswear athletic clothing workout running",
  Nintendo: "video game gaming console switch controller",
  Starbucks: "coffee cafe latte espresso tea drink",
  "Dunkin'": "coffee cafe latte espresso donut doughnut breakfast",
  DoorDash: "meal restaurant food delivery takeout takeaway dinner lunch breakfast",
  "Uber Eats": "meal restaurant food delivery takeout takeaway dinner lunch breakfast",
};

// Equivalent words only: a named brand must not become a different brand.
export const searchSynonyms: readonly (readonly string[])[] = [
  ["tv", "television"],
  ["shoe", "sneaker", "footwear", "trainer"],
  ["gas", "gasoline", "fuel", "petrol"],
  ["coffee", "cafe"],
  ["grocery", "groceries"],
  ["game", "gaming"],
  ["playstation", "ps5"],
  ["baby", "infant", "newborn"],
  ["vacuum", "hoover"],
  ["electronic", "tech", "technology"],
  ["diaper", "nappy", "nappies"],
  ["treat", "snack"],
];
