'use server'

import { redirect } from 'next/navigation'
import { clearSession, getSession, requireUser, setSession } from './auth'
import { parseCsv } from './csv'
import { friendly, isRedirect } from './errors'
import { postJournal } from './finance'
import { dateField, flag, intId, num, optionalDate, parseIdList, str } from './form'
import { verifyPassword } from './password'
import { hashPassword } from './password'
import { canWrite } from './rbac'
import { getDb } from './db'
import { audit, get, insert, nextSeq, update } from './sql'
import {
  convertStock,
  createShare,
  disburseLoan,
  importFarmers,
  issueInput,
  logMessage,
  receiveSale,
  recordCollection,
  recordPayment,
  recordSale,
  repayFacility,
  repayLoan,
  runPayroll,
  saveTraining,
} from './workflows'

function fail(path: string, error: unknown): never {
  if (isRedirect(error)) throw error
  redirect(`${path}${path.includes('?') ? '&' : '?'}error=${encodeURIComponent(friendly(error))}`)
}

function done(path: string, message: string): never {
  redirect(`${path}${path.includes('?') ? '&' : '?'}ok=${encodeURIComponent(message)}`)
}

function deny(path: string): never {
  redirect(`${path}?error=${encodeURIComponent('Your role cannot change that record.')}`)
}

export async function login(fd: FormData) {
  const email = str(fd, 'email').toLowerCase()
  const password = String(fd.get('password') || '')
  const user = get<any>(getDb(), 'select * from users where lower(email) = ? and active = 1', email)
  if (!user || !verifyPassword(password, user.password_hash)) {
    redirect('/?error=' + encodeURIComponent('Those details do not match an active account.'))
  }
  await setSession(user.id)
  audit(getDb(), user.id, 'login', 'user', user.id)
  redirect('/dashboard')
}

export async function logout() {
  const user = await getSession()
  if (user) audit(getDb(), user.id, 'logout', 'user', user.id)
  await clearSession()
  redirect('/')
}

export async function saveStaff(fd: FormData) {
  const user = await requireUser()
  const id = intId(fd, 'id')
  const path = id ? `/staff/${id}` : '/staff'
  if (!canWrite(user.role, 'staff')) deny(path)
  try {
    const data = {
      employee_no: str(fd, 'employee_no') || `E-${String(nextSeq(getDb(), 'staff')).padStart(3, '0')}`,
      first_name: str(fd, 'first_name'),
      last_name: str(fd, 'last_name'),
      gender: str(fd, 'gender') || null,
      dob: optionalDate(fd, 'dob'),
      national_id: str(fd, 'national_id') || null,
      phone: str(fd, 'phone') || null,
      email: str(fd, 'email') || null,
      next_of_kin: str(fd, 'next_of_kin') || null,
      next_of_kin_phone: str(fd, 'next_of_kin_phone') || null,
      district: str(fd, 'district') || null,
      subcounty: str(fd, 'subcounty') || null,
      village: str(fd, 'village') || null,
      address: str(fd, 'address') || null,
      position: str(fd, 'position') || null,
      department: str(fd, 'department') || null,
      reports_to: intId(fd, 'reports_to'),
      hire_date: optionalDate(fd, 'hire_date'),
      contract_type: str(fd, 'contract_type') || null,
      status: str(fd, 'status') || 'active',
      basic_salary: num(fd, 'basic_salary'),
      allowances: num(fd, 'allowances'),
      pwd: flag(fd, 'pwd'),
      pwd_notes: str(fd, 'pwd_notes') || null,
      notes: str(fd, 'notes') || null,
    }
    if (!data.first_name || !data.last_name) throw new Error('Enter the staff name.')
    const db = getDb()
    const saved = id ? (update(db, 'staff', id, data), id) : insert(db, 'staff', data).id
    audit(db, user.id, id ? 'update' : 'create', 'staff', saved)
    done(`/staff/${saved}`, 'Staff record saved.')
  } catch (error) {
    fail(path, error)
  }
}

