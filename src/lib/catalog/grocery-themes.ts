export const groceryThemes = [
  { id: "taco-night", title: "Taco Night", note: "A little crunch. A lot of flavor.", mood: "Easy favorites", ingredients: "Taco shells, salsa, beans, cheese, and all the fresh toppings." },
  { id: "steak-night", title: "Steak Night", note: "Fire up something special.", mood: "Make a night of it", ingredients: "Steaks, corn, asparagus, potatoes, and your favorite seasoning." },
  { id: "backyard-barbecue", title: "Backyard Barbecue", note: "Good food. Better company.", mood: "Make a night of it", ingredients: "Barbecue chicken, corn, rolls, crunchy slaw, and picnic sides." },
  { id: "stir-fry-night", title: "Stir-Fry Night", note: "Big flavor, one pan.", mood: "Easy favorites", ingredients: "Noodles, chicken, colorful vegetables, ginger, and soy sauce." },
  { id: "pizza-night", title: "Pizza Night", note: "Everyone gets their favorite slice.", mood: "Make a night of it", ingredients: "Pizza dough, mozzarella, sauce, pepperoni, and fresh toppings." },
  { id: "pasta-night", title: "Pasta Night", note: "A new reason to gather around.", mood: "Easy favorites", ingredients: "Pasta, tomato sauce, parmesan, basil, and crusty bread." },
  { id: "weekend-breakfast", title: "Weekend Breakfast", note: "Take your time this morning.", mood: "Make a night of it", ingredients: "Pancakes, eggs, berries, maple syrup, and orange juice." },
  { id: "lunchbox-week", title: "Lunchbox Week", note: "A little planning goes a long way.", mood: "Easy favorites", ingredients: "Sandwich favorites, yogurt, fruit, and crunchy vegetables." },
  { id: "cozy-soup-night", title: "Cozy Soup Night", note: "Comfort by the spoonful.", mood: "Make a night of it", ingredients: "Chicken, broth, noodles, fresh vegetables, and a loaf for dipping." },
  { id: "fresh-for-the-week", title: "Fresh for the Week", note: "Fill your bags with good things.", mood: "Easy favorites", ingredients: "Colorful produce, everyday staples, eggs, and plenty of possibilities." },
] as const;

export type GroceryTheme = (typeof groceryThemes)[number];
export const groceryThemeImage = (id: string) => `/grocery-inspiration/${id}.webp`;

// Inspiration points to existing gift-card pools; it never creates another offer.
export const groceryInspirationOfferSlugs = new Set([
  "publix-100-gift-card", "publix-100-gift-card-ending-soon", "walmart-100-gift-card",
]);
