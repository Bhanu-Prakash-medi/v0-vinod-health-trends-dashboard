"use client"

export function TopNavigationSkeleton() {
  return (
    <div className="bg-gradient-to-b from-[#f1f7ff] to-transparent px-4 py-6 animate-pulse">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-gray-200" />
        <div className="h-5 w-32 rounded bg-gray-200" />
      </div>

      {/* Beneficiary Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex shrink-0 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2"
          >
            <div className="h-5 w-5 rounded-full bg-gray-200" />
            <div className="h-3 w-16 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ProfileCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-3 border border-[#f0f3f5] py-3.5 animate-pulse">
      {/* Header Section */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="relative h-[50px] w-[50px] shrink-0">
            <div className="h-full w-full rounded-full bg-gray-200" />
          </div>

          {/* User Info */}
          <div className="my-0 pt-0">
            <div className="h-4 w-32 rounded bg-gray-200 mb-2" />
            <div className="flex items-center gap-2 mb-1">
              <div className="h-4 w-12 rounded bg-gray-200" />
              <div className="h-3 w-16 rounded bg-gray-200" />
            </div>
            <div className="h-3 w-24 rounded bg-gray-200" />
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg border border-[#f0f3f5] bg-[#fafbfc] p-2">
            <div className="h-7 w-7 rounded-full bg-gray-200" />
            <div>
              <div className="h-2 w-10 rounded bg-gray-200 mb-1" />
              <div className="h-3 w-12 rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function HealthSummarySkeleton() {
  return (
    <section className="min-h-[50vh] flex items-center justify-center">
      <div className="flex flex-col items-center justify-center">
        {/* Loader */}
        <div className="relative mx-auto mb-4 h-12 w-12">
          <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[#156ddc]"></div>
          <div className="absolute inset-2 animate-pulse rounded-full bg-blue-50"></div>
        </div>
        {/* Loading Text */}
        <p className="text-sm text-[#5a6977] text-center">
          Analyzing lab reports with <span className="font-medium text-[#156ddc]">MedibuddyAI</span>....
        </p>
      </div>
    </section>
  )
}
