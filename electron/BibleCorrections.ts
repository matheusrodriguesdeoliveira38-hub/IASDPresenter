// Only confirmed reference errors. Never infer missing text from empty verses:
// translations such as NTLH combine multiple verse numbers into a single text.
export const NAA_SAMUEL_22_51 = "É ele quem dá grandes vitórias ao seu rei e usa de misericórdia para com o seu ungido, com Davi e sua posteridade, para sempre.";

export function correctBibleChapter(filename: string, data: any) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data;
  const verses = { ...data };
  if (filename === "bible_8_10_22" && !Object.prototype.hasOwnProperty.call(verses, "51")) {
    verses[51] = NAA_SAMUEL_22_51;
  } else if (filename === "bible_8_10_23" && verses[51] === NAA_SAMUEL_22_51) {
    delete verses[51];
  } else if (filename === "bible_7_19_95" && verses[95] === "") {
    delete verses[95];
  } else if (filename === "bible_13_64_1" && typeof verses[14] === "string" && !Object.prototype.hasOwnProperty.call(verses, "15")) {
    const parts = verses[14].split(" (1:15)");
    if (parts.length === 2 && parts.every(part => part.trim())) {
      verses[14] = parts[0].trim();
      verses[15] = parts[1].trim();
    }
  } else {
    return data;
  }
  return verses;
}
