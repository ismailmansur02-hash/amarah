/** Single source of truth for the business name shown across the app. */
export const BRAND = {
  /** Full legal/display name. */
  name: "E, Management",
  /** Leading mark, rendered in full-strength ink in the wordmark. */
  mark: "E,",
  /** Trailing word rendered muted in the wordmark. */
  rest: "Management",
  tagline: "Property management portal for owners and managers",
  /** Matches --paper, so the browser and PWA chrome continue the page. */
  themeColor: "#fbfbfd",

  /**
   * The iOS app's App Store listing, once there is one.
   *
   * Until then this stays null and the badge says the app is coming and sends
   * people to the install guide, where they can already add the portal to
   * their home screen today. Set this to the store URL when the app ships and
   * the badge becomes a real link on its own — nothing else to change.
   */
  appStoreUrl: null as string | null,
};
