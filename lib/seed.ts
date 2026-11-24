import { ACCOUNTS, accountBalance, postJournal } from './finance'
import { hashPassword } from './password'
import { get, insert, run, transaction, type DB } from './sql'
import {
  booksAreSound,
  convertStock,
  disburseLoan,
  issueInput,
  logMessage,
  recordCollection,
  recordPayment,
  recordSale,
  repayFacility,
  repayLoan,
  runPayroll,
  saveTraining,
} from './workflows'

const phone = (n: number) => `256770100${String(n).padStart(3, '0')}`

export function seed(db: DB) {
  transaction(db, () => {
    for (const [code, name, type] of ACCOUNTS) insert(db, 'accounts', { code, name, type })

    insert(db, 'settings', {
      id: 1,
      name: 'Rwenzori Highland Coffee Growers Cooperative Society Ltd',
      short_name: 'Rwenzori Highland',
      registration_no: 'PCU/2021/0842',
      district: 'Kasese',
      subcounty: 'Bugoye',
      village: 'Kitsutsu',
      phone: '256700410220',
      email: 'office@rwenzori.coop',
      currency: 'UGX',
      fy_start: '2026-07-01',
      season_label: '2026/27 main harvest',
      retention_years: 7,
      sms_gateway: 'not_connected',
    })

    const amina = insert(db, 'staff', staff('E-001', 'Amina', 'Nyangoma', 'Female', '1984-04-12', 'General manager', 'Management', null, '2019-02-01', 'Permanent', 1_500_000, 200_000, 0, null)).id
    const peter = insert(db, 'staff', staff('E-002', 'Peter', 'Mumbere', 'Male', '1990-08-03', 'Field officer', 'Field', amina, '2021-06-15', 'Permanent', 700_000, 100_000, 0, null)).id
    const grace = insert(db, 'staff', staff('E-003', 'Grace', 'Biira', 'Female', '1988-11-21', 'Finance officer', 'Finance', amina, '2020-01-10', 'Permanent', 900_000, 150_000, 0, null)).id
    const joseph = insert(db, 'staff', staff('E-004', 'Joseph', 'Kule', 'Male', '1993-02-17', 'Field officer', 'Field', peter, '2022-03-01', 'Fixed term', 650_000, 80_000, 0, null)).id
    insert(db, 'staff', staff('E-005', 'Esther', 'Nyakato', 'Female', '1995-07-09', 'Stores officer', 'Stores', amina, '2023-01-16', 'Permanent', 500_000, 50_000, 0, null))
    const davidStaff = insert(db, 'staff', staff('E-006', 'David', 'Kambale', 'Male', '1992-12-01', 'Bulking clerk', 'Field', peter, '2023-08-01', 'Fixed term', 450_000, 40_000, 0, null)).id
    const ruthStaff = insert(db, 'staff', staff('E-007', 'Ruth', 'Kahindo', 'Female', '1996-05-28', 'Administrative assistant', 'Administration', amina, '2024-02-01', 'Permanent', 550_000, 60_000, 1, 'Uses a wheelchair. Meetings that she joins are held at the central store, which has level access.')).id

    const admin = insert(db, 'users', user('Amina Nyangoma', 'amina@rwenzori.coop', 'Admin#2026', 'admin', amina)).id
    const fieldUser = insert(db, 'users', user('Peter Mumbere', 'peter@rwenzori.coop', 'Field#2026', 'field', peter)).id
    const financeUser = insert(db, 'users', user('Grace Biira', 'grace@rwenzori.coop', 'Finance#2026', 'finance', grace)).id
    insert(db, 'users', user('Board Review', 'board@rwenzori.coop', 'Board#2026', 'viewer', null))

    const groups = [
      ['KSC', 'Kasese Central', 'Bugoye', 'Kitsutsu', 'John Baluku', '2016-05-12'],
      ['KYW', 'Kyarumba Women', 'Kyarumba', 'Kyarumba', 'Grace Muhindo', '2018-03-08'],
      ['MLY', 'Maliba Youth', 'Maliba', 'Maliba', 'Peter Kule', '2021-09-01'],
      ['KYH', 'Kyondo Highland', 'Kyondo', 'Kyondo', 'Samuel Masika', '2015-11-20'],
    ] as const
    const groupId: Record<string, number> = {}
    for (const [code, name, subcounty, village, leader, formed] of groups) {
      groupId[code] = insert(db, 'groups', {
        code, name, district: 'Kasese', subcounty, village, leader_name: leader, phone: phone(groups.findIndex((row) => row[0] === code) + 1), formed_on: formed,
      }).id
    }

    const members = [
      ['F-001', 'John', 'Baluku', 'Male', '1978-03-14', 'KSC', 'Kitsutsu', 1_500_000, 1, 'Married', 'Primary', 7, 4_000_000, 40],
      ['F-002', 'Sarah', 'Biira', 'Female', '1982-06-02', 'KSC', 'Ibanda', 0, 1, 'Married', 'Secondary', 5, 3_000_000, 30],
      ['F-003', 'Moses', 'Thembo', 'Male', '1975-11-30', 'KSC', 'Kitsutsu', 0, 1, 'Married', 'Primary', 8, 2_500_000, 25],
      ['F-004', 'Amina', 'Kabugho', 'Female', '1986-01-19', 'KSC', 'Kagando', 0, 1, 'Single', 'Secondary', 3, 2_000_000, 20],
      ['F-005', 'Grace', 'Muhindo', 'Female', '1980-09-08', 'KYW', 'Kyarumba', 1_200_000, 1, 'Married', 'Secondary', 6, 3_500_000, 35],
      ['F-006', 'Esther', 'Masika', 'Female', '1984-04-25', 'KYW', 'Kyabikere', 0, 1, 'Widowed', 'Primary', 4, 2_200_000, 22],
      ['F-007', 'Ruth', 'Biira', 'Female', '1991-12-12', 'KYW', 'Kyarumba', 0, 1, 'Married', 'Secondary', 5, 1_800_000, 18],
      ['F-008', 'Joyce', 'Kule', 'Female', '1987-07-07', 'KYW', 'Kyarumba', 0, 0, 'Married', 'Primary', 6, 1_500_000, 15],
      ['F-009', 'Peace', 'Masereka', 'Female', '1990-02-11', 'KYW', 'Kyabikere', 0, 1, 'Single', 'Tertiary', 2, 1_200_000, 12],
      ['F-010', 'Peter', 'Kule', 'Male', '1994-05-16', 'MLY', 'Maliba', 800_000, 1, 'Single', 'Secondary', 2, 2_800_000, 28],
      ['F-011', 'David', 'Bwambale', 'Male', '1998-08-23', 'MLY', 'Kahokya', 0, 1, 'Single', 'Secondary', 1, 2_400_000, 24],
      ['F-012', 'Joseph', 'Mumbere', 'Male', '1983-10-04', 'MLY', 'Maliba', 0, 1, 'Married', 'Primary', 6, 1_600_000, 16],
      ['F-013', 'Brian', 'Muhindo', 'Male', '1999-01-29', 'MLY', 'Maliba', 0, 1, 'Single', 'Secondary', 1, 1_000_000, 10],
      ['F-014', 'Agnes', 'Biira', 'Female', '2001-03-03', 'MLY', 'Kahokya', 0, 1, 'Single', 'Secondary', 1, 800_000, 10],
      ['F-015', 'Samuel', 'Masika', 'Male', '1972-06-18', 'KYH', 'Kyondo', 500_000, 0, 'Married', 'Primary', 9, 3_200_000, 32],
      ['F-016', 'Florence', 'Kabugho', 'Female', '1985-09-27', 'KYH', 'Kisinga', 0, 1, 'Married', 'Secondary', 5, 2_600_000, 26],
      ['F-017', 'Henry', 'Thembo', 'Male', '1997-11-05', 'KYH', 'Kyondo', 0, 1, 'Married', 'Secondary', 3, 2_200_000, 22],
      ['F-018', 'Mary', 'Nzyabake', 'Female', '1993-04-21', 'KYH', 'Kyondo', 0, 1, 'Married', 'Primary', 4, 1_700_000, 17],
    ] as const

    const farmerId: Record<string, number> = {}
    members.forEach((member, index) => {
      const [code, first, last, gender, dob, group, village, opening, sms, marital, education, household, paid, shareCount] = member
      farmerId[code] = insert(db, 'farmers', {
        farmer_code: code,
        first_name: first,
        last_name: last,
        gender,
        dob,
        national_id: `CM0000${String(1000 + index)}`,
        phone: phone(20 + index),
        group_id: groupId[group],
        district: 'Kasese',
        subcounty: group === 'KSC' ? 'Bugoye' : group === 'KYW' ? 'Kyarumba' : group === 'MLY' ? 'Maliba' : 'Kyondo',
        parish: village,
        village,
        membership_date: index < 9 ? '2018-06-01' : '2021-09-01',
        status: 'active',
        household_size: household,
        education,
        marital_status: marital,
        pwd: code === 'F-008' ? 1 : 0,
        pwd_notes: code === 'F-008' ? 'Low vision. Read training notes aloud and keep SMS short if she later opts in.' : null,
        main_enterprise: code === 'F-018' ? 'Maize' : 'Arabica coffee',
        opening_payable: opening,
        consent_store: 1,
        consent_sms: sms,
        added_by: index % 4 === 0 ? admin : fieldUser,
        notes: code === 'F-004' ? 'Host farmer for the Batian variety plot established in 2024.' : null,
      }).id
      insert(db, 'shares', {
        farmer_id: farmerId[code],
        certificate_no: `SH-${String(index + 1).padStart(3, '0')}`,
        class_name: 'Ordinary',
        share_count: shareCount,
        nominal_value: 100_000,
        amount_paid: paid,
        issued_on: index < 9 ? '2018-06-01' : '2021-09-01',
        notes: paid < shareCount * 100_000 ? 'Call in arrears. Follow up at the next AGM.' : null,
      })
    })

    const gardens = [
      ['Kitsutsu Ridge', 'F-001', 1.2, 0.1842, 30.0901, 1604, 'Arabica coffee', 'SL28', '2014-04-10', 12, 1800],
      ['Ibanda Lower', 'F-002', 0.8, 0.1811, 30.0864, 1548, 'Arabica coffee', 'SL14', '2016-05-02', 10, 1100],
      ['Kitsutsu Valley', 'F-003', 1.6, 0.1866, 30.0933, 1590, 'Arabica coffee', 'SL28', '2012-03-18', 14, 2400],
      ['Kagando Batian', 'F-004', 0.7, 0.1794, 30.0812, 1510, 'Arabica coffee', 'Batian', '2024-04-20', 2, 400],
      ['Kyarumba Home', 'F-005', 1.1, 0.2148, 29.9855, 1722, 'Arabica coffee', 'SL28', '2015-04-12', 11, 1600],
      ['Kyabikere', 'F-006', 0.5, 0.2099, 29.9794, 1688, 'Arabica coffee', 'SL14', '2018-05-01', 8, 700],
      ['Kyarumba East', 'F-008', 0.6, 0.2162, 29.9901, 1735, 'Arabica coffee', 'SL28', '2013-04-15', 13, 900],
      ['Upper Ridge', 'F-010', 1.4, 0.2514, 30.0218, 1760, 'Arabica coffee', 'SL28', '2017-04-08', 9, 2000],
      ['Maliba Slope', 'F-011', 0.9, 0.2488, 30.0184, 1694, 'Arabica coffee', 'Ruiru 11', '2022-05-11', 4, 800],
      ['Kahokya', 'F-014', 0.4, 0.2461, 30.0244, 1662, 'Arabica coffee', 'Batian', '2024-05-03', 2, 250],
      ['Kyondo Peak', 'F-015', 2.1, 0.1428, 29.9491, 1890, 'Arabica coffee', 'SL28', '2010-03-22', 16, 3200],
      ['Kisinga', 'F-016', 0.8, 0.1396, 29.9555, 1812, 'Arabica coffee', 'SL14', '2016-04-19', 10, 1000],
      ['Kyondo West', 'F-017', 1.3, 0.1455, 29.9466, 1844, 'Arabica coffee', 'SL28', '2015-04-02', 11, 1700],
      ['Kyondo Maize', 'F-018', 0.6, 0.1408, 29.9533, 1788, 'Maize', 'Longe 5', '2026-03-01', 0, 1200],
    ] as const
    const gardenId: Record<string, number> = {}
    for (const garden of gardens) {
      const [name, code, size, lat, lng, alt, produce, variety, planted, age, yieldKg] = garden
      const farmer = members.find((item) => item[0] === code)!
      gardenId[name] = insert(db, 'gardens', {
        farmer_id: farmerId[code],
        name,
        size_ha: size,
        district: 'Kasese',
        subcounty: farmer[5] === 'KSC' ? 'Bugoye' : farmer[5] === 'KYW' ? 'Kyarumba' : farmer[5] === 'MLY' ? 'Maliba' : 'Kyondo',
        parish: farmer[6],
        village: farmer[6],
        latitude: lat,
        longitude: lng,
        altitude_m: alt,
        produce,
        variety,
        planting_date: planted,
        spacing: produce === 'Maize' ? '0.75 m x 0.30 m' : '2.4 m x 2.4 m',
        plant_population: produce === 'Maize' ? 18000 : Math.round(size * 1600),
        field_age_years: age,
        expected_harvest: produce === 'Maize' ? '2026-12-20' : '2026-12-15',
        expected_yield_kg: yieldKg,
        soil_type: 'Volcanic loam',
        shade: produce === 'Maize' ? 'Open field' : 'Banana and ficus',
        irrigation: 'Rainfed',
        notes: name === 'Kagando Batian' ? 'Demonstration plot for the variety introduced in 2024.' : null,
      }).id
    }

    insert(db, 'inspections', { garden_id: gardenId['Kyondo Peak'], inspection_date: '2026-08-20', inspection_type: 'Internal organic', inspector: 'Peter Mumbere', result: 'Pass', certificate_no: 'INT-2026-014', notes: 'Shade and record book in order. One plot edge needs a buffer refresh.' })
    insert(db, 'inspections', { garden_id: gardenId['Upper Ridge'], inspection_date: '2026-10-10', inspection_type: 'Pre-harvest', inspector: 'Joseph Kule', result: 'Pass', notes: 'Cherry ripening evenly. Suitable for grade A if picked ripe.' })
    insert(db, 'inspections', { garden_id: gardenId['Kagando Batian'], inspection_date: '2026-09-02', inspection_type: 'New variety visit', inspector: 'Peter Mumbere', result: 'Advisory', notes: 'Establishment is even. Farmer asked for a second seedling issue next season.' })

    insert(db, 'services', { farmer_id: farmerId['F-008'], service_date: '2026-09-12', service: 'Pruning support', staff_name: 'Peter Mumbere', notes: 'Demonstration done with the household because Joyce has low vision.' })
    insert(db, 'services', { farmer_id: farmerId['F-017'], service_date: '2026-10-08', service: 'New variety sensitisation', staff_name: 'Joseph Kule', notes: 'Batian seedlings explained, including the recovery from harvest proceeds.' })
    insert(db, 'services', { farmer_id: farmerId['F-018'], service_date: '2026-11-16', service: 'Drying and storage', staff_name: 'Peter Mumbere', notes: 'Maize drying checked before milling.' })

    const centres = [
      ['Kasese Central Store', 'Bugoye', 'Kitsutsu', 0.1838, 30.089, 1575],
      ['Kyarumba Collection Point', 'Kyarumba', 'Kyarumba', 0.214, 29.986, 1710],
      ['Maliba Shed', 'Maliba', 'Maliba', 0.2502, 30.0204, 1675],
      ['Kyondo Highland Store', 'Kyondo', 'Kyondo', 0.1415, 29.9502, 1820],
    ] as const
    const centreId: Record<string, number> = {}
    for (const [name, subcounty, village, lat, lng, alt] of centres) {
      centreId[name] = insert(db, 'bulking_centres', {
        name, district: 'Kasese', subcounty, village, latitude: lat, longitude: lng, altitude_m: alt,
      }).id
    }

    const varietyRows = [
      ['SL28', 'Arabica coffee', '2008-01-01', 'Traditional selection for cup quality at Rwenzori altitudes.'],
      ['SL14', 'Arabica coffee', '2008-01-01', 'Drought-tolerant selection already common in Kasese.'],
      ['Batian', 'Arabica coffee', '2024-03-01', 'Introduced to members in 2024. Resistant to coffee berry disease and leaf rust.'],
      ['Ruiru 11', 'Arabica coffee', '2022-04-01', 'Compact hybrid for smaller plots.'],
      ['Longe 5', 'Maize', '2020-02-01', 'Open-pollinated maize kept for household food and local sale.'],
    ] as const
    for (const [name, produce, introduced, notes] of varietyRows) {
      insert(db, 'varieties', { name, produce, introduced_on: introduced, notes })
    }

    const prices = [
      ['Arabica coffee', 'A', 3200, 200],
      ['Arabica coffee', 'B', 2600, 0],
      ['Arabica coffee', 'C', 1800, 0],
      ['Maize', 'A', 1200, 0],
    ] as const
    for (const [produce, grade, unit, premium] of prices) {
      insert(db, 'price_schedules', { produce, grade, unit_price: unit, default_premium: premium, effective_from: '2026-07-01' })
    }

    insert(db, 'input_items', { sku: 'SEED-BAT', name: 'Batian seedlings', category: 'seed', variety: 'Batian', unit: 'seedling', qty_on_hand: 2000, unit_cost: 1000, introduced_on: '2024-03-01', notes: 'New variety issued as a recoverable input.' })
    insert(db, 'input_items', { sku: 'FER-NPK', name: 'NPK 17-17-17', category: 'fertiliser', unit: 'bag', qty_on_hand: 50, unit_cost: 30000, notes: '50 kg bags.' })
    insert(db, 'input_items', { sku: 'TARP', name: 'Tarpaulin 5m', category: 'equipment', unit: 'piece', qty_on_hand: 20, unit_cost: 25000, notes: 'Drying equipment. Issued on loan or as support.' })

    const msc = insert(db, 'funders', { name: 'Microfinance Support Centre', kind: 'Lender', contact_name: 'Portfolio officer', phone: '256414000111', notes: 'Working capital facility for the cooperative.' }).id
    const sacco = insert(db, 'funders', { name: 'Rwenzori SACCO', kind: 'Financial service provider', contact_name: 'Credit officer', phone: '256700222333' }).id
    const pool = insert(db, 'funders', { name: 'Cooperative internal pool', kind: 'Own funds', contact_name: 'Grace Biira', phone: '256700410220' }).id

    const products = [
      ['Harvest Advance', pool, 'member', 12, 4, 2_000_000, 'Short advance for smallholder members, recovered from deliveries.'],
      ['Input Credit', sacco, 'member', 18, 6, 3_000_000, 'On-lent input finance from Rwenzori SACCO.'],
      ['Coop input loan', pool, 'input', 0, 8, 1_000_000, 'Seedlings, fertiliser, equipment, or cash recovered after harvest. No interest; the return is the produce relationship.'],
      ['MSC asset loan', msc, 'member', 16, 12, 5_000_000, 'Longer smallholder loan sourced from the Microfinance Support Centre.'],
    ] as const
    const productId: Record<string, number> = {}
    for (const [name, funder, book, rate, term, max, notes] of products) {
      productId[name] = insert(db, 'loan_products', {
        name, funder_id: funder, book, interest_rate: rate, term_months: term, max_amount: max, target: 'SHF', notes,
      }).id
    }

    postJournal(db, {
      date: '2026-06-30',
      reference: 'OB-2026',
      memo: 'Opening balances at 30 June 2026',
      source: 'opening',
      cashflow: 'opening',
      userId: financeUser,
      lines: [
        { account: '1000', debit: 12_000_000 },
        { account: '1010', debit: 6_000_000 },
        { account: '1020', debit: 42_000_000 },
        { account: '1100', debit: 15_000_000 },
        { account: '1200', debit: 6_000_000 },
        { account: '1300', debit: 2_000_000 },
        { account: '1400', debit: 4_000_000 },
        { account: '2000', credit: 4_000_000 },
        { account: '2100', credit: 25_000_000 },
        { account: '3000', credit: 40_000_000 },
        { account: '3100', credit: 18_000_000 },
      ],
    })

    insert(db, 'batches', {
      batch_code: 'BT-OPEN',
      trace_code: 'RHC-OPEN-PARCH',
      produce: 'Arabica coffee',
      state: 'parchment',
      qty: 5000,
      total_cost: 15_000_000,
      location: 'Kasese Central Store',
      received_on: '2026-06-30',
      component_traces: JSON.stringify(['RHC-OPEN-PARCH']),
      notes: 'Prior-season parchment on hand at 1 July 2026. Not tied to a current receipt.',
    })

    const openingLoans = [
      ['LN-2026-001', 'Input Credit', 'F-001', 2_000_000, '2026-03-10', '2026-12-15', 'Fertiliser on-lent from Rwenzori SACCO.'],
      ['LN-2026-002', 'Input Credit', 'F-005', 1_500_000, '2026-04-02', '2026-12-20', 'Input credit carried into the year.'],
      ['LN-2026-003', 'Harvest Advance', 'F-010', 1_500_000, '2026-05-06', '2026-11-30', 'Advance against the main harvest.'],
      ['LN-2026-004', 'MSC asset loan', 'F-015', 1_000_000, '2026-02-18', '2027-02-18', 'Drying equipment at household level.'],
      ['LN-2026-005', 'Coop input loan', 'F-002', 1_200_000, '2026-03-20', '2026-12-31', 'Batian seedlings issued before July. Stock was already net of this issue.'],
      ['LN-2026-006', 'Coop input loan', 'F-003', 800_000, '2026-03-22', '2026-12-31', 'NPK issued in March 2026.'],
    ] as const
    for (const [code, product, farmer, principal, disbursed, due, purpose] of openingLoans) {
      const book = product === 'Coop input loan' ? 'input' : 'member'
      insert(db, 'loans', {
        code,
        product_id: productId[product],
        farmer_id: farmerId[farmer],
        book,
        principal,
        outstanding: principal,
        interest_rate: book === 'input' ? 0 : product === 'Harvest Advance' ? 12 : product === 'MSC asset loan' ? 16 : 18,
        disbursed_on: disbursed,
        due_on: due,
        purpose,
        is_opening: 1,
        recorded_by: financeUser,
      })
    }

    const facilityId = insert(db, 'facilities', {
      code: 'FAC-MSC-01',
      funder_id: msc,
      name: 'Working capital facility',
      principal: 25_000_000,
      outstanding: 25_000_000,
      interest_rate: 11,
      disbursed_on: '2025-09-01',
      due_on: '2028-09-01',
      purpose: 'Cherry buying and store operations',
      is_opening: 1,
    }).id

    const youth = insert(db, 'councils', { name: 'Youth Council', kind: 'youth', formed_on: '2024-02-14', notes: 'Meets on the first Saturday of each month at Maliba Shed.' }).id
    const women = insert(db, 'councils', { name: 'Women Council', kind: 'women', formed_on: '2023-03-08', notes: 'Meets monthly at Kyarumba Collection Point. Keeps its own attendance book as well as this register.' }).id
    const council = (councilId: number, code: string, role: string, started: string) => {
      const farmer = get<any>(db, 'select * from farmers where id = ?', farmerId[code])
      insert(db, 'council_members', {
        council_id: councilId,
        farmer_id: farmer.id,
        member_name: `${farmer.first_name} ${farmer.last_name}`,
        role,
        gender: farmer.gender,
        phone: farmer.phone,
        dob: farmer.dob,
        started_on: started,
      })
    }
    council(youth, 'F-010', 'Chairperson', '2024-02-14')
    council(youth, 'F-014', 'Secretary', '2024-02-14')
    council(youth, 'F-011', 'Treasurer', '2025-02-01')
    council(youth, 'F-013', 'Member', '2024-02-14')
    council(youth, 'F-017', 'Member', '2025-06-01')
    council(women, 'F-005', 'Chairperson', '2023-03-08')
    council(women, 'F-008', 'Secretary', '2023-03-08')
    council(women, 'F-002', 'Treasurer', '2024-03-08')
    council(women, 'F-006', 'Member', '2023-03-08')
    council(women, 'F-016', 'Member', '2025-03-08')

    saveTraining(db, {
      date: '2026-09-12', audience: 'farmer', topic: 'Coffee pruning and canopy management',
      trainers: 'Peter Mumbere; Joseph Kule', location: 'Kyarumba Collection Point', language: 'English, with Lhukonzo interpretation',
      summary: 'Pruning, stumping, and tool safety ahead of the main harvest.',
      notes: 'Notes were read aloud so Joyce Kule could follow.',
      farmerIds: ['F-001', 'F-005', 'F-008', 'F-010', 'F-015', 'F-017'].map((code) => farmerId[code]),
      staffIds: [],
      reps: [{ name: 'Kabugho Yohana', phone: '256770111222', gender: 'Male', dob: '1988-02-02' }],
      userId: fieldUser,
    })
    saveTraining(db, {
      date: '2026-10-05', audience: 'farmer', topic: 'Harvest hygiene, grades, and trace codes',
      trainers: 'Amina Nyangoma; Peter Mumbere', location: 'Kasese Central Store', language: 'English',
      summary: 'How ripe cherry is graded and how the receipt trace code follows the lot through bulking.',
      farmerIds: ['F-002', 'F-003', 'F-006', 'F-011', 'F-014', 'F-016', 'F-018', 'F-013'].map((code) => farmerId[code]),
      staffIds: [], reps: [], userId: fieldUser,
    })
    saveTraining(db, {
      date: '2026-11-03', audience: 'staff', topic: 'Receipting, quality payment, and SMS consent',
      trainers: 'Grace Biira', location: 'Cooperative office', language: 'English',
      summary: 'Posting a delivery, when the quality premium applies, and when a message may be recorded.',
      farmerIds: [], staffIds: [peter, joseph, davidStaff, ruthStaff], reps: [], userId: financeUser,
    })

    for (const period of ['2026-07', '2026-08', '2026-09', '2026-10']) {
      const paidOn = period === '2026-07' ? '2026-07-31' : period === '2026-08' ? '2026-08-31' : period === '2026-09' ? '2026-09-30' : '2026-10-31'
      runPayroll(db, { period, paidOn, userId: financeUser })
    }

    repayFacility(db, { facilityId, date: '2026-08-15', principal: 1_500_000, interest: 400_000, mode: 'bank', userId: financeUser })
    disburseLoan(db, {
      productId: productId['Harvest Advance'], farmerId: farmerId['F-014'], principal: 500_000,
      date: '2026-09-05', due: '2027-01-05', purpose: 'School-fees advance against the harvest.', payFrom: 'mobile_money', userId: financeUser,
    })
    const peterLoan = get<any>(db, "select id from loans where code = 'LN-2026-003'")
    repayLoan(db, { loanId: peterLoan.id, date: '2026-09-10', principal: 400_000, interest: 40_000, mode: 'mobile_money', userId: financeUser })

    issueInput(db, {
      date: '2026-10-08', farmerId: farmerId['F-017'], itemId: get<any>(db, "select id from input_items where sku = 'SEED-BAT'").id,
      issueType: 'loan', qty: 80, due: '2027-06-30', notes: 'Batian seedlings for the west plot.', userId: fieldUser,
    })
    issueInput(db, {
      date: '2026-10-12', farmerId: farmerId['F-001'], issueType: 'cash', amount: 200_000, payFrom: 'cash',
      due: '2027-01-31', notes: 'Cash advance for harvest labour.', userId: financeUser,
    })

    const plans = [
      ['RHC-26-00001', '2026-10-18', 'F-001', 'Kitsutsu Ridge', 'Kasese Central Store', 'Arabica coffee', 'A', 220, 1, 'English'],
      ['RHC-26-00002', '2026-10-19', 'F-002', 'Ibanda Lower', 'Kasese Central Store', 'Arabica coffee', 'A', 180, 0, 'English'],
      ['RHC-26-00003', '2026-10-22', 'F-003', 'Kitsutsu Valley', 'Kasese Central Store', 'Arabica coffee', 'B', 350, 0, 'Kiswahili'],
      ['RHC-26-00004', '2026-10-25', 'F-005', 'Kyarumba Home', 'Kyarumba Collection Point', 'Arabica coffee', 'A', 150, 0, 'English'],
      ['RHC-26-00005', '2026-10-26', 'F-006', 'Kyabikere', 'Kyarumba Collection Point', 'Arabica coffee', 'C', 90, 0, 'English'],
      ['RHC-26-00006', '2026-10-27', 'F-008', 'Kyarumba East', 'Kyarumba Collection Point', 'Arabica coffee', 'B', 260, 0, 'English'],
      ['RHC-26-00007', '2026-10-28', 'F-010', 'Upper Ridge', 'Maliba Shed', 'Arabica coffee', 'A', 200, 1, 'English'],
      ['RHC-26-00008', '2026-11-02', 'F-011', 'Maliba Slope', 'Maliba Shed', 'Arabica coffee', 'B', 120, 0, 'English'],
      ['RHC-26-00009', '2026-11-04', 'F-014', 'Kahokya', 'Maliba Shed', 'Arabica coffee', 'A', 160, 0, 'English'],
      ['RHC-26-00010', '2026-11-08', 'F-015', 'Kyondo Peak', 'Kyondo Highland Store', 'Arabica coffee', 'A', 400, 0, 'English'],
      ['RHC-26-00011', '2026-11-10', 'F-016', 'Kisinga', 'Kyondo Highland Store', 'Arabica coffee', 'C', 140, 0, 'English'],
      ['RHC-26-00012', '2026-11-15', 'F-017', 'Kyondo West', 'Kyondo Highland Store', 'Arabica coffee', 'B', 300, 0, 'English'],
      ['RHC-26-00013', '2026-11-16', 'F-018', 'Kyondo Maize', 'Kyondo Highland Store', 'Maize', 'A', 500, 1, 'English'],
    ] as const
    const made: Record<string, { id: number; gross: number; batchId: number }> = {}
    for (const [trace, date, code, garden, centre, produce, grade, volume, notify, language] of plans) {
      made[trace] = recordCollection(db, {
        date, farmerId: farmerId[code], gardenId: gardenId[garden], centreId: centreId[centre],
        produce, grade, volume, moisture: grade === 'A' ? 11.5 : 13, defects: grade === 'C' ? 8 : 2,
        notify: Boolean(notify), language, traceCode: trace, userId: fieldUser,
        notes: trace === 'RHC-26-00007' ? 'Fully ripe cherry. Kept as its own lot for the roasting trial.' : null,
      })
    }

    const pay = (trace: string, date: string, amount: number | 'full', mode: string, notify = false, language = 'English') => {
      recordPayment(db, {
        date, farmerId: get<any>(db, 'select farmer_id as id from collections where id = ?', made[trace].id).id,
        appliedTo: 'collection', collectionId: made[trace].id,
        mode, amount: amount === 'full' ? made[trace].gross : amount,
        notify, language, userId: financeUser,
      })
    }
    pay('RHC-26-00001', '2026-10-20', 'full', 'mobile_money', true)
    pay('RHC-26-00002', '2026-10-21', 'full', 'mobile_money')
    pay('RHC-26-00003', '2026-10-24', 500_000, 'mobile_money', true, 'Kiswahili')
    pay('RHC-26-00005', '2026-10-27', 'full', 'cash')
    pay('RHC-26-00009', '2026-11-06', 'full', 'mobile_money')
    pay('RHC-26-00010', '2026-11-14', 800_000, 'bank')

    const parchment = convertStock(db, {
      date: '2026-11-05', process: 'Pulping and drying', outputState: 'parchment', location: 'Kasese processing room',
      outputQty: 40, inputs: [{ batchId: made['RHC-26-00007'].batchId, qty: 200 }], outputTrace: 'RHC-26-P007',
      notes: 'Single-farmer lot from Upper Ridge.', userId: fieldUser,
    })
    const green = convertStock(db, {
      date: '2026-11-07', process: 'Hulling', outputState: 'green', location: 'Kasese processing room',
      outputQty: 32, inputs: [{ batchId: parchment.batchId, qty: 40 }], outputTrace: 'RHC-26-G007', userId: fieldUser,
    })
    const roasted = convertStock(db, {
      date: '2026-11-12', process: 'Roasting', outputState: 'roasted', location: 'Kasese processing room',
      outputQty: 27, inputs: [{ batchId: green.batchId, qty: 32 }], processCost: 150_000, payFrom: 'cash',
      outputTrace: 'RHC-26-R007', notes: 'Value addition trial for the local roastery.', userId: fieldUser,
    })
    recordSale(db, {
      date: '2026-11-12', buyerName: 'Kasese Coffee Bar', buyerContact: '256700555010', buyerType: 'Local roastery',
      batchId: roasted.batchId, qty: 27, unitPrice: 55_000, mode: 'cash', farmerId: farmerId['F-010'],
      notes: 'Individual-farmer lot, sold after roasting. The member payable is settled separately.', userId: financeUser,
    })
    const opening = get<any>(db, "select id from batches where trace_code = 'RHC-OPEN-PARCH'")
    recordSale(db, {
      date: '2026-11-18', buyerName: 'Mountain Trade Co. Ltd', buyerContact: '256700111000', buyerType: 'Exporter',
      batchId: opening.id, qty: 1200, unitPrice: 8500, mode: 'bank',
      notes: 'Prior-season parchment. Contract MT-118.', userId: financeUser,
    })
    convertStock(db, {
      date: '2026-11-18', process: 'Milling', outputState: 'flour', location: 'Kyondo Highland Store',
      outputQty: 430, inputs: [{ batchId: made['RHC-26-00013'].batchId, qty: 500 }], outputTrace: 'RHC-26-F013',
      notes: 'Maize value chain, kept separate from coffee.', userId: fieldUser,
    })
    convertStock(db, {
      date: '2026-11-20', process: 'Pulping and drying', outputState: 'parchment', location: 'Kasese processing room',
      outputQty: 80,
      inputs: [
        { batchId: made['RHC-26-00001'].batchId, qty: 220 },
        { batchId: made['RHC-26-00002'].batchId, qty: 180 },
      ],
      outputTrace: 'RHC-26-B001',
      notes: 'Bulked lot. Parent receipts stay attached to the output batch.', userId: fieldUser,
    })
    recordSale(db, {
      date: '2026-11-21', buyerName: 'Kasese Town Market', buyerContact: '256700444222', buyerType: 'Local market',
      batchId: made['RHC-26-00011'].batchId, qty: 140, unitPrice: 2200, mode: 'cash', farmerId: farmerId['F-016'],
      notes: 'Individual farmer sale of grade C cherry. Member payment is still open.', userId: financeUser,
    })

    const maliba = ['F-010', 'F-011', 'F-012', 'F-013', 'F-014'].map((code) => farmerId[code])
    logMessage(db, {
      userId: fieldUser,
      language: 'English',
      channel: 'sms',
      subject: 'Cherry price this week',
      body: 'Grade A ripe cherry is UGX 3,200 per kg plus a UGX 200 premium at all Rwenzori Highland stores this week. Bring your membership number.',
      audience: 'Maliba Youth',
      eventType: 'advisory',
      farmerIds: maliba,
      createdAt: '2026-11-01T08:00:00.000Z',
    })

    run(db, "insert into sequences(name, value) values('farmer', 18) on conflict(name) do update set value = 18")
    run(db, "insert into sequences(name, value) values('trace', 13) on conflict(name) do update set value = 13")
    run(db, "insert into sequences(name, value) values('share', 18) on conflict(name) do update set value = 18")

    const sharePaid = Number(get<any>(db, 'select coalesce(sum(amount_paid),0) as s from shares').s)
    if (sharePaid !== 40_000_000 || accountBalance(db, '3000') !== 40_000_000) {
      throw new Error(`Share capital does not match the register (${sharePaid}).`)
    }
    const problems = booksAreSound(db)
    if (problems.length) throw new Error(problems.join('; '))
  })
}

function staff(
  employeeNo: string, first: string, last: string, gender: string, dob: string, position: string, department: string,
  reportsTo: number | null, hire: string, contract: string, basic: number, allowances: number, pwd: number, pwdNotes: string | null,
) {
  return {
    employee_no: employeeNo, first_name: first, last_name: last, gender, dob,
    national_id: `CF${employeeNo.replace('-', '')}`,
    phone: phone(Number(employeeNo.slice(-3))),
    email: `${first.toLowerCase()}@rwenzori.coop`,
    next_of_kin: `${last} household`,
    next_of_kin_phone: phone(80 + Number(employeeNo.slice(-1))),
    district: 'Kasese', subcounty: 'Bugoye', village: 'Kitsutsu',
    address: 'Cooperative office, Kitsutsu',
    position, department, reports_to: reportsTo, hire_date: hire, contract_type: contract, status: 'active',
    basic_salary: basic, allowances, pwd, pwd_notes: pwdNotes,
  }
}

function user(name: string, email: string, password: string, role: string, staffId: number | null) {
  return {
    name, email, password_hash: hashPassword(password), role, staff_id: staffId, active: 1,
    created_at: '2026-07-01T08:00:00.000Z',
  }
}