export async function saveFarmer(fd: FormData) {
  const user = await requireUser()
  const id = intId(fd, 'id')
  const path = id ? `/farmers/${id}` : '/farmers'
  if (!canWrite(user.role, 'farmers')) deny(path)
  try {
    const data: Record<string, unknown> = {
      first_name: str(fd, 'first_name'),
      last_name: str(fd, 'last_name'),
      gender: str(fd, 'gender') || null,
      dob: optionalDate(fd, 'dob'),
      national_id: str(fd, 'national_id') || null,
      phone: str(fd, 'phone') || null,
      alt_phone: str(fd, 'alt_phone') || null,
      group_id: intId(fd, 'group_id'),
      district: str(fd, 'district') || null,
      subcounty: str(fd, 'subcounty') || null,
      parish: str(fd, 'parish') || null,
      village: str(fd, 'village') || null,
      membership_date: optionalDate(fd, 'membership_date'),
      status: str(fd, 'status') || 'active',
      household_size: str(fd, 'household_size') ? num(fd, 'household_size') : null,
      education: str(fd, 'education') || null,
      marital_status: str(fd, 'marital_status') || null,
      pwd: flag(fd, 'pwd'),
      pwd_notes: str(fd, 'pwd_notes') || null,
      main_enterprise: str(fd, 'main_enterprise') || null,
      consent_store: flag(fd, 'consent_store'),
      consent_sms: flag(fd, 'consent_sms'),
      notes: str(fd, 'notes') || null,
    }
    if (!data.first_name || !data.last_name) throw new Error('Enter the member name.')
    const db = getDb()
    let saved = id
    if (id) update(db, 'farmers', id, data)
    else {
      saved = insert(db, 'farmers', {
        ...data,
        farmer_code: str(fd, 'farmer_code') || `F-${String(nextSeq(db, 'farmer')).padStart(4, '0')}`,
        added_by: user.id,
        recorded_by_name: user.name,
      }).id
    }
    audit(db, user.id, id ? 'update' : 'create', 'farmer', saved)
    done(`/farmers/${saved}`, 'Member record saved.')
  } catch (error) {
    fail(path, error)
  }
}

export async function saveGroup(fd: FormData) {
  const user = await requireUser()
  if (!canWrite(user.role, 'groups')) deny('/groups')
  try {
    const id = intId(fd, 'id')
    const data = {
      code: str(fd, 'code').toUpperCase(),
      name: str(fd, 'name'),
      district: str(fd, 'district') || null,
      subcounty: str(fd, 'subcounty') || null,
      village: str(fd, 'village') || null,
      leader_name: str(fd, 'leader_name') || null,
      phone: str(fd, 'phone') || null,
      formed_on: optionalDate(fd, 'formed_on'),
      notes: str(fd, 'notes') || null,
    }
    if (!data.code || !data.name) throw new Error('Enter the group code and name.')
    const db = getDb()
    const saved = id ? (update(db, 'groups', id, data), id) : insert(db, 'groups', data).id
    audit(db, user.id, id ? 'update' : 'create', 'group', saved)
    done('/groups', 'Group saved.')
  } catch (error) {
    fail('/groups', error)
  }
}

