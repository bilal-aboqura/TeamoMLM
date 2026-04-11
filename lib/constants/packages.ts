export const PACKAGE_LEVEL_MAP: Record<string, number> = {
  A1: 1,
  A2: 2,
  A3: 3,
  B1: 4,
  B2: 5,
  B3: 6,
};

export const LEVEL_TO_PACKAGE: Record<number, string> = {
  0: "الكل",
  1: "A1",
  2: "A2",
  3: "A3",
  4: "B1",
  5: "B2",
  6: "B3",
};

export const VIP_LEVELS = [
  { value: "0", label: "الكل" },
  { value: "1", label: "A1" },
  { value: "2", label: "A2" },
  { value: "3", label: "A3" },
  { value: "4", label: "B1" },
  { value: "5", label: "B2" },
  { value: "6", label: "B3" },
] as const;
