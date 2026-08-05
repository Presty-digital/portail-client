export const CURRENT_VERSION = 7;
export const STATE_ID = "presty-main";
export const CATEGORIES = ["Minceur", "Visage", "Épilation", "Autres"] as const;
export const STATUTS = ["Non qualifié", "Appel 1", "Appel 2", "RDV fixé", "Client converti", "Perdu"] as const;

export const uid = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 9);

export const today = (): string => new Date().toISOString().slice(0, 10);

export type AppState = {
  version: number;
  initialized: boolean;
  users: any[];
  instituts: any[];
  campaigns: any[];
  leads: any[];
  expenses: any[];
  reviews: any[];
  [key: string]: unknown;
};

export const emptyState = (): AppState => ({
  version: CURRENT_VERSION,
  initialized: false,
  users: [],
  instituts: [],
  campaigns: [],
  leads: [],
  expenses: [],
  reviews: [],
});

const asArray = (value: unknown): any[] => (Array.isArray(value) ? value : []);

export function migrate(raw: unknown): AppState {
  const base = emptyState();
  if (!raw || typeof raw !== "object") return base;

  const source = raw as Record<string, any>;
  const output: AppState = {
    ...base,
    ...source,
    version: CURRENT_VERSION,
    users: asArray(source.users),
    instituts: asArray(source.instituts),
    campaigns: asArray(source.campaigns),
    leads: asArray(source.leads),
    expenses: asArray(source.expenses ?? source.spend),
    reviews: asArray(source.reviews),
    initialized: Boolean(
      source.initialized || asArray(source.users).some((user) => user?.role === "agency_admin")
    ),
  };

  return output;
}