export async function saveGarden(fd: FormData) {
  const user = await requireUser()
  const id = intId(fd, 'id')
  const path = id ? `/gardens/${id}` : '/gardens'
  if (!canWrite(user.role, 'gardens')) deny(path)
  try {
    const latitude = str(fd, 'latitude') ? num(fd, 'latitude') : null
    const longitude = str(fd, 'longitude') ? num(fd, 'longitude') : null
    if ((latitude == null) !== (longitude == null)) throw new Error('Enter both latitude and longitude, or leave both blank.')
    if (latitude != null && (latitude < -90 || latitude > 90 || longitude! < -180 || longitude! > 180)) {
      throw new Error('Those GPS coordinates are out of range.')
    }
    const data = {
      farmer_id: intId(fd, 'farmer_id'),
      name: str(fd, 'name'),
      size_ha: str(fd, 'size_ha') ? num(fd, 'size_ha') : null,
      district: str(fd, 'district') || null,
      subcounty: str(fd, 'subcounty') || null,
      parish: str(fd, 'parish') || null,
      village: str(fd, 'village') || null,
      latitude,
      longitude,
      altitude_m: str(fd, 'altitude_m') ? num(fd, 'altitude_m') : null,
      produce: str(fd, 'produce') || null,
      variety: str(fd, 'variety') || null,
      planting_date: optionalDate(fd, 'planting_date'),
      spacing: str(fd, 'spacing') || null,
      plant_population: str(fd, 'plant_population') ? num(fd, 'plant_population') : null,
      field_age_years: str(fd, 'field_age_years') ? num(fd, 'field_age_years') : null,
      expected_harvest: optionalDate(fd, 'expected_harvest'),
      expected_yield_kg: str(fd, 'expected_yield_kg') ? num(fd, 'expected_yield_kg') : null,
      soil_type: str(fd, 'soil_type') || null,
      shade: str(fd, 'shade') || null,
      irrigation: str(fd, 'irrigation') || null,
      notes: str(fd, 'notes') || null,
    }
    if (!data.farmer_id || !data.name) throw new Error('Choose the member and name the garden.')
    const db = getDb()
    const saved = id ? (update(db, 'gardens', id, data), id) : insert(db, 'gardens', data).id
    audit(db, user.id, id ? 'update' : 'create', 'garden', saved)
    done(`/gardens/${saved}`, 'Garden saved.')
  } catch (error) {
    fail(path, error)
  }
}

export async function addInspection(fd: FormData) {
  const user = await requireUser()
  const gardenId = intId(fd, 'garden_id')
  const path = gardenId ? `/gardens/${gardenId}` : '/gardens'
  if (!canWrite(user.role, 'inspections')) deny(path)
  try {
    if (!gardenId) throw new Error('Choose a garden.')
    if (!str(fd, 'inspection_type')) throw new Error('Enter the inspection type.')
    const id = insert(getDb(), 'inspections', {
      garden_id: gardenId,
      inspection_date: dateField(fd, 'inspection_date'),
      inspection_type: str(fd, 'inspection_type'),
      inspector: str(fd, 'inspector') || null,
      result: str(fd, 'result') || null,
      certificate_no: str(fd, 'certificate_no') || null,
      notes: str(fd, 'notes') || null,
    }).id
    audit(getDb(), user.id, 'create', 'inspection', id)
    done(path, 'Inspection recorded.')
  } catch (error) {
    fail(path, error)
  }
}

export async function addService(fd: FormData) {
  const user = await requireUser()
  const farmerId = intId(fd, 'farmer_id')
  const path = farmerId ? `/farmers/${farmerId}` : '/farmers'
  if (!canWrite(user.role, 'services')) deny(path)
  try {
    if (!farmerId || !str(fd, 'service')) throw new Error('Describe the service.')
    const id = insert(getDb(), 'services', {
      farmer_id: farmerId,
      service_date: dateField(fd, 'service_date'),
      service: str(fd, 'service'),
      staff_name: str(fd, 'staff_name') || user.name,
      notes: str(fd, 'notes') || null,
    }).id
    audit(getDb(), user.id, 'create', 'service', id)
    done(path, 'Service recorded.')
  } catch (error) {
    fail(path, error)
  }
}

export async function saveShare(fd: FormData) {
  const user = await requireUser()
  if (!canWrite(user.role, 'shares')) deny('/shares')
  try {
    const farmerId = intId(fd, 'farmer_id')
    if (!farmerId) throw new Error('Choose a member.')
    createShare(getDb(), {
      farmerId,
      certificateNo: str(fd, 'certificate_no') || undefined,
      className: str(fd, 'class_name') || 'Ordinary',
      shareCount: num(fd, 'share_count'),
      nominalValue: num(fd, 'nominal_value'),
      amountPaid: num(fd, 'amount_paid'),
      issuedOn: dateField(fd, 'issued_on'),
      payMode: str(fd, 'pay_mode') || null,
      notes: str(fd, 'notes') || null,
      userId: user.id,
    })
    done('/shares', 'Share certificate recorded and the cash posted to share capital.')
  } catch (error) {
    fail('/shares', error)
  }
}

