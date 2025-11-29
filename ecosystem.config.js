module.exports = {
  apps: [
    {
      name: "DIV-MAZANDARAN",
      script: "src/index.js", // مسیر نسبی به cwd
      cwd: "./Divar-MZNDRN", // مهم: تعیین پوشه اجرایی
      instances: 1,
      exec_mode: "fork",
      watch: false,
    },
    {
      name: "DIV-QOM-ARAK",
      script: "src/index.js",
      cwd: "./Divar-QOM-ARAK",
      instances: 1,
      exec_mode: "fork",
      watch: false,
    },
    {
      name: "DIV-SHIRAZ-ISFAHAN",
      script: "src/index.js",
      cwd: "./Divar-SHZ-ISFHN",
      instances: 1,
      exec_mode: "fork",
      watch: false,
    },
    {
      name: "DIV-TEHRAN-SEMNAN",
      script: "src/index.js",
      cwd: "./Divar-THR-SMNAN",
      instances: 1,
      exec_mode: "fork",
      watch: false,
    },
    {
      name: "DIV-YAZD-GILAN", // اصلاح نام
      script: "src/index.js",
      cwd: "./Divar-YAZD-GILAN", // اصلاح مسیر پوشه (اضافه شدن D)
      instances: 1,
      exec_mode: "fork",
      watch: false,
    },
  ],
};
