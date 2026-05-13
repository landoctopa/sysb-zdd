export const SECTORS = [
  "advertising_marketing",
  "agriculture",
  "chemicals",
  "construction_real_estate",
  "consumer_goods_retail",
  "defence_aerospace",
  "education",
  "energy_environment",
  "fintech_financial_services",
  "food_beverage",
  "government_public_sector",
  "healthcare_life_sciences",
  "logistics_transportation",
  "manufacturing_industrial",
  "media_entertainment",
  "non_profit_social_enterprises",
  "professional_business_services",
  "retail",
  "startup",
  "technology",
  "telecommunications",
  "travel_hospitality"
] as const;

export type Sectors = typeof SECTORS[number];

export const EVENT_CATEGORIES = [
  "launch",
  "funding",
  "expansion",
  "new_hire",
  "rebranding",
  "partnership",
  "merger_acquisition",   // replaces "ma"
  "regulatory_update",    // replaces "reg-upd"
  "company_news",         // replaces "news"
  "events_meetups",       // replaces "event"
  "other"
] as const;

export type EventCategory = typeof EVENT_CATEGORIES[number];



export const SECTOR_LABELS: Record<string, string> = {
  advertising_marketing: 'Advertising & Marketing',
  agriculture: 'Agriculture',
  chemicals: 'Chemicals',
  construction_real_estate: 'Construction & Real Estate',
  consumer_goods_retail: 'Consumer Goods & Retail',
  defence_aerospace: 'Defence & Aerospace',
  education: 'Education',
  energy_environment: 'Energy & Environment',
  fintech_financial_services: 'Fintech & Financial Services',
  food_beverage: 'Food & Beverage',
  government_public_sector: 'Government & Public Sector',
  healthcare_life_sciences: 'Healthcare & Life Sciences',
  logistics_transportation: 'Logistics & Transportation',
  manufacturing_industrial: 'Manufacturing & Industrial',
  media_entertainment: 'Media & Entertainment',
  non_profit_social_enterprises: 'Non‑Profit & Social Enterprises',
  professional_business_services: 'Professional & Business Services',
  retail: 'Retail',
  startup: 'Startup',
  technology: 'Technology',
  telecommunications: 'Telecommunications',
  travel_hospitality: 'Travel & Hospitality',
  other: 'Other',
};

export const EVENT_CATEGORY_LABELS: Record<string, string> = {
  launch: 'Launch',
  funding: 'Funding',
  expansion: 'Expansion',
  new_hire: 'New Hire',
  rebranding: 'Rebranding',
  partnership: 'Partnership',
  merger_acquisition: 'M&A',
  regulatory_update: 'Regulatory Update',
  company_news: 'Company News',
  events_meetups: 'Events/Meetups',
  other: 'Other',
};

export const USER_SIGNAL_STATUS = [
    // populate this 
]