export interface CompanyDetails {
  sector: string;          // Selected from a definitive dropdown list
  products: string[];      // Populated via a dynamic string array tag input field
  target_market: string[]; // Selected using interactive toggled pill selections
  address: string | null;  // Text string field
  is_public: boolean;      // Managed via switch or check states
  employee_count: number;  // Numeric baseline capture
}