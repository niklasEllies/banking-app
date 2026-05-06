export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-surface dark:bg-[#141810]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="h-4 w-32 bg-gray-200 dark:bg-[#2a3124] rounded animate-pulse mb-6" />
        <div className="h-7 w-24 bg-gray-200 dark:bg-[#2a3124] rounded animate-pulse mb-6" />

        {/* Stats card skeleton */}
        <div className="bg-white dark:bg-[#1e231a] rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="h-8 w-12 mx-auto bg-gray-200 dark:bg-[#2a3124] rounded animate-pulse" />
              <div className="h-3 w-10 mx-auto mt-2 bg-gray-200 dark:bg-[#2a3124] rounded animate-pulse" />
            </div>
            <div className="text-center">
              <div className="h-8 w-12 mx-auto bg-gray-200 dark:bg-[#2a3124] rounded animate-pulse" />
              <div className="h-3 w-10 mx-auto mt-2 bg-gray-200 dark:bg-[#2a3124] rounded animate-pulse" />
            </div>
            <div className="text-center">
              <div className="h-8 w-12 mx-auto bg-gray-200 dark:bg-[#2a3124] rounded animate-pulse" />
              <div className="h-3 w-10 mx-auto mt-2 bg-gray-200 dark:bg-[#2a3124] rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Sections skeleton */}
        <div className="mt-8 space-y-8">
          <div>
            <div className="h-4 w-24 bg-gray-200 dark:bg-[#2a3124] rounded animate-pulse mb-3" />
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark:bg-[#1e231a] rounded-xl h-16 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
