/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  webpack: (config) => {
    // skinview3d ships its own nested three@0.136.0 (a regular dep, not peer dep).
    // If we also import "three" from the root (0.165.0) we get two separate class
    // registries — Three.js itself warns "Multiple instances detected" and raycasting
    // fails because mesh objects and the Raycaster come from different copies.
    //
    // Fix: redirect every "three" import to the single copy that skinview3d already
    // uses so both share the same class instances.
    config.resolve.alias = {
      ...config.resolve.alias,
      three: path.resolve(__dirname, 'node_modules/skinview3d/node_modules/three'),
    };
    return config;
  },
};

module.exports = nextConfig;
