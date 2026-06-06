export type TagValue =
  | "breakfast" | "lunch" | "dinner" | "appetizer-side" | "dessert"
  | "quick" | "healthy" | "indulgent" | "meal-prep" | "asian";

export const MEAL_TYPE_TAGS: { label: string; value: TagValue }[] = [
  { label: "Breakfast", value: "breakfast" },
  { label: "Lunch", value: "lunch" },
  { label: "Dinner", value: "dinner" },
  { label: "Appetizer / Snack", value: "appetizer-side" },
  { label: "Dessert", value: "dessert" },
];

export const ATTRIBUTE_TAGS: { label: string; value: TagValue }[] = [
  { label: "Quick", value: "quick" },
  { label: "Healthy", value: "healthy" },
  { label: "Indulgent", value: "indulgent" },
  { label: "Meal Prep", value: "meal-prep" },
  { label: "Asian", value: "asian" },
];

export const ALL_TAGS = [...MEAL_TYPE_TAGS, ...ATTRIBUTE_TAGS];

export const MEAL_TYPE_VALUES = new Set(MEAL_TYPE_TAGS.map((t) => t.value));

export function labelForTag(value: string): string {
  return ALL_TAGS.find((t) => t.value === value)?.label ?? value;
}
