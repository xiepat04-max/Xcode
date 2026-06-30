export interface ASXStockData {
  ticker: string;          // e.g. "CBA"
  name: string;
  exchange: "ASX" | "NYSE" | "NASDAQ";
  currency: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  peRatio: number | null;
  eps: number | null;
  dividendYield: number | null;
  frankingPercent: number | null;  // Australian-specific: 0–100
  revenue: number | null;
  netIncome: number | null;
  debtToEquity: number | null;
  roe: number | null;
  week52High: number;
  week52Low: number;
  sector: string;
  industry: string;
  asx200Member: boolean;
  description: string;
}

export interface EarningsRecord {
  date: string;
  epsEstimate: number | null;
  epsActual: number | null;
  surprise: number | null;
  surprisePercent: number | null;
  reportType: "H1" | "FY" | "Q";  // Australian reporting: half-year or full year
}

export interface ResearchReport {
  stock: ASXStockData;
  earnings: EarningsRecord[];
  bullCase: string;
  bearCase: string;
  summary: string;
  keyRisks: string[];
  keyOpportunities: string[];
  analystConsensus: string;
  generatedAt: string;
}
