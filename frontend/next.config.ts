import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@dbt-online/shared'],
};

export default nextConfig;
