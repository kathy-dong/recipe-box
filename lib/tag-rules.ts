// Pure rule-based tag suggestions — no external deps

export const TAG_TAXONOMY = `Meal type tags (use one or more if applicable): "breakfast", "lunch", "dinner", "appetizer-side" (appetizers, sides, or snacks), "dessert"
Attribute tags (use any that apply): "quick" (under 30 min total), "healthy", "indulgent", "meal-prep", "asian" (Chinese, Japanese, Korean, Vietnamese, Thai, Indian, or other Asian cuisines — infer from title, ingredients, description, or source site such as thewoksoflife.com, maangchi.com, justonecookbook.com, hotthaikitchen.com, or similar)`;

const ASIAN_SITES = [
  "woks of life", "maangchi", "just one cookbook", "hot thai kitchen",
  "omnivore's cookbook", "omnivorescookbook", "woksoflife",
];

const ASIAN_KEYWORDS = [
  "stir fry", "stir-fry", "wok", "dumpling", "dumplings", "ramen", "curry",
  "thai", "teriyaki", "kimchi", "soy sauce", "miso", "tofu", "fried rice",
  "udon", "sushi", "tempura", "bibimbap", "pho", "banh mi", "pad thai",
  "general tso", "kung pao", "lo mein", "chow mein", "dim sum", "gyoza",
  "naan", "tikka", "masala", "dal ", "samosa", "laksa", "satay", "bulgogi",
  "japchae", "congee", "mapo", "dan dan", "chinese", "japanese", "korean",
  "vietnamese", "taiwanese", "szechuan", "cantonese", "hong kong",
];

const DESSERT_TITLE_KEYWORDS = [
  "cake", "cookie", "cookies", "pie", "brownie", "brownies", "tart", "mousse",
  "ice cream", "pudding", "fudge", "cupcake", "cheesecake", "cobbler", "crisp",
  "sorbet", "gelato", "tiramisu", "bread pudding", "macaron", "profiterole",
  "éclair", "eclair", "creme brulee", "crème brûlée", "panna cotta", "pavlova",
  "churro", "churros", "roll cake", "swiss roll",
];

const HEALTHY_KEYWORDS = [
  "salad", "smoothie", "grain bowl", "healthy", " light ", "low-calorie",
  "low calorie", "low-fat", "low fat", "low-carb", "low carb",
];

export function parseCookTimeToMinutes(cookTime: string): number | null {
  const lower = cookTime.toLowerCase();
  let total = 0;
  const hrMatch = lower.match(/(\d+)\s*hr/);
  const minMatch = lower.match(/(\d+)\s*min/);
  if (hrMatch) total += parseInt(hrMatch[1]) * 60;
  if (minMatch) total += parseInt(minMatch[1]);
  return total > 0 ? total : null;
}

export function suggestTagsFromMetadata({
  title,
  description,
  cook_time,
  source_site,
}: {
  title?: string | null;
  description?: string | null;
  cook_time?: string | null;
  source_site?: string | null;
}): string[] {
  const tags = new Set<string>();
  const titleLower = (title ?? "").toLowerCase();
  const haystack = [title, description].filter(Boolean).join(" ").toLowerCase();
  const src = (source_site ?? "").toLowerCase();

  // "quick" — cook_time ≤ 30 min
  if (cook_time) {
    const mins = parseCookTimeToMinutes(cook_time);
    if (mins !== null && mins <= 30) tags.add("quick");
  }

  // "asian" — source site or keywords in title/description
  if (ASIAN_SITES.some((s) => src.includes(s)) || ASIAN_KEYWORDS.some((k) => haystack.includes(k))) {
    tags.add("asian");
  }

  // "dessert" — keywords in title
  if (DESSERT_TITLE_KEYWORDS.some((k) => titleLower.includes(k))) {
    tags.add("dessert");
  }

  // "healthy" — keywords in title or description
  if (HEALTHY_KEYWORDS.some((k) => haystack.includes(k))) {
    tags.add("healthy");
  }

  return Array.from(tags);
}

export function mergeTags(...arrays: string[][]): string[] {
  return Array.from(new Set(arrays.flat()));
}
