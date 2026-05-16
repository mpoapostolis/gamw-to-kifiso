/**
 * ΑΚΟΜΑ ΕΓΩ — tableau registry.
 *
 * Maps the string keys used in src/still/story.ts (`chapter.tableau`) to
 * the builder functions the three tableau files export. StoryScene calls
 * `getTableau(key)` to find the right set for the chapter it's about to
 * play.
 */
import type { TableauBuilder } from "../../../still/tableau";
import { buildBedroomNight } from "./bedroomNight";
import { buildHomeEnd } from "./homeEnd";
import { buildJourney } from "./journey";
import { buildTrainBack } from "./trainBack";
import { buildKitchenOther } from "./kitchenOther";
import { buildFourDays } from "./fourDays";

const TABLEAUX: Record<string, TableauBuilder> = {
  bedroom_night: buildBedroomNight,
  home_end: buildHomeEnd,
  journey: buildJourney,
  train_back: buildTrainBack,
  kitchen_other: buildKitchenOther,
  four_days: buildFourDays,
};

export function getTableau(key: string): TableauBuilder | undefined {
  return TABLEAUX[key];
}
