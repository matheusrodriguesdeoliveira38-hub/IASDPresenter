type Item = { id: string | number; type: string; collapsed?: boolean };

export function categoryForIndex<T extends Item>(items: T[], index: number): T | null {
  for (let i = index - 1; i >= 0; i--) {
    if (items[i].type === "category") return items[i];
  }
  return null;
}

export function categoryEnd(items: Item[], index: number): number {
  const next = items.findIndex((item, i) => i > index && item.type === "category");
  return next < 0 ? items.length : next;
}

export function insertInCategory<T extends Item>(items: T[], item: T, categoryId: Item["id"] | null): T[] {
  const result = [...items];
  const categoryIndex = result.findIndex(entry => entry.type === "category" && entry.id === categoryId);
  const firstCategory = result.findIndex(entry => entry.type === "category");
  const index = categoryIndex >= 0 ? categoryEnd(result, categoryIndex) : (firstCategory < 0 ? result.length : firstCategory);
  result.splice(index, 0, item);
  return result;
}

export function keepCategoryTogether<T extends Item>(before: T[], after: T[], movedId: Item["id"]): T[] {
  const index = before.findIndex(item => item.id === movedId);
  if (index < 0 || before[index].type !== "category") return after;
  const children = before.slice(index + 1, categoryEnd(before, index));
  const childIds = new Set(children.map(item => item.id));
  const remaining = after.filter(item => !childIds.has(item.id));
  const destination = remaining.findIndex(item => item.id === movedId);
  if (destination < 0) return after;
  const next = remaining[destination + 1];
  const result = remaining.filter(item => item.id !== movedId);
  let insertionIndex = destination;
  // Dropping a category inside another group must not adopt that group's tail.
  if (next && next.type !== "category") {
    const owner = categoryForIndex(before, before.findIndex(item => item.id === next.id));
    if (owner && owner.id !== movedId) {
      insertionIndex = categoryEnd(result, result.findIndex(item => item.id === owner.id));
    } else if (!owner) {
      const firstCategory = result.findIndex(item => item.type === "category");
      insertionIndex = firstCategory < 0 ? result.length : firstCategory;
    }
  }
  result.splice(insertionIndex, 0, before[index], ...children);
  return result;
}
