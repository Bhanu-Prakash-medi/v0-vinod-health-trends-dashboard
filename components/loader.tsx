export default function Loader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f9fa]">
      <div className="text-center">
        <div className="relative mx-auto mb-6 h-16 w-16">
          {/* Outer spinning ring */}
          <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-blue-500"></div>
          {/* Inner pulsing circle */}
          <div className="absolute inset-2 animate-pulse rounded-full bg-blue-50"></div>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Analyzing your health report...</h2>
        <p className="text-sm text-gray-500">This may take up to 30 seconds</p>
      </div>
    </div>
  )
}
