/**
 * اجرای برنامه را برای تعداد مشخصی میلی‌ثانیه متوقف می‌کند.
 * @param {number} ms - تعداد میلی‌ثانیه‌ها برای تأخیر.
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * یک عدد تصادفی بین دو مقدار (شامل هر دو) تولید می‌کند.
 * @param {number} min - حداقل مقدار (بر حسب میلی‌ثانیه).
 * @param {number} max - حداکثر مقدار (بر حسب میلی‌ثانیه).
 * @returns {number} زمان تأخیر تصادفی.
 */
const getRandomDelay = (min, max) => {
  // Math.floor(Math.random() * (max - min + 1)) + min;
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

module.exports = {
  delay,
  getRandomDelay,
};
