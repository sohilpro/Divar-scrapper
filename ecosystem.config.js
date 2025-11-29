// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "DIV-MAZANDARAN",
      script: "Divar-MZNDRN/src/index.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
    },
    {
      name: "DIV-QOM-ARAK",
      script: "Divar-QOM-ARAK/src/index.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
    },
    {
      name: "DIV-SHIRAZ-ISFAHAN",
      script: "Divar-SHZ-ISFHN/src/index.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
    },
    {
      name: "DIV-TEHRAN-SEMNAN",
      script: "Divar-THR-SMNAN/src/index.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
    },
    {
      name: "DIV-YAZD-GILAN",
      script: "Divar-YAZ-GILAN/src/index.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
    },
  ],
};
