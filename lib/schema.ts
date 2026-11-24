export const schema = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  registration_no TEXT,
  district TEXT,
  subcounty TEXT,
  village TEXT,
  phone TEXT,
  email TEXT,
  currency TEXT NOT NULL DEFAULT 'UGX',
  fy_start TEXT NOT NULL,
  season_label TEXT,
  retention_years INTEGER NOT NULL DEFAULT 7,
  sms_gateway TEXT NOT NULL DEFAULT 'not_connected'
);

CREATE TABLE IF NOT EXISTS sequences (
  name TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY,
  employee_no TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  gender TEXT,
  dob TEXT,
  national_id TEXT,
  phone TEXT,
  email TEXT,
  next_of_kin TEXT,
  next_of_kin_phone TEXT,
  district TEXT,
  subcounty TEXT,
  village TEXT,
  address TEXT,
  position TEXT,
  department TEXT,
  reports_to INTEGER REFERENCES staff(id),
  hire_date TEXT,
  contract_type TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  basic_salary REAL NOT NULL DEFAULT 0,
  allowances REAL NOT NULL DEFAULT 0,
  pwd INTEGER NOT NULL DEFAULT 0,
  pwd_notes TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','manager','field','finance','viewer')),
  staff_id INTEGER REFERENCES staff(id),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  district TEXT,
  subcounty TEXT,
  village TEXT,
  leader_name TEXT,
  phone TEXT,
  formed_on TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS farmers (
  id INTEGER PRIMARY KEY,
  farmer_code TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  gender TEXT,
  dob TEXT,
  national_id TEXT,
  phone TEXT,
  alt_phone TEXT,
  group_id INTEGER REFERENCES groups(id),
  district TEXT,
  subcounty TEXT,
  parish TEXT,
  village TEXT,
  membership_date TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  household_size INTEGER,
  education TEXT,
  marital_status TEXT,
  pwd INTEGER NOT NULL DEFAULT 0,
  pwd_notes TEXT,
  main_enterprise TEXT,
  opening_payable REAL NOT NULL DEFAULT 0,
  consent_store INTEGER NOT NULL DEFAULT 0,
  consent_sms INTEGER NOT NULL DEFAULT 0,
  added_by INTEGER REFERENCES users(id),
  recorded_by_name TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shares (
  id INTEGER PRIMARY KEY,
  farmer_id INTEGER NOT NULL REFERENCES farmers(id),
  certificate_no TEXT NOT NULL UNIQUE,
  class_name TEXT NOT NULL DEFAULT 'Ordinary',
  share_count INTEGER NOT NULL,
  nominal_value REAL NOT NULL,
  amount_paid REAL NOT NULL,
  issued_on TEXT NOT NULL,
  pay_mode TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS gardens (
  id INTEGER PRIMARY KEY,
  farmer_id INTEGER NOT NULL REFERENCES farmers(id),
  name TEXT NOT NULL,
  size_ha REAL,
  district TEXT,
  subcounty TEXT,
  parish TEXT,
  village TEXT,
  latitude REAL,
  longitude REAL,
  altitude_m REAL,
  produce TEXT,
  variety TEXT,
  planting_date TEXT,
  spacing TEXT,
  plant_population INTEGER,
  field_age_years REAL,
  expected_harvest TEXT,
  expected_yield_kg REAL,
  soil_type TEXT,
  shade TEXT,
  irrigation TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS inspections (
  id INTEGER PRIMARY KEY,
  garden_id INTEGER NOT NULL REFERENCES gardens(id),
  inspection_date TEXT NOT NULL,
  inspection_type TEXT NOT NULL,
  inspector TEXT,
  result TEXT,
  certificate_no TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY,
  farmer_id INTEGER NOT NULL REFERENCES farmers(id),
  service_date TEXT NOT NULL,
  service TEXT NOT NULL,
  staff_name TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS bulking_centres (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  district TEXT,
  subcounty TEXT,
  village TEXT,
  latitude REAL,
  longitude REAL,
  altitude_m REAL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS varieties (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  produce TEXT NOT NULL,
  introduced_on TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS price_schedules (
  id INTEGER PRIMARY KEY,
  produce TEXT NOT NULL,
  grade TEXT NOT NULL,
  unit_price REAL NOT NULL,
  default_premium REAL NOT NULL DEFAULT 0,
  effective_from TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS collections (
  id INTEGER PRIMARY KEY,
  receipt_no TEXT NOT NULL UNIQUE,
  trace_code TEXT NOT NULL UNIQUE,
  collection_date TEXT NOT NULL,
  farmer_id INTEGER NOT NULL REFERENCES farmers(id),
  group_id INTEGER REFERENCES groups(id),
  garden_id INTEGER REFERENCES gardens(id),
  centre_id INTEGER NOT NULL REFERENCES bulking_centres(id),
  produce TEXT NOT NULL,
  grade TEXT NOT NULL,
  volume_kg REAL NOT NULL,
  moisture REAL,
  defects_pct REAL,
  unit_price REAL NOT NULL,
  premium REAL NOT NULL DEFAULT 0,
  gross_amount REAL NOT NULL,
  amount_paid REAL NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  notes TEXT,
  recorded_by INTEGER,
  batch_id INTEGER,
  journal_id INTEGER
);

CREATE TABLE IF NOT EXISTS batches (
  id INTEGER PRIMARY KEY,
  batch_code TEXT NOT NULL UNIQUE,
  trace_code TEXT NOT NULL UNIQUE,
  collection_id INTEGER REFERENCES collections(id),
  produce TEXT NOT NULL,
  state TEXT NOT NULL,
  qty REAL NOT NULL,
  total_cost REAL NOT NULL,
  location TEXT,
  received_on TEXT,
  component_traces TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS conversions (
  id INTEGER PRIMARY KEY,
  conv_date TEXT NOT NULL,
  process TEXT NOT NULL,
  output_batch_id INTEGER NOT NULL REFERENCES batches(id),
  process_cost REAL NOT NULL DEFAULT 0,
  output_qty REAL NOT NULL,
  notes TEXT,
  done_by INTEGER,
  journal_id INTEGER
);

CREATE TABLE IF NOT EXISTS conversion_inputs (
  id INTEGER PRIMARY KEY,
  conversion_id INTEGER NOT NULL REFERENCES conversions(id),
  batch_id INTEGER NOT NULL REFERENCES batches(id),
  qty REAL NOT NULL,
  cost REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY,
  payment_no TEXT NOT NULL UNIQUE,
  payment_date TEXT NOT NULL,
  farmer_id INTEGER NOT NULL REFERENCES farmers(id),
  applied_to TEXT NOT NULL,
  collection_id INTEGER REFERENCES collections(id),
  direction TEXT NOT NULL,
  mode TEXT NOT NULL,
  amount REAL NOT NULL,
  notes TEXT,
  recorded_by INTEGER,
  journal_id INTEGER
);

CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY,
  sale_no TEXT NOT NULL UNIQUE,
  sale_date TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_contact TEXT,
  buyer_type TEXT,
  batch_id INTEGER NOT NULL REFERENCES batches(id),
  farmer_id INTEGER REFERENCES farmers(id),
  produce TEXT NOT NULL,
  state TEXT NOT NULL,
  trace_code TEXT,
  qty REAL NOT NULL,
  unit_price REAL NOT NULL,
  total_amount REAL NOT NULL,
  cogs REAL NOT NULL,
  pay_mode TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  notes TEXT,
  recorded_by INTEGER,
  journal_id INTEGER
);

CREATE TABLE IF NOT EXISTS input_items (
  id INTEGER PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT,
  variety TEXT,
  unit TEXT,
  qty_on_hand REAL NOT NULL DEFAULT 0,
  unit_cost REAL NOT NULL DEFAULT 0,
  introduced_on TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS input_issues (
  id INTEGER PRIMARY KEY,
  issue_date TEXT NOT NULL,
  item_id INTEGER REFERENCES input_items(id),
  farmer_id INTEGER NOT NULL REFERENCES farmers(id),
  issue_type TEXT NOT NULL,
  qty REAL,
  amount REAL NOT NULL,
  notes TEXT,
  loan_id INTEGER,
  issued_by INTEGER,
  journal_id INTEGER
);

CREATE TABLE IF NOT EXISTS funders (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS loan_products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  funder_id INTEGER REFERENCES funders(id),
  book TEXT NOT NULL,
  interest_rate REAL NOT NULL,
  term_months INTEGER,
  max_amount REAL,
  target TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS loans (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  product_id INTEGER REFERENCES loan_products(id),
  farmer_id INTEGER NOT NULL REFERENCES farmers(id),
  book TEXT NOT NULL,
  principal REAL NOT NULL,
  outstanding REAL NOT NULL,
  interest_rate REAL NOT NULL,
  interest_received REAL NOT NULL DEFAULT 0,
  disbursed_on TEXT NOT NULL,
  due_on TEXT,
  purpose TEXT,
  is_opening INTEGER NOT NULL DEFAULT 0,
  recorded_by INTEGER
);

CREATE TABLE IF NOT EXISTS facilities (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  funder_id INTEGER REFERENCES funders(id),
  name TEXT NOT NULL,
  principal REAL NOT NULL,
  outstanding REAL NOT NULL,
  interest_rate REAL NOT NULL,
  interest_paid REAL NOT NULL DEFAULT 0,
  disbursed_on TEXT,
  due_on TEXT,
  purpose TEXT,
  is_opening INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payroll (
  id INTEGER PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES staff(id),
  period TEXT NOT NULL,
  basic REAL NOT NULL,
  allowances REAL NOT NULL,
  nssf_employee REAL NOT NULL,
  nssf_employer REAL NOT NULL,
  paye REAL NOT NULL,
  net_pay REAL NOT NULL,
  expense REAL NOT NULL,
  paid_on TEXT NOT NULL,
  journal_id INTEGER,
  UNIQUE (staff_id, period)
);

CREATE TABLE IF NOT EXISTS trainings (
  id INTEGER PRIMARY KEY,
  training_date TEXT NOT NULL,
  audience TEXT NOT NULL,
  topic TEXT NOT NULL,
  trainers TEXT,
  summary TEXT,
  location TEXT,
  language TEXT,
  notes TEXT,
  recorded_by INTEGER
);

CREATE TABLE IF NOT EXISTS training_attendees (
  id INTEGER PRIMARY KEY,
  training_id INTEGER NOT NULL REFERENCES trainings(id),
  farmer_id INTEGER REFERENCES farmers(id),
  staff_id INTEGER REFERENCES staff(id),
  is_representative INTEGER NOT NULL DEFAULT 0,
  person_name TEXT NOT NULL,
  group_name TEXT,
  gender TEXT,
  age INTEGER,
  phone TEXT,
  dob TEXT
);

CREATE TABLE IF NOT EXISTS councils (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  formed_on TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS council_members (
  id INTEGER PRIMARY KEY,
  council_id INTEGER NOT NULL REFERENCES councils(id),
  farmer_id INTEGER REFERENCES farmers(id),
  member_name TEXT NOT NULL,
  role TEXT NOT NULL,
  gender TEXT,
  phone TEXT,
  dob TEXT,
  started_on TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY,
  created_at TEXT NOT NULL,
  channel TEXT NOT NULL,
  language TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  audience TEXT,
  event_type TEXT,
  event_id INTEGER,
  status TEXT NOT NULL,
  skipped_consent INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER
);

CREATE TABLE IF NOT EXISTS message_recipients (
  id INTEGER PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES messages(id),
  farmer_id INTEGER,
  phone TEXT,
  name TEXT,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS journals (
  id INTEGER PRIMARY KEY,
  entry_date TEXT NOT NULL,
  reference TEXT,
  memo TEXT,
  source TEXT NOT NULL,
  source_id INTEGER,
  cashflow TEXT NOT NULL,
  created_by INTEGER
);

CREATE TABLE IF NOT EXISTS journal_lines (
  id INTEGER PRIMARY KEY,
  journal_id INTEGER NOT NULL REFERENCES journals(id),
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  debit REAL NOT NULL DEFAULT 0,
  credit REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id INTEGER,
  details TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_farmers_group ON farmers(group_id);
CREATE INDEX IF NOT EXISTS idx_gardens_farmer ON gardens(farmer_id);
CREATE INDEX IF NOT EXISTS idx_collections_farmer ON collections(farmer_id);
CREATE INDEX IF NOT EXISTS idx_collections_date ON collections(collection_date);
CREATE INDEX IF NOT EXISTS idx_payments_farmer ON payments(farmer_id);
CREATE INDEX IF NOT EXISTS idx_journal_date ON journals(entry_date);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_log(created_at);
`