export async function saveTrainingAction(fd: FormData) {
  const user = await requireUser()
  if (!canWrite(user.role, 'training')) deny('/training')
  try {
    let reps: { name: string; phone?: string; gender?: string; dob?: string }[] = []
    try {
      const parsed = JSON.parse(str(fd, 'reps') || '[]')
      if (Array.isArray(parsed)) reps = parsed
    } catch {
      reps = []
    }
    const result = saveTraining(getDb(), {
      date: dateField(fd, 'training_date'),
      audience: str(fd, 'audience') === 'staff' ? 'staff' : 'farmer',
      topic: str(fd, 'topic'),
      trainers: str(fd, 'trainers'),
      summary: str(fd, 'summary'),
      location: str(fd, 'location'),
      language: str(fd, 'language'),
      notes: str(fd, 'notes'),
      farmerIds: parseIdList(str(fd, 'farmers')),
      staffIds: parseIdList(str(fd, 'staff')),
      reps,
      userId: user.id,
    })
    done(`/training/${result.id}`, 'Training register saved.')
  } catch (error) {
    fail('/training', error)
  }
}

export async function saveCouncil(fd: FormData) {
  const user = await requireUser()
  if (!canWrite(user.role, 'councils')) deny('/councils')
  try {
    if (!str(fd, 'name')) throw new Error('Name the council.')
    const id = insert(getDb(), 'councils', {
      name: str(fd, 'name'),
      kind: str(fd, 'kind') || 'women',
      formed_on: optionalDate(fd, 'formed_on'),
      notes: str(fd, 'notes') || null,
    }).id
    audit(getDb(), user.id, 'create', 'council', id)
    done('/councils', 'Council saved.')
  } catch (error) {
    fail('/councils', error)
  }
}

export async function addCouncilMember(fd: FormData) {
  const user = await requireUser()
  if (!canWrite(user.role, 'councils')) deny('/councils')
  try {
    const councilId = intId(fd, 'council_id')
    const farmerId = intId(fd, 'farmer_id')
    if (!councilId || !str(fd, 'role')) throw new Error('Choose the council and a role.')
    const farmer = farmerId ? get<any>(getDb(), 'select * from farmers where id = ?', farmerId) : null
    if (!farmer && !str(fd, 'member_name')) throw new Error('Enter the member name or choose a farmer.')
    const id = insert(getDb(), 'council_members', {
      council_id: councilId,
      farmer_id: farmer?.id || null,
      member_name: farmer ? `${farmer.first_name} ${farmer.last_name}` : str(fd, 'member_name'),
      role: str(fd, 'role'),
      gender: farmer?.gender || str(fd, 'gender') || null,
      phone: farmer?.phone || str(fd, 'phone') || null,
      dob: farmer?.dob || optionalDate(fd, 'dob'),
      started_on: optionalDate(fd, 'started_on'),
      notes: str(fd, 'notes') || null,
    }).id
    audit(getDb(), user.id, 'create', 'council_member', id)
    done('/councils', 'Council member added.')
  } catch (error) {
    fail('/councils', error)
  }
}

export async function recordCollectionAction(fd: FormData) {
  const user = await requireUser()
  if (!canWrite(user.role, 'collections')) deny('/collections')
  try {
    const farmerId = intId(fd, 'farmer_id')
    const centreId = intId(fd, 'centre_id')
    if (!farmerId || !centreId) throw new Error('Choose the member and the bulking centre.')
    const result = recordCollection(getDb(), {
      date: dateField(fd, 'collection_date'),
      farmerId,
      gardenId: intId(fd, 'garden_id'),
      centreId,
      produce: str(fd, 'produce'),
      grade: str(fd, 'grade'),
      volume: num(fd, 'volume_kg'),
      moisture: str(fd, 'moisture') ? num(fd, 'moisture') : null,
      defects: str(fd, 'defects_pct') ? num(fd, 'defects_pct') : null,
      premium: str(fd, 'premium') === '' ? null : num(fd, 'premium'),
      notes: str(fd, 'notes') || null,
      notify: flag(fd, 'notify') === 1,
      language: str(fd, 'language') || 'English',
      userId: user.id,
    })
    done('/collections', `Receipt ${result.receipt} saved. Trace ${result.trace}. ${result.notice}`.trim())
  } catch (error) {
    fail('/collections', error)
  }
}

