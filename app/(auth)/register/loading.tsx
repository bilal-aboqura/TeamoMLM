export default function RegisterLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-100 rounded-lg mx-auto w-48" />
            <div className="space-y-4">
              <div className="h-4 bg-slate-100 rounded w-24" />
              <div className="h-12 bg-slate-100 rounded-xl" />
              <div className="h-4 bg-slate-100 rounded w-20" />
              <div className="h-12 bg-slate-100 rounded-xl" />
              <div className="h-4 bg-slate-100 rounded w-28" />
              <div className="h-12 bg-slate-100 rounded-xl" />
              <div className="h-4 bg-slate-100 rounded w-24" />
              <div className="h-12 bg-slate-100 rounded-xl" />
            </div>
            <div className="h-12 bg-slate-100 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
