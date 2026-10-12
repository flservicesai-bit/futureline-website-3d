/**
 * Translated labels for a course's level and delivery type.
 *
 * Level is stored as display text ('Beginner'); delivery as an enum
 * ('IN_PERSON'). Both map onto keys in the `coursesPage` namespace and fall
 * back to the raw value for anything new the admin portal adds.
 */
const LEVEL_KEY: Record<string, string> = {
  beginner: 'levelBeginner',
  intermediate: 'levelIntermediate',
  advanced: 'levelAdvanced',
};

const DELIVERY_KEY: Record<string, string> = {
  ONLINE: 'deliveryOnline',
  IN_PERSON: 'deliveryInPerson',
  HYBRID: 'deliveryHybrid',
};

type Translate = (key: string) => string;

export function courseLevelLabel(t: Translate, level: string): string {
  const key = LEVEL_KEY[level.toLowerCase()];
  return key ? t(key) : level;
}

export function courseDeliveryLabel(t: Translate, deliveryType: string): string {
  const key = DELIVERY_KEY[deliveryType];
  return key ? t(key) : deliveryType.replace('_', ' ');
}
