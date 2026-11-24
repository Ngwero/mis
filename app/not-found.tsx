export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-cream p-6">
      <div className="card max-w-md p-8">
        <p className="page-kicker">CoopMIS</p>
        <h1 className="page-title mt-2">That page is not in the system</h1>
        <p className="lede">The record or screen you asked for is not available.</p>
        <a className="btn btn-primary mt-5" href="/dashboard">Back to the dashboard</a>
      </div>
    </main>
  )
}
