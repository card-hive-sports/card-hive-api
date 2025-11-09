export const SORT_ORDER = {
  ASC: "asc",
  DESC: "desc",
} as const;
export type SORT_ORDER = (typeof SORT_ORDER)[keyof typeof SORT_ORDER];
