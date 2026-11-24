'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card p-6">
      <h1 className="font-display text-2xl text-forest">This page did not load</h1>
      <p className="mt-2 text-sm text-muted">{error.message}</p>
      <button className="btn btn-primary mt-4" type="button" onClick={reset}>Try again</button>
    </div>
  )
}
