/** Every destination in the app. Navigation is a state value, not a router. */
export type Page =
  | 'home'
  | 'identify'
  | 'triage'
  | 'discover'
  | 'dashboard'
  | 'history'
  | 'account'
  | 'species'
  | 'government';

export type Navigate = (page: Page) => void;