// Curated starter list of ZRA-relevant HS codes for Zambian businesses.
// Users can also enter a custom code — this list is a shortcut, not exhaustive.
export type HsCode = { code: string; label: string; vatRate: number; category: "standard" | "zero" | "exempt" };

export const ZRA_HS_CODES: HsCode[] = [
  // Foodstuffs (mostly zero-rated / exempt basics)
  { code: "1006.30", label: "Rice, semi-milled or wholly milled",   vatRate: 0,  category: "zero" },
  { code: "1101.00", label: "Wheat or meslin flour (mealie meal)",  vatRate: 0,  category: "zero" },
  { code: "0401.20", label: "Fresh milk (>1% ≤6% fat)",             vatRate: 0,  category: "zero" },
  { code: "0407.21", label: "Fresh hen eggs",                       vatRate: 0,  category: "zero" },
  { code: "0201.10", label: "Beef carcasses, fresh/chilled",        vatRate: 16, category: "standard" },
  { code: "0207.14", label: "Chicken cuts, frozen",                 vatRate: 16, category: "standard" },
  { code: "1701.99", label: "Refined sugar",                        vatRate: 16, category: "standard" },
  { code: "1507.90", label: "Refined soya-bean cooking oil",        vatRate: 16, category: "standard" },
  // Beverages & tobacco
  { code: "2202.10", label: "Soft drinks (sweetened)",              vatRate: 16, category: "standard" },
  { code: "2203.00", label: "Beer made from malt",                  vatRate: 16, category: "standard" },
  { code: "2402.20", label: "Cigarettes containing tobacco",        vatRate: 16, category: "standard" },
  // Fuels & minerals
  { code: "2710.12", label: "Motor spirit (petrol)",                vatRate: 16, category: "standard" },
  { code: "2710.19", label: "Diesel fuel",                          vatRate: 16, category: "standard" },
  { code: "2523.29", label: "Portland cement",                      vatRate: 16, category: "standard" },
  { code: "7403.11", label: "Refined copper cathodes",              vatRate: 0,  category: "zero" },
  // Hygiene / household
  { code: "3401.11", label: "Toilet soap",                          vatRate: 16, category: "standard" },
  { code: "3402.20", label: "Detergents, retail",                   vatRate: 16, category: "standard" },
  { code: "4818.10", label: "Toilet paper",                         vatRate: 16, category: "standard" },
  // Clothing & footwear
  { code: "6109.10", label: "T-shirts, cotton, knitted",            vatRate: 16, category: "standard" },
  { code: "6403.99", label: "Leather footwear",                     vatRate: 16, category: "standard" },
  // Building / hardware
  { code: "7214.20", label: "Reinforcing steel bars",               vatRate: 16, category: "standard" },
  { code: "7308.30", label: "Steel doors, windows & frames",        vatRate: 16, category: "standard" },
  // ICT / electronics
  { code: "8471.30", label: "Laptop / portable computer",           vatRate: 16, category: "standard" },
  { code: "8517.13", label: "Smartphone",                           vatRate: 16, category: "standard" },
  { code: "8528.72", label: "Television, colour",                   vatRate: 16, category: "standard" },
  // Services (Zambian VSDC uses these ranges)
  { code: "SVC-PRO", label: "Professional services (consulting)",   vatRate: 16, category: "standard" },
  { code: "SVC-TRN", label: "Training & education",                 vatRate: 0,  category: "zero" },
  { code: "SVC-TRP", label: "Transport & logistics",                vatRate: 16, category: "standard" },
  { code: "SVC-ACC", label: "Accommodation & lodging",              vatRate: 16, category: "standard" },
  { code: "SVC-MED", label: "Medical services",                     vatRate: 0,  category: "exempt" },
];

export const findHsCode = (code: string) => ZRA_HS_CODES.find(h => h.code === code);
