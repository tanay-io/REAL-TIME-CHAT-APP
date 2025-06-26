// next.config.js
module.exports = {
  webpack: (config) => {
    config.resolve.fallback = {
      net: false,
      tls: false,
      dns: false,
      fs: false,
    };
    return config;
  },
};