export async function recordPaymentAction(fd: FormData) {
  const user = await requireUser()
  if (!canWrite(user.role, 'payments')) deny('/payments')
  try {
    const farmerId = intId(fd, 'farmer_id')
    if (!farmerId) throw new Error('Choose a member.')
    const applied = str(fd, 'applied_to')
    const result = recordPayment(getDb(), {
      date: dateField(fd, 'payment_date'),
      farmerId,
      appliedTo: applied === 'opening' || applied === 'other' ? applied : 'collection',
      collectionId: intId(fd, 'collection_id'),
      direction: str(fd, 'direction') === 'from_farmer' ? 'from_farmer' : 'to_farmer',
      mode: str(fd, 'mode'),
      amount: num(fd, 'amount'),
      notes: str(fd, 'notes') || null,
      notify: flag(fd, 'notify') === 1,
      language: str(fd, 'language') || 'English',
      userId: user.id,
    })
    done('/payments', `Payment ${result.paymentNo} posted. ${result.notice}`.trim())
  } catch (error) {
    fail('/payments', error)
  }
}

export async function recordSaleAction(fd: FormData) {
  const user = await requireUser()
  if (!canWrite(user.role, 'sales')) deny('/sales')
  try {
    const batchId = intId(fd, 'batch_id')
    if (!batchId) throw new Error('Choose a batch.')
    const result = recordSale(getDb(), {
      date: dateField(fd, 'sale_date'),
      buyerName: str(fd, 'buyer_name'),
      buyerContact: str(fd, 'buyer_contact') || null,
      buyerType: str(fd, 'buyer_type') || null,
      batchId,
      qty: num(fd, 'qty'),
      unitPrice: num(fd, 'unit_price'),
      mode: str(fd, 'mode'),
      farmerId: intId(fd, 'farmer_id'),
      notes: str(fd, 'notes') || null,
      userId: user.id,
    })
    done('/sales', `${result.saleNo} posted for UGX ${result.total.toLocaleString('en-US')}.`)
  } catch (error) {
    fail('/sales', error)
  }
}

export async function receiveSaleAction(fd: FormData) {
  const user = await requireUser()
  if (!canWrite(user.role, 'sales')) deny('/sales')
  try {
    const saleId = intId(fd, 'sale_id')
    if (!saleId) throw new Error('Choose a sale.')
    const result = receiveSale(getDb(), { saleId, date: dateField(fd, 'date'), mode: str(fd, 'mode'), userId: user.id })
    done('/sales', `Receipt ${result.receipt} posted.`)
  } catch (error) {
    fail('/sales', error)
  }
}

export async function convertStockAction(fd: FormData) {
  const user = await requireUser()
  if (!canWrite(user.role, 'stock')) deny('/stock')
  try {
    const batchIds = fd.getAll('batch_id').map(Number)
    const qtys = fd.getAll('qty').map(Number)
    const inputs = batchIds
      .map((batchId, index) => ({ batchId, qty: qtys[index] || 0 }))
      .filter((item) => item.batchId > 0 && item.qty > 0)
    const process = str(fd, 'process') === 'Other' ? str(fd, 'process_custom') : str(fd, 'process')
    const outputState = str(fd, 'output_state') === 'other' ? str(fd, 'state_custom') : str(fd, 'output_state')
    convertStock(getDb(), {
      date: dateField(fd, 'conv_date'),
      process,
      outputState,
      location: str(fd, 'location'),
      outputQty: num(fd, 'output_qty'),
      inputs,
      processCost: num(fd, 'process_cost'),
      payFrom: str(fd, 'pay_from') || 'cash',
      notes: str(fd, 'notes') || null,
      userId: user.id,
    })
    done('/stock', 'Conversion posted. The parent batches stay linked to the output.')
  } catch (error) {
    fail('/stock', error)
  }
}

