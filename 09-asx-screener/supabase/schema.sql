-- ASX Hedge Fund Screener — Supabase Schema
-- Run in your Supabase SQL editor to set up the stocks table.

create table if not exists asx_stocks (
  id            bigserial primary key,
  ticker        text unique not null,
  name          text not null,
  sector        text,
  industry      text,
  market_cap    bigint,     -- AUD
  price         numeric,    -- AUD
  pe_ratio      numeric,
  pb_ratio      numeric,
  ps_ratio      numeric,
  ev_ebitda     numeric,
  roe           numeric,    -- %
  roic          numeric,    -- % — key hedge fund metric
  fcf_yield     numeric,    -- %
  fcf_growth_3y numeric,    -- % 3-year FCF CAGR
  div_yield     numeric,    -- %
  franking_pct  integer,    -- 0–100
  debt_equity   numeric,
  insider_pct   numeric,    -- % shares held by insiders / directors
  short_interest numeric,   -- % of float
  asx200        boolean default false,
  asx300        boolean default false,
  updated_at    timestamptz default now()
);

-- Enable RLS (restrict reads to authenticated users in production)
alter table asx_stocks enable row level security;
create policy "Public read access" on asx_stocks for select using (true);

-- Sample seed data (top 20 ASX stocks)
insert into asx_stocks (ticker, name, sector, market_cap, price, pe_ratio, pb_ratio, ps_ratio, ev_ebitda, roe, roic, fcf_yield, fcf_growth_3y, div_yield, franking_pct, debt_equity, insider_pct, short_interest, asx200, asx300)
values
  ('CBA',  'Commonwealth Bank',        'Financials',      190000000000, 130.50, 22.1, 2.8,  null, 15.2, 14.2, 12.1, 4.8,  8.2,  4.2, 100, null, 0.1, 0.8, true, true),
  ('BHP',  'BHP Group',                'Materials',       220000000000, 43.80,  12.5, 2.1,  2.1,  7.8,  25.1, 22.3, 8.5,  5.1,  5.8, 100, 45.2, 0.3, 2.1, true, true),
  ('CSL',  'CSL Limited',              'Healthcare',      135000000000, 284.00, 35.2, 8.5,  6.8,  28.5, 24.3, 18.9, 3.2,  14.5, 1.2, 30,  120.5, 0.8, 1.5, true, true),
  ('NAB',  'National Australia Bank',  'Financials',       99000000000, 36.20,  15.2, 1.7,  null, 11.5, 11.2,  9.8, 5.1,  3.2,  5.8, 100, null, 0.2, 0.9, true, true),
  ('WBC',  'Westpac Banking',          'Financials',       90000000000, 27.80,  14.8, 1.5,  null, 10.8, 10.5,  9.1, 5.5,  2.8,  6.2, 100, null, 0.1, 1.2, true, true),
  ('ANZ',  'ANZ Banking Group',        'Financials',       83000000000, 27.10,  13.5, 1.4,  null,  9.8,  9.8,  8.5, 6.2,  2.5,  6.5, 100, null, 0.3, 1.1, true, true),
  ('WES',  'Wesfarmers',              'Consumer Discretionary', 72000000000, 64.80, 28.5, 7.2, 1.8, 21.2, 28.5, 22.1, 4.2, 6.8,  3.8, 100, 55.2, 1.2, 0.8, true, true),
  ('MQG',  'Macquarie Group',         'Financials',       68000000000, 194.00, 18.2, 2.1,  5.2,  14.8, 15.8, 12.5, 3.8,  9.2,  4.5, 45,  85.2, 1.8, 1.5, true, true),
  ('WOW',  'Woolworths Group',        'Consumer Staples', 40000000000,  34.20, 26.5, 8.5,  0.6,  18.5, 32.5, 15.2, 4.5,  4.2,  2.8, 100, 120.5, 0.5, 1.8, true, true),
  ('FMG',  'Fortescue Ltd',           'Materials',        55000000000, 17.80,   8.5, 2.2,  2.5,   5.8, 28.5, 25.1, 12.5, 8.5,  8.2, 100, 38.5, 2.5, 4.2, true, true),
  ('RIO',  'Rio Tinto Ltd',           'Materials',        45000000000, 110.50, 10.5, 1.8,  1.9,   6.5, 22.1, 19.8, 9.8,  4.5,  6.8, 100, 42.5, 0.8, 1.8, true, true),
  ('TLS',  'Telstra Group',           'Communication',    46000000000,   4.05, 24.5, 2.8,  2.8,  12.5, 12.5,  8.5, 5.2,  2.5,  5.5, 100, 85.2, 0.5, 1.5, true, true),
  ('GMG',  'Goodman Group',           'Real Estate',      51000000000, 26.50,  35.2, 3.8,  12.5, 28.5, 12.5, 10.2, 3.8,  8.5,  1.5, 100, 45.8, 2.8, 1.2, true, true),
  ('REA',  'REA Group',               'Communication',    18000000000, 185.00, 52.5, 12.5,  8.5,  42.5, 28.5, 22.1, 2.5, 18.5,  0.8,  15, 25.2, 2.5, 0.8, true, true),
  ('COL',  'Coles Group',             'Consumer Staples', 23000000000,  17.80, 22.5, 8.5,   0.5,  15.8, 38.5, 18.5, 5.8,  4.2,  4.2, 100, 250.5, 0.5, 1.8, true, true),
  ('ALL',  'Aristocrat Leisure',      'Consumer Disc',    25000000000,  51.50, 25.2, 5.8,   4.5,  18.5, 25.2, 20.5, 4.8,  12.5,  2.2, 100, 55.2, 1.5, 1.5, true, true),
  ('QBE',  'QBE Insurance',           'Financials',       22000000000,  18.50, 14.5, 2.1,   1.2,  10.5, 12.5, 10.2, 5.8,  6.5,  4.5, 50,  45.8, 0.8, 1.8, true, true),
  ('STO',  'Santos Ltd',              'Energy',           14000000000,   7.20, 10.5, 1.2,   1.8,   5.8, 12.5, 10.8, 9.2,  5.2,  5.8, 100, 55.2, 1.2, 2.5, true, true),
  ('WDS',  'Woodside Energy',         'Energy',           50000000000,  26.50, 12.5, 1.5,   2.8,   7.5, 14.5, 12.5, 8.5,  4.5,  7.2, 100, 38.5, 0.8, 1.8, true, true),
  ('MIN',  'Mineral Resources',       'Materials',         8000000000,  35.80, 15.2, 2.5,   1.5,   9.5, 15.2, 12.5, 7.2,  8.5,  4.5, 100, 85.2, 8.5, 5.2, true, true);

-- Index for performance
create index idx_asx_stocks_roic on asx_stocks(roic desc);
create index idx_asx_stocks_sector on asx_stocks(sector);
create index idx_asx_stocks_asx200 on asx_stocks(asx200);
