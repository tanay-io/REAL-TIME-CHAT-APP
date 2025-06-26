module.exports = {
    webpack: (config) => {
<<<<<<< HEAD
      config.resolve.fallback = { 
=======
      config.resolve.fallback = {
>>>>>>> f081092 (done all except ui and users page)
        net: false,
        tls: false,
        dns: false,
        fs: false,
      };
      return config;
    },
  };