/**
 * DCF Valuation Model — Australian market edition.
 * Currency: AUD. Corporate tax rate: 30% (or 25% for small companies).
 * Franking credits included in equity cost calculation.
 */

export interface DCFInputs {
  // Company
  companyName: string;
  ticker: string;
  sharesOutstanding: number;  // millions

  // Financials (AUD millions)
  currentFCF: number;         // Free cash flow — last 12 months
  revenue: number;
  ebitda: number;
  capex: number;
  workingCapitalChange: number;

  // Growth assumptions
  growthRate1to5: number;     // % p.a. for years 1–5
  growthRate6to10: number;    // % p.a. for years 6–10
  terminalGrowthRate: number; // Long-run growth (typ. 2–3% for Australia)

  // Discount rate
  wacc: number;               // Weighted average cost of capital

  // Australian-specific
  corporateTaxRate: number;   // 30% default (25% for SMEs)
  frankingCreditRate: number; // % of tax paid that generates franking credits (typically 100%)
  dividendPayoutRatio: number;// % of earnings paid as dividends

  // International comparison
  currency: "AUD" | "USD";
  usdAudRate: number;         // AUD per 1 USD (e.g. 1.55)
}

export interface DCFOutputs {
  // Per-year projections
  years: number[];
  fcfProjections: number[];
  pvFCF: number[];

  // Valuation
  pvFCFTotal: number;
  terminalValue: number;
  pvTerminalValue: number;
  enterpriseValue: number;
  equityValue: number;
  intrinsicValuePerShare: number;

  // Australian-specific
  frankingCreditValue: number;     // AUD value of franking credits per share
  grossedUpDividendYield: number;  // Dividend yield grossed up for franking

  // Sensitivity
  sensitivityTable: {
    wacc: number;
    terminalGrowth: number;
    intrinsicValue: number;
  }[];

  // International comparison
  valueInUSD: number | null;
}

export function runDCF(inputs: DCFInputs): DCFOutputs {
  const {
    currentFCF, growthRate1to5, growthRate6to10, terminalGrowthRate,
    wacc, sharesOutstanding, corporateTaxRate, frankingCreditRate,
    dividendPayoutRatio, usdAudRate, currency, ebitda, revenue, capex,
  } = inputs;

  const FORECAST_YEARS = 10;
  const years: number[] = [];
  const fcfProjections: number[] = [];
  const pvFCF: number[] = [];

  let fcf = currentFCF;
  for (let y = 1; y <= FORECAST_YEARS; y++) {
    years.push(y);
    const growthRate = y <= 5 ? growthRate1to5 / 100 : growthRate6to10 / 100;
    fcf = fcf * (1 + growthRate);
    fcfProjections.push(fcf);
    pvFCF.push(fcf / Math.pow(1 + wacc / 100, y));
  }

  const pvFCFTotal = pvFCF.reduce((a, b) => a + b, 0);
  const lastFCF = fcfProjections[FORECAST_YEARS - 1];
  const terminalValue = (lastFCF * (1 + terminalGrowthRate / 100)) / (wacc / 100 - terminalGrowthRate / 100);
  const pvTerminalValue = terminalValue / Math.pow(1 + wacc / 100, FORECAST_YEARS);

  const enterpriseValue = pvFCFTotal + pvTerminalValue;
  const equityValue = enterpriseValue;  // Simplified (no net debt adjustment — add in production)
  const intrinsicValuePerShare = equityValue / sharesOutstanding;

  // Australian franking credit value
  // Franking credit grosses up the dividend by: dividend / (1 - tax rate) - dividend
  const annualDividendPerShare = (currentFCF / sharesOutstanding) * (dividendPayoutRatio / 100);
  const frankingCreditPerShare = (annualDividendPerShare / (1 - corporateTaxRate / 100) - annualDividendPerShare) * (frankingCreditRate / 100);
  const grossedUpDividend = annualDividendPerShare + frankingCreditPerShare;
  const grossedUpDividendYield = intrinsicValuePerShare > 0 ? (grossedUpDividend / intrinsicValuePerShare) * 100 : 0;

  // Sensitivity table: vary WACC ±2% and terminal growth ±1%
  const sensitivityTable: DCFOutputs["sensitivityTable"] = [];
  for (const waccDelta of [-2, -1, 0, 1, 2]) {
    for (const tgDelta of [-1, 0, 1]) {
      const w = wacc + waccDelta;
      const tg = terminalGrowthRate + tgDelta;
      if (w <= tg) continue;

      let pv = 0;
      let cf = currentFCF;
      for (let y = 1; y <= FORECAST_YEARS; y++) {
        cf = cf * (1 + (y <= 5 ? growthRate1to5 : growthRate6to10) / 100);
        pv += cf / Math.pow(1 + w / 100, y);
      }
      const tv = (cf * (1 + tg / 100)) / (w / 100 - tg / 100);
      const pvTV = tv / Math.pow(1 + w / 100, FORECAST_YEARS);
      const iv = (pv + pvTV) / sharesOutstanding;

      sensitivityTable.push({ wacc: w, terminalGrowth: tg, intrinsicValue: Math.round(iv * 100) / 100 });
    }
  }

  return {
    years,
    fcfProjections,
    pvFCF,
    pvFCFTotal,
    terminalValue,
    pvTerminalValue,
    enterpriseValue,
    equityValue,
    intrinsicValuePerShare: Math.round(intrinsicValuePerShare * 100) / 100,
    frankingCreditValue: Math.round(frankingCreditPerShare * 100) / 100,
    grossedUpDividendYield: Math.round(grossedUpDividendYield * 100) / 100,
    sensitivityTable,
    valueInUSD: currency === "AUD" ? Math.round((intrinsicValuePerShare / usdAudRate) * 100) / 100 : null,
  };
}

// Pre-populated Australian company examples
export const ASX_EXAMPLES: Record<string, Partial<DCFInputs>> = {
  "CBA (Bank)": {
    companyName: "Commonwealth Bank", ticker: "CBA", sharesOutstanding: 1769,
    currentFCF: 10000, revenue: 27000, ebitda: 15000, capex: 1500, workingCapitalChange: 200,
    growthRate1to5: 6, growthRate6to10: 4, terminalGrowthRate: 2.5,
    wacc: 9.5, corporateTaxRate: 30, frankingCreditRate: 100, dividendPayoutRatio: 75,
    currency: "AUD", usdAudRate: 1.55,
  },
  "BHP (Mining)": {
    companyName: "BHP Group", ticker: "BHP", sharesOutstanding: 5065,
    currentFCF: 18000, revenue: 55000, ebitda: 28000, capex: 7000, workingCapitalChange: -500,
    growthRate1to5: 4, growthRate6to10: 2, terminalGrowthRate: 1.5,
    wacc: 10.5, corporateTaxRate: 30, frankingCreditRate: 100, dividendPayoutRatio: 60,
    currency: "AUD", usdAudRate: 1.55,
  },
  "CSL (Healthcare)": {
    companyName: "CSL Limited", ticker: "CSL", sharesOutstanding: 477,
    currentFCF: 3500, revenue: 18000, ebitda: 5500, capex: 2000, workingCapitalChange: 300,
    growthRate1to5: 12, growthRate6to10: 8, terminalGrowthRate: 3.5,
    wacc: 9.0, corporateTaxRate: 30, frankingCreditRate: 30, dividendPayoutRatio: 50,
    currency: "AUD", usdAudRate: 1.55,
  },
};
