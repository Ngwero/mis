'use client'

import { useEffect, useId, useState } from 'react'
import { canSee } from '@/lib/rbac'

type Step = { kicker: string; title: string; body: string; where: string }

function stepsFor(role: string): Step[] {
  const people = canSee(role, 'payroll')
    ? 'Farmers hold the person, their group, and who added the record. Staff, payroll, shares, and the youth and women councils sit beside them.'
    : 'Farmers hold the person, their group, and who added the record. Groups, shares, and the youth and women councils sit beside them.'
  const books = canSee(role, 'finance')
    ? {
        kicker: 'The books',
        title: 'Payments, credit, and the statements.',
        body: 'Farmer payments, sales, and loans post into one ledger. Income, the balance sheet, and cash flow stay with the stock.',
        where: 'Farmer payments · Credit · Financial statements',
      }
    : {
        kicker: 'Your desk',
        title: 'What you keep, and what finance keeps.',
        body: 'You record members, gardens, deliveries, and messages. Payroll, credit, and the statements stay with finance.',
        where: 'Messages · Reports',
      }
  return [
    {
      kicker: 'Season',
      title: 'The harvest, on one screen.',
      body: 'Coffee received, what members are still owed, and whether the ledger balances. That is the season overview.',
      where: 'Dashboard',
    },
    {
      kicker: 'People',
      title: 'Members, staff, and the shares they hold.',
      body: people,
      where: 'Farmers · Staff · Groups',
    },
    {
      kicker: 'Field',
      title: 'Gardens, then the training room.',
      body: 'A garden keeps its size, place, altitude, and the harvest you expect. Training takes its attendees from the farmer list.',
      where: 'Gardens · Training',
    },
    {
      kicker: 'Produce',
      title: 'Follow a lot from the tree to the buyer.',
      body: 'Each delivery gets a trace code. Move it through parchment, green, and roast, pay the member, then record the sale.',
      where: 'Collections · Traceability · Sales',
    },
    books,
  ]
}

export function Tour({
  role,
  open,
  onClose,
}: {
  role: string
  open: boolean
  onClose: () => void
}) {
  const titleId = useId()
  const steps = stepsFor(role)
  const [step, setStep] = useState(0)
  const [trackedOpen, setTrackedOpen] = useState(open)
  if (open !== trackedOpen) {
    setTrackedOpen(open)
    if (open) setStep(0)
  }
  const current = steps[Math.min(step, steps.length - 1)]
  const last = step === steps.length - 1

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') setStep((value) => Math.min(value + 1, steps.length - 1))
      if (event.key === 'ArrowLeft') setStep((value) => Math.max(value - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, steps.length])

  if (!open) return null

  return (
    <div className="tour">
      <div className="tour-mirror" aria-hidden="true" />
      <section className="tour-card" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="tour-head">
          <p>Quick tour</p>
          <span>{step + 1} of {steps.length}</span>
          <button type="button" onClick={onClose}>Skip</button>
        </header>
        <p className="tour-kicker">{current.kicker}</p>
        <h2 id={titleId}>{current.title}</h2>
        <p className="tour-body">{current.body}</p>
        <p className="tour-where">{current.where}</p>
        <div className="tour-dots" aria-hidden="true">
          {steps.map((item, index) => (
            <i key={item.kicker} className={index === step ? 'on' : ''} />
          ))}
        </div>
        <footer className="tour-foot">
          <button className="btn btn-ghost" type="button" onClick={() => setStep((value) => Math.max(value - 1, 0))} disabled={step === 0}>
            Back
          </button>
          <button className="btn btn-primary" type="button" onClick={() => (last ? onClose() : setStep((value) => value + 1))}>
            {last ? 'Done' : 'Next'}
          </button>
        </footer>
      </section>
    </div>
  )
}
