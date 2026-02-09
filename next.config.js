/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  webpack: (config, { isServer }) => {
    // MediaPipe requires wasm support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Optimize for browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }

    return config;
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_MEDIAPIPE_CDN: 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation',
  },
};

module.exports = nextConfig;
