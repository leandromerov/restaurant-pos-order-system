// Sample menu used to seed the in-memory store.
// Prices are stored in cents to avoid floating-point rounding errors.
export const MENU = [
  { id: 'starter-bruschetta', name: 'Bruschetta', category: 'Starters', priceCents: 690 },
  { id: 'starter-soup', name: 'Soup of the Day', category: 'Starters', priceCents: 590 },
  { id: 'main-schnitzel', name: 'Wiener Schnitzel', category: 'Mains', priceCents: 1890 },
  { id: 'main-burger', name: 'Classic Burger', category: 'Mains', priceCents: 1450 },
  { id: 'main-risotto', name: 'Mushroom Risotto', category: 'Mains', priceCents: 1590 },
  { id: 'dessert-strudel', name: 'Apple Strudel', category: 'Desserts', priceCents: 650 },
  { id: 'drink-water', name: 'Sparkling Water 0.5l', category: 'Drinks', priceCents: 350 },
  { id: 'drink-beer', name: 'Helles 0.5l', category: 'Drinks', priceCents: 490 },
  { id: 'drink-coffee', name: 'Espresso', category: 'Drinks', priceCents: 280 },
];

export function findMenuItem(id) {
  return MENU.find((item) => item.id === id) ?? null;
}