export async function issueInputAction(fd: FormData) {
  const user = await requireUser()
  if (!canWrite(user.role, 'inputs')) deny('/inputs')
  try {
    const farmerId = intId(fd, 'farmer_id')
    if (!farmerId) throw new Error('Choose a member.')
    const issueType = str(fd, 'issue_type')
    if (!['equipment', 'loan', 'cash', 'grant'].includes(issueType)) throw new Error('Choose how the input is issued.')
    issueInput(getDb(), {
      date: dateField(fd, 'issue_date'),
      farmerId,
      itemId: intId(fd, 'item_id'),
      issueType: issueType as 'equipment' | 'loan' | 'cash' | 'grant',
      qty: str(fd, 'qty') ? num(fd, 'qty') : null,
      amount: str(fd, 'amount') ? num(fd, 'amount') : null,
      payFrom: str(fd, 'pay_from') || 'cash',
      due: optionalDate(fd, 'due_on'),
      notes: str(fd, 'notes') || null,
      userId: user.id,
    })
    done('/inputs', 'Input issue posted.')
  } catch (error) {
    fail('/inputs', error)
  }
}

export async function saveVariety(fd: FormData) {
  const user = await requireUser()
  if (!canWrite(user.role, 'inputs') && !canWrite(user.role, 'prices')) deny('/inputs')
  try {
    if (!str(fd, 'name') || !str(fd, 'produce')) throw new Error('Name the variety and its produce.')
    const id = insert(getDb(), 'varieties', {
      name: str(fd, 'name'),
      produce: str(fd, 'produce'),
      introduced_on: optionalDate(fd, 'introduced_on'),
      notes: str(fd, 'notes') || null,
    }).id
    audit(getDb(), user.id, 'create', 'variety', id)
    done('/inputs', 'Variety added to the catalogue.')
  } catch (error) {
    fail('/inputs', error)
  }
}

export async function savePrice(fd: FormData) {
  const user = await requireUser()
  if (!canWrite(user.role, 'prices') && user.role !== 'admin' && user.role !== 'manager') deny('/settings')
  try {
    if (!str(fd, 'produce') || !str(fd, 'grade')) throw new Error('Enter the produce and grade.')
    insert(getDb(), 'price_schedules', {
      produce: str(fd, 'produce'),
      grade: str(fd, 'grade'),
      unit_price: num(fd, 'unit_price'),
      default_premium: num(fd, 'default_premium'),
      effective_from: dateField(fd, 'effective_from'),
    })
    audit(getDb(), user.id, 'create', 'price', null, { produce: str(fd, 'produce'), grade: str(fd, 'grade') })
    done('/settings', 'Price schedule saved. New deliveries use the latest rate.')
  } catch (error) {
    fail('/settings', error)
  }
}

export async function disburseLoanAction(fd: FormData) {
  const user = await requireUser()
  if (!canWrite(user.role, 'credit')) deny('/credit')
  try {
    const productId = intId(fd, 'product_id')
    const farmerId = intId(fd, 'farmer_id')
    if (!productId || !farmerId) throw new Error('Choose the product and the member.')
    const result = disburseLoan(getDb(), {
      productId,
      farmerId,
      principal: num(fd, 'principal'),
      date: dateField(fd, 'disbursed_on'),
      due: str(fd, 'due_on'),
      purpose: str(fd, 'purpose') || null,
      payFrom: str(fd, 'pay_from'),
      userId: user.id,
    })
    done('/credit', `Loan ${result.code} disbursed.`)
  } catch (error) {
    fail('/credit', error)
  }
}

export async function repayLoanAction(fd: FormData) {
  const user = await requireUser()
  if (!canWrite(user.role, 'credit')) deny('/credit')
  try {
    const loanId = intId(fd, 'loan_id')
    if (!loanId) throw new Error('Choose a loan.')
    const result = repayLoan(getDb(), {
      loanId,
      date: dateField(fd, 'payment_date'),
      principal: num(fd, 'principal'),
      interest: num(fd, 'interest'),
      mode: str(fd, 'mode'),
      userId: user.id,
    })
    done('/credit', `Repayment ${result.reference} posted.`)
  } catch (error) {
    fail('/credit', error)
  }
}

