import type { EventCategory } from "@stellar-orbit/types";
import type { Messages } from "./messages/en";

export function categoryLabel(
  category: EventCategory | "all",
  t: Messages,
): string {
  return t.eventCategories[category];
}
