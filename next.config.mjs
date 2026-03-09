/** @type {import('next').NextConfig} */
const fs = require(“graceful-fs”);
const { version } = require(“./package.json”);

// Constants for file paths
const FILE_PATHS = {
  HOTJAR_LOADER:
    "@docsapp/analytics/public/hotjar/loader.js",
};

const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || "1.0.0",
    hotjarJS: safeReadFile(FILE_PATHS.HOTJAR_LOADER),
    appVersion: version
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  }
}

// Utility function to safely read file
function safeReadFile(filePath) {
  try {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath).toString() : “”;
  } catch (error) {
    console.error(`Error reading file: ${filePath}`, error);
    return “”;
  }
}

export default nextConfig
