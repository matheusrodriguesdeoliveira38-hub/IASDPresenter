function normalizeSmartSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function smartEditDistance(left, right) {
  const a = String(left || '');
  const b = String(right || '');
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length];
}

function smartTokenScore(query, target) {
  const cleanQuery = normalizeSmartSearchText(query);
  const cleanTarget = normalizeSmartSearchText(target);
  if (!cleanQuery || !cleanTarget) return 0;
  if (cleanQuery === cleanTarget) return 100;
  if (cleanTarget.startsWith(cleanQuery)) return 82;
  if (cleanTarget.includes(cleanQuery)) return 68;

  const queryTerms = cleanQuery.split(' ').filter(Boolean);
  const targetTerms = cleanTarget.split(' ').filter(Boolean);
  if (!queryTerms.length || !targetTerms.length) return 0;

  let total = 0;
  for (const queryTerm of queryTerms) {
    let best = 0;
    for (const targetTerm of targetTerms) {
      if (targetTerm.startsWith(queryTerm)) {
        best = Math.max(best, 0.92);
        continue;
      }
      if (queryTerm.length < 3) continue;
      const distance = smartEditDistance(queryTerm, targetTerm);
      const similarity = 1 - (distance / Math.max(queryTerm.length, targetTerm.length));
      best = Math.max(best, similarity);
    }
    if (best < 0.62) return 0;
    total += best;
  }

  return Math.round(48 + (total / queryTerms.length) * 28);
}

module.exports = { normalizeSmartSearchText, smartEditDistance, smartTokenScore };
