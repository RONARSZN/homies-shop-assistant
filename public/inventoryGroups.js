export function groupInventoryByCategory(products) {
  const groupsByCategory = new Map();

  for (const product of products) {
    if (!product.active) continue;

    const category = String(product.category || '').trim() || 'Unclassified';

    if (!groupsByCategory.has(category)) {
      groupsByCategory.set(category, []);
    }

    groupsByCategory.get(category).push(product);
  }

  return [...groupsByCategory.entries()].map(([category, groupProducts]) => ({
    category,
    products: groupProducts
  }));
}

export function getInventoryView(products, { query, stockFilter, selectedCategory }) {
  const normalizedQuery = query.trim().toLowerCase();
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      !normalizedQuery || product.searchText.includes(normalizedQuery);
    const matchesFilter =
      stockFilter === 'all' || product.stockStatus === stockFilter;
    const matchesCategory =
      normalizedQuery || !selectedCategory || product.category === selectedCategory;

    return matchesSearch && matchesFilter && matchesCategory && product.active;
  });
  const groups = groupInventoryByCategory(filteredProducts);

  return {
    mode: normalizedQuery || selectedCategory ? 'products' : 'categories',
    groups
  };
}

export function categoryLabel(category) {
  if (category === 'BINDINGS') return 'Boots / Bindings';
  return category;
}
