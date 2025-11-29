require("dotenv").config({ path: "./.env" });

// متغیرهای مشترک (بدون پورت)
const sharedEnv = {
  USER_PHONE: process.env.USER_PHONE,
  USER_PASSWORD: process.env.USER_PASSWORD,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  YOUR_TELEGRAM_USER_ID: process.env.YOUR_TELEGRAM_USER_ID,
  TELEGRAM_CHAT_ID_GILAN: process.env.TELEGRAM_CHAT_ID_GILAN,
  TELEGRAM_CHAT_ID_YAZD: process.env.TELEGRAM_CHAT_ID_YAZD,
};

module.exports = {
  apps: [
    {
      name: "DIV-MAZANDARAN",
      script: "src/index.js",
      cwd: "./Divar-MZNDRN",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      // پورت اختصاصی: 3001
      env: { ...sharedEnv, PORT: 3001 },
    },
    {
      name: "DIV-QOM-ARAK",
      script: "src/index.js",
      cwd: "./Divar-QOM-ARAK",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      // پورت اختصاصی: 3002
      env: { ...sharedEnv, PORT: 3002 },
    },
    {
      name: "DIV-SHIRAZ-ISFAHAN",
      script: "src/index.js",
      cwd: "./Divar-SHZ-ISFHN",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      // پورت اختصاصی: 3003
      env: { ...sharedEnv, PORT: 3003 },
    },
    {
      name: "DIV-TEHRAN-SEMNAN",
      script: "src/index.js",
      cwd: "./Divar-THR-SMNAN",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      // پورت اختصاصی: 3004
      env: { ...sharedEnv, PORT: 3004 },
    },
    {
      name: "DIV-YAZD-GILAN",
      script: "src/index.js",
      cwd: "./Divar-YAZD-GILAN",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      // پورت اختصاصی: 3005
      env: { ...sharedEnv, PORT: 3005 },
    },
  ],
};