export async function repayFacilityAction(fd: FormData) {
  const user = await requireUser()
  if (!canWrite(user.role, 'credit')) deny('/credit')
  try {
    const facilityId = intId(fd, 'facility_id')
    if (!facilityId) throw new Error('Choose a facility.')
    const result = repayFacility(getDb(), {
      facilityId,
      date: dateField(fd, 'payment_date'),
      principal: num(fd, 'principal'),
      interest: num(fd, 'interest'),
      mode: str(fd, 'mode'),
      userId: user.id,
    })
    done('/credit', `Facility repayment ${result.reference} posted.`)
  } catch (error) {
    fail('/credit', error)
  }
}

export async function saveLoanProduct(fd: FormData) {
  const user = await requireUser()
  if (!canWrite(user.role, 'credit')) deny('/credit')
  try {
    if (!str(fd, 'name')) throw new Error('Name the product.')
    const id = insert(getDb(), 'loan_products', {
      name: str(fd, 'name'),
      funder_id: intId(fd, 'funder_id'),
      book: str(fd, 'book') === 'input' ? 'input' : 'member',
      interest_rate: num(fd, 'interest_rate'),
      term_months: num(fd, 'term_months'),
      max_amount: num(fd, 'max_amount'),
      target: 'SHF',
      notes: str(fd, 'notes') || null,
    }).id
    audit(getDb(), user.id, 'create', 'loan_product', id)
    done('/credit', 'Loan product saved.')
  } catch (error) {
    fail('/credit', error)
  }
}

export async function sendMessageAction(fd: FormData) {
  const user = await requireUser()
  if (!canWrite(user.role, 'messages')) deny('/messages')
  try {
    if (!str(fd, 'subject') || !str(fd, 'body')) throw new Error('Write the subject and the message.')
    const db = getDb()
    const audience = str(fd, 'audience')
    const groupId = intId(fd, 'group_id')
    const farmerId = intId(fd, 'farmer_id')
    let ids: number[] = []
    if (audience === 'farmer' && farmerId) ids = [farmerId]
    else if (audience === 'group' && groupId) {
      ids = (db.prepare('select id from farmers where group_id = ? and status = ?').all(groupId, 'active') as any[]).map((row) => row.id)
    } else {
      ids = (db.prepare("select id from farmers where status = 'active'").all() as any[]).map((row) => row.id)
    }
    const result = logMessage(db, {
      userId: user.id,
      language: str(fd, 'language') || 'English',
      channel: str(fd, 'channel') || 'sms',
      subject: str(fd, 'subject'),
      body: str(fd, 'body'),
      audience,
      eventType: 'advisory',
      farmerIds: ids,
    })
    if (!result.recipients) {
      done('/messages', 'Nothing was recorded. The selected members have not agreed to messages, or have no phone number.')
    }
    done('/messages', `Message recorded for ${result.recipients} member${result.recipients === 1 ? '' : 's'}.${result.skipped ? ` ${result.skipped} skipped for lack of consent.` : ''}`)
  } catch (error) {
    fail('/messages', error)
  }
}

export async function postJournalAction(fd: FormData) {
  const user = await requireUser()
  if (!canWrite(user.role, 'finance')) deny('/finance')
  try {
    const lines = []
    for (let i = 1; i <= 6; i += 1) {
      const account = str(fd, `account_${i}`)
      const debit = num(fd, `debit_${i}`)
      const credit = num(fd, `credit_${i}`)
      if (!account || (!debit && !credit)) continue
      lines.push({ account, debit, credit })
    }
    postJournal(getDb(), {
      date: dateField(fd, 'entry_date'),
      reference: str(fd, 'reference') || null,
      memo: str(fd, 'memo') || null,
      source: 'manual',
      cashflow: str(fd, 'cashflow') || 'operating',
      userId: user.id,
      lines,
    })
    audit(getDb(), user.id, 'create', 'journal', null, { reference: str(fd, 'reference') })
    done('/finance', 'Journal posted.')
  } catch (error) {
    fail('/finance', error)
  }
}

