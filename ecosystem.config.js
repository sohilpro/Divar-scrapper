// 1. فراخوانی فایل .env از مسیر اصلی پروژه
require("dotenv").config({ path: "./.env" });

// 2. تعریف متغیرهای مشترک برای جلوگیری از تکرار
const sharedEnv = {
  PORT: process.env.PORT,
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
      env: sharedEnv, // تزریق همه متغیرها
    },
    {
      name: "DIV-QOM-ARAK",
      script: "src/index.js",
      cwd: "./Divar-QOM-ARAK",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      env: sharedEnv,
    },
    {
      name: "DIV-SHIRAZ-ISFAHAN",
      script: "src/index.js",
      cwd: "./Divar-SHZ-ISFHN",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      env: sharedEnv,
    },
    {
      name: "DIV-TEHRAN-SEMNAN",
      script: "src/index.js",
      cwd: "./Divar-THR-SMNAN",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      env: sharedEnv,
    },
    {
      name: "DIV-YAZD-GILAN",
      script: "src/index.js",
      cwd: "./Divar-YAZD-GILAN",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      env: sharedEnv,
    },
  ],
};
