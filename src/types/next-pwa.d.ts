declare module 'next-pwa' {
  import { NextConfig } from 'next';
  
  interface PWAConfig {
    dest?: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
    sw?: string;
    publicExcludes?: string[];
    buildExcludes?: (RegExp | string | ((chunk: unknown) => boolean))[];
  }
  
  function withPWA(config: PWAConfig): (nextConfig: NextConfig) => NextConfig;
  
  export default withPWA;
}