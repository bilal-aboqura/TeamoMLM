const TASHKEEL_PATTERN = /[\u064B-\u065F\u0670]/g;

const ARABIC_NORMALIZATION_MAP: Record<string, string> = {
  "أ": "ا",
  "إ": "ا",
  "آ": "ا",
  "ٱ": "ا",
  "ة": "ه",
  "ى": "ي",
  "ؤ": "و",
  "ئ": "ي",
};

export function normalizeArabicText(text: string): string {
  return text
    .replace(TASHKEEL_PATTERN, "")
    .replace(/[أإآٱةىؤئ]/g, (char) => ARABIC_NORMALIZATION_MAP[char] ?? char)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
