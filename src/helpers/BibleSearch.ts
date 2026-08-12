export function normalizeBibleSearchText(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\biii\b/gi, "3")
    .replace(/\bii\b/gi, "2")
    .replace(/\bi\b/gi, "1")
    .replace(/[.\u00aa\u00ba]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function findBibleBook(input, books = []) {
  const normalizedInput = normalizeBibleSearchText(input);
  const compactInput = normalizedInput.replace(/\s+/g, "");
  const sortedBooks = [...books].sort((a, b) => {
    const aSize = Math.max(a.name?.length || 0, a.abbreviation?.length || 0);
    const bSize = Math.max(b.name?.length || 0, b.abbreviation?.length || 0);
    return bSize - aSize;
  });

  for (const book of sortedBooks) {
    const names = [book.name, book.abbreviation]
      .filter(Boolean)
      .flatMap((name) => {
        const normalizedName = normalizeBibleSearchText(name);
        return [normalizedName, normalizedName.replace(/\s+/g, "")];
      });

    for (const name of names) {
      if (
        normalizedInput === name ||
        normalizedInput.startsWith(`${name} `) ||
        compactInput === name ||
        (compactInput.startsWith(name) && /^\d/.test(compactInput.slice(name.length)))
      ) {
        return {
          book,
          rest: normalizedInput.startsWith(name)
            ? normalizedInput.slice(name.length).trim()
            : compactInput.slice(name.length).trim(),
        };
      }
    }
  }

  return null;
}

export function extractBibleBookSearchPart(input, books = []) {
  const normalizedQuery = normalizeBibleSearchText(input);
  const compactQuery = normalizedQuery.replace(/\s+/g, "");
  const knownBook = findBibleBook(input, books);

  if (knownBook?.book) {
    const bookNames = [knownBook.book.name, knownBook.book.abbreviation]
      .filter(Boolean)
      .flatMap((name) => {
        const normalizedName = normalizeBibleSearchText(name);
        return [normalizedName, normalizedName.replace(/\s+/g, "")];
      });

    return bookNames.find((name) => (
      normalizedQuery.startsWith(name) ||
      compactQuery.startsWith(name.replace(/\s+/g, ""))
    )) || normalizedQuery;
  }

  return normalizedQuery
    .replace(/\s+\d.*$/, "")
    .replace(/\s*:.*$/, "")
    .trim();
}

export function parseBibleSearch(input, books = []) {
  const query = String(input || "").trim();
  if (!query) return null;

  const bookMatch = findBibleBook(query, books);
  const book = bookMatch?.book || null;
  const rest = bookMatch ? bookMatch.rest : query;
  const referenceMatch = rest.match(/^(\d+)(?:\s*[: ]\s*(.+))?$/);

  if (book || referenceMatch?.[2] || (referenceMatch && query.includes(":"))) {
    return {
      book,
      chapter: referenceMatch ? Number(referenceMatch[1]) : 1,
      verseQuery: referenceMatch?.[2]?.trim() || "",
      isReference: true,
    };
  }

  return {
    book: null,
    chapter: null,
    verseQuery: query,
    isReference: false,
  };
}

export function parseBibleVerseNumbers(input, verses) {
  const selected = new Set<number>();

  for (const part of String(input || "").split(",")) {
    const range = part.trim().match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const start = Math.min(Number(range[1]), Number(range[2]));
      const end = Math.max(Number(range[1]), Number(range[2]));
      for (let verse = start; verse <= end; verse++) {
        if (verses[verse]) selected.add(verse);
      }
    } else {
      const verse = Number(part.trim());
      if (!Number.isNaN(verse) && verses[verse]) selected.add(verse);
    }
  }

  return Array.from(selected).sort((a, b) => a - b);
}
