'use client'

import { useSearchParams } from 'next/navigation'

export function Flash() {
  const params = useSearchParams()
  const ok = params.get('ok')
  const error = params.get('error')
  if (!ok && !error) return null
  return <div className={`flash ${error ? 'error' : 'ok'}`}>{error || ok}</div>
}