export async function runPayrollAction(fd: FormData) {
  const user = await requireUser()
  if (!canWrite(user.role, 'payroll')) deny('/payroll')
  try {
    const result = runPayroll(getDb(), {
      period: str(fd, 'period'),
      paidOn: dateField(fd, 'paid_on'),
      userId: user.id,
    })
    done('/payroll', `Payroll posted for ${result.count} staff.`)
  } catch (error) {
    fail('/payroll', error)
  }
}

export async function importFarmersAction(fd: FormData) {
  const user = await requireUser()
  if (!canWrite(user.role, 'import')) deny('/import')
  try {
    const file = fd.get('file')
    if (!(file instanceof File) || !file.size) throw new Error('Choose a CSV file.')
    const rows = parseCsv(await file.text())
    const result = importFarmers(getDb(), rows, user.id)
    const errorText = result.errors.slice(0, 5).join(' ')
    done('/import', `Imported ${result.inserted}. Skipped ${result.skipped} existing codes.${errorText ? ' ' + errorText : ''}`)
  } catch (error) {
    fail('/import', error)
  }
}

export async function saveSettings(fd: FormData) {
  const user = await requireUser()
  if (!canWrite(user.role, 'settings')) deny('/settings')
  try {
    update(getDb(), 'settings', 1, {
      name: str(fd, 'name'),
      short_name: str(fd, 'short_name'),
      registration_no: str(fd, 'registration_no') || null,
      district: str(fd, 'district') || null,
      subcounty: str(fd, 'subcounty') || null,
      village: str(fd, 'village') || null,
      phone: str(fd, 'phone') || null,
      email: str(fd, 'email') || null,
      fy_start: dateField(fd, 'fy_start', 'financial year start'),
      season_label: str(fd, 'season_label') || null,
      retention_years: Math.max(1, Math.round(num(fd, 'retention_years') || 7)),
    })
    audit(getDb(), user.id, 'update', 'settings', 1)
    done('/settings', 'Society profile saved.')
  } catch (error) {
    fail('/settings', error)
  }
}

export async function saveUser(fd: FormData) {
  const user = await requireUser()
  if (!canWrite(user.role, 'users')) deny('/users')
  try {
    const password = String(fd.get('password') || '')
    const role = str(fd, 'role')
    if (!['admin', 'manager', 'field', 'finance', 'viewer'].includes(role)) throw new Error('Choose a role.')
    if (password.length < 8) throw new Error('Use a password of at least 8 characters.')
    const email = str(fd, 'email').toLowerCase()
    if (!email.includes('@')) throw new Error('Enter an email address.')
    if (!str(fd, 'name')) throw new Error('Enter the person\'s name.')
    const id = insert(getDb(), 'users', {
      name: str(fd, 'name'),
      email,
      password_hash: hashPassword(password),
      role,
      staff_id: intId(fd, 'staff_id'),
      active: 1,
      created_at: new Date().toISOString(),
    }).id
    audit(getDb(), user.id, 'create', 'user', id, { role })
    done('/users', 'User created.')
  } catch (error) {
    fail('/users', error)
  }
}

export async function setUserActive(fd: FormData) {
  const user = await requireUser()
  if (!canWrite(user.role, 'users')) deny('/users')
  try {
    const id = intId(fd, 'user_id')
    const active = flag(fd, 'active')
    if (!id) throw new Error('Choose a user.')
    if (id === user.id && !active) throw new Error('You cannot deactivate your own account.')
    const target = get<any>(getDb(), 'select * from users where id = ?', id)
    if (!target) throw new Error('User not found.')
    if (target.role === 'admin' && target.active && !active) {
      const admins = get<any>(getDb(), "select count(*) as c from users where role = 'admin' and active = 1")
      if (admins.c <= 1) throw new Error('Keep at least one active administrator.')
    }
    update(getDb(), 'users', id, { active })
    audit(getDb(), user.id, active ? 'activate' : 'deactivate', 'user', id)
    done('/users', active ? 'Account activated.' : 'Account deactivated.')
  } catch (error) {
    fail('/users', error)
  }
}
