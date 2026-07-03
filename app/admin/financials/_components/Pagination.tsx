export function Pagination({
  currentPage,
  totalPages,
  basePath,
  paramName,
  preserveParams = {},
}: {
  currentPage: number;
  totalPages: number;
  basePath: string;
  paramName: string;
  preserveParams?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  const buildHref = (page: number) => {
    const params = new URLSearchParams();
    params.set(paramName, String(page));
    for (const [key, value] of Object.entries(preserveParams)) {
      if (value !== undefined) params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const pageNumbers: number[] = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else if (currentPage <= 3) {
    pageNumbers.push(1, 2, 3, 4, 5);
  } else if (currentPage >= totalPages - 2) {
    for (let i = totalPages - 4; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    for (let i = currentPage - 2; i <= currentPage + 2; i++) pageNumbers.push(i);
  }

  return (
    <div className="mt-6 flex items-center justify-between">
      <p className="text-sm text-slate-500">
        صفحة {currentPage} من {totalPages}
      </p>
      <div className="flex items-center gap-2">
        {currentPage > 1 && (
          <a
            href={buildHref(currentPage - 1)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            السابق
          </a>
        )}

        <div className="flex items-center gap-1">
          {pageNumbers.map((pageNum) => (
            <a
              key={pageNum}
              href={buildHref(pageNum)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-medium transition-all duration-200 ${
                pageNum === currentPage
                  ? "bg-slate-900 text-white shadow-[0_2px_8px_rgba(15,23,42,0.2)]"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              {pageNum}
            </a>
          ))}
        </div>

        {currentPage < totalPages && (
          <a
            href={buildHref(currentPage + 1)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
          >
            التالي
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}
