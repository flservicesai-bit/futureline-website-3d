/**
 * Message namespaces sent to the browser.
 *
 * Only components that call useTranslations() can run in the browser and
 * need their messages there. Everything read with getTranslations() stays on
 * the server, so the long-form copy (legal pages, service pages, course page
 * text: about 80% of the catalogue) no longer ships with every page.
 *
 * Add a namespace here when a client component starts using it.
 * `npm run check:messages` (also run in CI) fails if one is missing.
 */
export const CLIENT_NAMESPACES = [
  'a11y',
  'aiRecommend',
  'audit',
  'auth',
  'buildMockup',
  'changePassword',
  'courseEnquiry',
  'enroll',
  'errorPage',
  'footer',
  'getStarted',
  'inactivity',
  'lessonViewer',
  'nav',
  'pillars',
  'promo',
  'serviceDetail',
  'serviceForm',
  'story',
  'visionMission',
] as const;

export function clientMessages(messages: Record<string, unknown>) {
  return Object.fromEntries(
    CLIENT_NAMESPACES.filter((ns) => ns in messages).map((ns) => [ns, messages[ns]]),
  );
}
