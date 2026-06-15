export const DashboardHome = () => (
  <div className="space-y-6">
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Dashboard</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Welcome back to RoleSnap</h1>
          <p className="mt-2 text-slate-600">Track jobs from WhatsApp, Chrome, and your dashboard in one place.</p>
        </div>
      </div>
    </div>

    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Total jobs</p>
        <p className="mt-3 text-4xl font-semibold text-slate-900">0</p>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Interviews</p>
        <p className="mt-3 text-4xl font-semibold text-blue-600">0</p>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Offers</p>
        <p className="mt-3 text-4xl font-semibold text-emerald-600">0</p>
      </div>
    </div>
  </div>
)
