'use client'

export function SkeletonChart() {
  return (
    <div aria-hidden="true" className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
      <div className="flex justify-between">
        <div className="space-y-1.5">
          <div className="skeleton h-4 w-32 rounded" />
          <div className="skeleton h-3 w-24 rounded" />
        </div>
        <div className="skeleton h-6 w-20 rounded-full" />
      </div>
      <div className="skeleton h-52 w-full rounded-xl mt-2" />
      <div className="skeleton h-5 w-full rounded" />
      <div className="flex gap-3 mt-1">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton h-3 w-16 rounded" />)}
      </div>
    </div>
  )
}

export function SkeletonStatus() {
  return (
    <div aria-hidden="true" className="bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4">
      <div className="skeleton w-12 h-12 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3 w-20 rounded" />
        <div className="skeleton h-4 w-40 rounded" />
        <div className="skeleton h-3 w-28 rounded" />
      </div>
      <div className="space-y-1 shrink-0">
        <div className="skeleton h-6 w-14 rounded" />
        <div className="skeleton h-3 w-10 rounded" />
      </div>
    </div>
  )
}

export function SkeletonRecommendation() {
  return (
    <div aria-hidden="true" className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 space-y-3">
      <div className="skeleton h-4 w-40 rounded" />
      <div className="skeleton h-20 w-full rounded-xl" />
      <div className="flex gap-4">
        {[1, 2, 3].map(i => <div key={i} className="skeleton h-3 w-24 rounded" />)}
      </div>
    </div>
  )
}
