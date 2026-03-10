/** @type {import('next').NextConfig} */

const FILE_PATHS = {
  HOTJAR_LOADER: path.resolve(
    __dirname,
    "lib/analytics/loaders/hotjar/loader.js",
  )
}

// Utility function to safely read file
function safeReadFile(filePath) {
  try {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath).toString() : "";
  } catch (error) {
    console.error(`Error reading file: ${filePath}`, error);
    return "";
  }
}

const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || "1.0.0",
    hotjarJS: safeReadFile(FILE_PATHS.HOTJAR_LOADER)
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
