import type { NextConfig } from 'next'

// mysql2 loads native-free Node built-ins, so keep it outside the bundler.
const config: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['mysql2'],
  poweredByHeader: false,
}

export default config
