import { all, get, type DB } from './sql'

export function traceLot(db: DB, code: string) {
  const query = code.trim()
  if (!query) return null
  const collection = get<any>(
    db,
    'select id, batch_id from collections where trace_code = ? collate nocase or receipt_no = ? collate nocase',
    query,
    query,
  )
  const direct = get<any>(
    db,
    'select id from batches where trace_code = ? collate nocase or batch_code = ? collate nocase',
    query,
    query,
  )
  const start = new Set<number>()
  if (direct?.id) start.add(direct.id)
  if (collection?.batch_id) start.add(collection.batch_id)
  if (collection && !start.size) {
    const linked = get<any>(db, 'select id from batches where collection_id = ?', collection.id)
    if (linked) start.add(linked.id)
  }
  if (!start.size) return null

  const seen = new Set<number>()
  const stack = [...start]
  while (stack.length) {
    const id = stack.pop() as number
    if (seen.has(id)) continue
    seen.add(id)
    const parents = all<any>(
      db,
      `select ci.batch_id as id
       from conversion_inputs ci
       join conversions c on c.id = ci.conversion_id
       where c.output_batch_id = ?`,
      id,
    )
    const children = all<any>(
      db,
      `select c.output_batch_id as id
       from conversion_inputs ci
       join conversions c on c.id = ci.conversion_id
       where ci.batch_id = ?`,
      id,
    )
    for (const row of [...parents, ...children]) stack.push(row.id)
  }

  const ids = [...seen]
  const marks = ids.map(() => '?').join(',')
  const batches = all<any>(db, `select * from batches where id in (${marks}) order by received_on, id`, ...ids)
  const conversions = all<any>(
    db,
    `select distinct c.*
     from conversions c
     left join conversion_inputs ci on ci.conversion_id = c.id
     where c.output_batch_id in (${marks}) or ci.batch_id in (${marks})
     order by c.conv_date, c.id`,
    ...ids,
    ...ids,
  )
  const conversionIds = conversions.map((row) => row.id)
  const inputs = conversionIds.length
    ? all<any>(
        db,
        `select ci.*, b.trace_code, b.state, b.produce
         from conversion_inputs ci
         join batches b on b.id = ci.batch_id
         where ci.conversion_id in (${conversionIds.map(() => '?').join(',')})`,
        ...conversionIds,
      )
    : []
  const collections = all<any>(
    db,
    `select c.*, f.first_name, f.last_name, f.farmer_code, f.phone, f.gender,
            g.name as group_name, gd.name as garden_name, bc.name as centre_name
     from collections c
     join farmers f on f.id = c.farmer_id
     left join groups g on g.id = c.group_id
     left join gardens gd on gd.id = c.garden_id
     left join bulking_centres bc on bc.id = c.centre_id
     where c.batch_id in (${marks}) or c.id in (select collection_id from batches where id in (${marks}) and collection_id is not null)
     order by c.collection_date`,
    ...ids,
    ...ids,
  )
  const collectionIds = collections.map((row) => row.id)
  const payments = collectionIds.length
    ? all<any>(
        db,
        `select p.*, f.first_name, f.last_name
         from payments p
         join farmers f on f.id = p.farmer_id
         where p.collection_id in (${collectionIds.map(() => '?').join(',')})
         order by p.payment_date`,
        ...collectionIds,
      )
    : []
  const sales = all<any>(
    db,
    `select s.*, f.first_name, f.last_name
     from sales s
     left join farmers f on f.id = s.farmer_id
     where s.batch_id in (${marks})
     order by s.sale_date`,
    ...ids,
  )
  return { query, batches, conversions, inputs, collections, payments, sales }
}
