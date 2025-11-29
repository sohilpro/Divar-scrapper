const puppeteer = require("puppeteer");
const { saveCookies, loadCookies } = require("../utils/cookieManager");
const config = require("../config/config");
const axios = require("axios");
const { delay, getRandomDelay } = require("../utils/helper");
const telegram = require("./telegram");

const COMMON_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36";
const MIN_DELAY_MS = 30 * 1000; // 30 ثانیه
const MAX_DELAY_MS = 75 * 1000; // 75 ثانیه

// For Divar
const AD_LINK_SELECTOR = 'a.links-row__item-d5533[href="/new"]';
const PHONE_INPUT_SELECTOR =
  'input[placeholder="شمارهٔ موبایل"][type="tel"][name="mobile"]';
const CONFIRM_BUTTON_SELECTOR =
  "button.kt-button--primary.auth-actions__submit-button";
const OTP_INPUT_SELECTOR =
  'input[placeholder="کد تأیید ۶ رقمی"][name="code"][maxlength="6"]';
const LOGIN_BUTTON_SELECTOR =
  "button.kt-button--primary.auth-actions__submit-button";

class Scraper {
  constructor() {
    this.browser = null;
  }

  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: "new",
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          `--window-size=${1920},${1080}`,
        ],
        executablePath: "/usr/bin/google-chrome",
      });
      console.log("✅ Browser launched.");
    }
  }

  async login(siteUrl) {
    // 0. استارت اولیه و راه‌اندازی ربات تلگرام
    if (!this.browser) await this.initBrowser();

    const YOUR_TELEGRAM_USER_ID = process.env.YOUR_TELEGRAM_USER_ID;

    // ============================================================
    // 🟢 مرحله ۱: تلاش برای ورود با کوکی (بدون پرسیدن سوال)
    // ============================================================
    console.log("🔄 Checking for existing session (Cookies)...");
    const cookiePage = await this.browser.newPage();
    await cookiePage.setUserAgent(COMMON_USER_AGENT);

    try {
      // لود کردن کوکی‌ها
      const loaded = await loadCookies(cookiePage, siteUrl);

      if (loaded) {
        await cookiePage.goto(siteUrl, { waitUntil: "networkidle2" });

        // بررسی اینکه آیا دکمه "ورود" در صفحه هست یا نه؟
        // اگر دکمه "ورود" وجود نداشته باشد، یعنی لاگین هستیم.
        const isLoggedOut = await cookiePage.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll("button"));
          // در سایت دیوار معمولا دکمه‌ای با متن "ورود" وجود دارد
          return buttons.some((btn) => btn.innerText.includes("ورود"));
        });

        if (!isLoggedOut) {
          console.log("✅ Already logged in via Cookies. Skipping OTP.");
          await cookiePage.close();
          return true; // <--- اینجا از تابع خارج می‌شود و دیگر سوال نمی‌پرسد
        } else {
          console.log(
            "⚠️ Cookies found but session expired. Need to login again."
          );
        }
      } else {
        console.log("ℹ️ No cookies found. Starting fresh login.");
      }
    } catch (err) {
      console.warn("⚠️ Error checking cookies:", err.message);
    }

    // اگر لاگین بودیم که بالا خارج شدیم، اگر نه، صفحه چک کوکی را می‌بندیم و ادامه می‌دهیم
    if (!cookiePage.isClosed()) await cookiePage.close();

    // ============================================================
    // 🟠 مرحله ۲: ورود جدید (انتخاب شماره و دریافت کد)
    // ============================================================

    // 1. دریافت شماره تلفن از طریق دکمه تلگرام
    let phone;
    try {
      console.log("📲 Waiting for user to select phone number via Telegram...");
      // ارسال پیام به شما که نیاز به انتخاب شماره است
      phone = await telegram.askPhoneNumber(YOUR_TELEGRAM_USER_ID);
      console.log(`Selected Phone: ${phone}`);
    } catch (err) {
      console.error(
        "❌ Failed to get phone number from Telegram:",
        err.message
      );
      return false;
    }

    const normalizedPhone = phone.startsWith("0") ? phone.substring(1) : phone;

    // شروع پروسه لاگین در مرورگر
    const page = await this.browser.newPage();
    await page.setUserAgent(COMMON_USER_AGENT);

    console.log(`Starting login flow for ${phone}...`);
    await page.goto(siteUrl, { waitUntil: "networkidle2" });

    try {
      // --- کلیک روی دکمه ورود/ثبت آگهی ---
      // نکته: در دیوار دکمه "ورود" در هدر یا دکمه "ثبت آگهی" تریگر لاگین هستند
      // اگر سلکتور خاصی برای دکمه "ورود" دارید بهتر است، اما همان ثبت آگهی هم کار میکند
      if (await page.$(AD_LINK_SELECTOR)) {
        await page.click(AD_LINK_SELECTOR);
      } else {
        // فال‌بک: شاید دکمه ورود باشد
        const loginBtnSelector = "button.kt-fullwidth-link"; // مثال
        if (await page.$(loginBtnSelector)) await page.click(loginBtnSelector);
      }

      // --- پر کردن شماره موبایل ---
      await page.waitForSelector(PHONE_INPUT_SELECTOR, { timeout: 10000 });

      await delay(1000);
      await page.evaluate((selector) => {
        document.querySelector(selector).value = "";
      }, PHONE_INPUT_SELECTOR);

      await page.type(PHONE_INPUT_SELECTOR, normalizedPhone, { delay: 100 });

      // فشردن اینتر (معمولا در دیوار بعد از شماره اینتر کار میکند)
      await page.keyboard.press("Enter");

      // --- دریافت OTP ---
      await telegram.sendLog(
        `📩 کد تایید دیوار برای شماره ${phone} ارسال شد.\nلطفا کد 6 رقمی را اینجا بفرستید:`,
        YOUR_TELEGRAM_USER_ID
      );

      // منتظر کد از سمت شما
      const otpCode = await telegram.getOtpCode(YOUR_TELEGRAM_USER_ID, 120000); // 2 دقیقه وقت

      await page.waitForSelector(OTP_INPUT_SELECTOR, { timeout: 10000 });
      await page.type(OTP_INPUT_SELECTOR, otpCode, { delay: 100 });

      // صبر برای لود شدن کامل بعد از کد
      await page
        .waitForNavigation({ waitUntil: "networkidle2" })
        .catch(() => {});

      console.log("✅ Login successful.");

      // 🌟 ذخیره کوکی‌ها برای دفعه بعد 🌟
      await saveCookies(page, siteUrl);

      await page.close();
      return true;
    } catch (error) {
      console.error(`Login failed: ${error.message}`);
      await page.close();
      return false;
    }
  }

  async scrapeAds(siteName, searchKeywords = [], location) {
    if (!this.browser) await this.initBrowser();

    const page = await this.browser.newPage();
    await page.setUserAgent(COMMON_USER_AGENT);

    let baseUrl = siteName === "divar" ? config.DIVAR_URL : config.SHEYPOOR_URL;
    baseUrl = baseUrl.replace(/\/+$/, "");

    await loadCookies(page, baseUrl);

    const buildDivarUrl = (phrase) => {
      return `${baseUrl}/s/${encodeURIComponent(
        location
      )}?q=${encodeURIComponent(phrase)}`;
    };

    const collected = new Map();
    const phrases = [];
    if (Array.isArray(searchKeywords) && searchKeywords.length) {
      phrases.push(searchKeywords.join(" "));
      for (const k of searchKeywords) {
        if (k && !phrases.includes(k)) phrases.push(k);
      }
    } else if (typeof searchKeywords === "string" && searchKeywords.trim()) {
      phrases.push(searchKeywords);
    } else {
      phrases.push("");
    }

    console.log("🔎 Will search phrases:", phrases);

    try {
      for (const phrase of phrases) {
        const searchUrl =
          siteName === "divar" ? buildDivarUrl(phrase) : buildDivarUrl(phrase);

        console.log(`ℹ️ Navigating to: ${searchUrl}`);

        try {
          await page.goto(searchUrl, {
            waitUntil: "domcontentloaded",
            timeout: 30000,
          });
        } catch (navErr) {
          console.warn(
            `⚠️ Navigation failed for phrase "${phrase}": ${navErr.message}`
          );
          continue;
        } // شناسایی انتخابگر اصلی کارت‌ها

        const adSelectors =
          siteName === "divar"
            ? "article.kt-post-card"
            : 'a[data-test-id^="ad-item-"]';

        try {
          await page.waitForSelector(adSelectors, { timeout: 10000 }); // افزایش تایم‌آوت
        } catch (waitErr) {
          console.log(
            `ℹ️ No results selector for phrase "${phrase}". Continuing.`
          );
          continue;
        } // استخراج آگهی‌ها از صفحه جاری

        const adsOnPage = await page.$$eval(
          adSelectors,
          (ads, currentSiteName, baseUrlForEval) => {
            return ads
              .map((ad) => {
                let title, url, mileage, price, location;

                if (currentSiteName === "divar") {
                  const titleEl = ad.querySelector(".kt-post-card__title");
                  title = titleEl ? titleEl.textContent.trim() : "N/A";

                  const a = ad.querySelector("a");
                  const relativeUrl = a ? a.getAttribute("href") : null;
                  url =
                    relativeUrl && relativeUrl.startsWith("/")
                      ? baseUrlForEval + relativeUrl
                      : relativeUrl;

                  // استخراج قیمت و کیلومتر از دیوارهای توضیحات
                  const descs = ad.querySelectorAll(
                    ".kt-post-card__description"
                  );
                  if (descs.length === 1) {
                    price = descs[0].textContent.trim();
                  } else if (descs.length >= 2) {
                    mileage = descs[0].textContent.trim();
                    price = descs[1].textContent.trim();
                  }
                } else {
                  // ----------------- منطق شیپور (Sheypoor Logic) -----------------

                  // عنوان در تگ H2
                  const titleEl = ad.querySelector("h2");
                  title = titleEl
                    ? titleEl.textContent.trim().replace("Ad", "").trim()
                    : "N/A"; // حذف برچسب 'Ad'

                  // URL از ویژگی href در تگ A اصلی
                  const relativeUrl = ad.getAttribute("href");
                  url =
                    relativeUrl && relativeUrl.startsWith("/")
                      ? baseUrlForEval + relativeUrl
                      : relativeUrl;

                  // قیمت: در تگ span با کلاس‌های Bolder
                  const priceSpan = ad.querySelector(
                    ".text-heading-4-bolder, .text-heading-5-bolder"
                  );
                  price = priceSpan ? priceSpan.textContent.trim() : "N/A";

                  // موقعیت مکانی (Location)
                  // پیدا کردن اولین تگ small که پس از div قیمت می‌آید
                  const locationEl = ad.querySelector(
                    "small.text-heading-6-lighter"
                  );
                  location = locationEl ? locationEl.textContent.trim() : "N/A";
                  mileage = "N/A (Sheypoor)"; // کیلومتر در لیست شیپور معمولا نیست
                }

                const id = url.split("/").filter(Boolean).pop() || url;

                return {
                  id,
                  title,
                  url,
                  site: currentSiteName,
                  mileage,
                  price,
                  location,
                  description: "Not extracted from list view",
                };
              })
              .filter(Boolean);
          },
          siteName,
          baseUrl
        );

        console.log(`✅ Found ${adsOnPage.length} ads for phrase "${phrase}"`); // ادغام و حذف تکراری‌ها

        for (const ad of adsOnPage) {
          if (!collected.has(ad.id)) {
            collected.set(ad.id, ad);
          }
        } // تأخیر محترمانه بین درخواست‌های جستجو برای جلوگیری از rate-limit

        await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000));
      }
    } catch (err) {
      console.error("❌ scrapeAds main error:", err.message);
    } finally {
      await page.close();
    }

    const result = Array.from(collected.values());
    console.log(`✅ Total unique ads collected: ${result.length}`);
    return result;
  }

  async getAdData(adUrl) {
    // استخراج ID از URL
    const adIdMatch = adUrl.split("/").filter(Boolean);
    if (!adIdMatch || adIdMatch.length === 0) {
      throw new Error("Could not extract Ad ID from URL.");
    }

    const adId = adIdMatch[adIdMatch.length - 1];
    const url = `https://api.divar.ir/v8/posts-v2/web/${adId}`;

    try {
      const response = await axios.get(url);
      const data = response.data;

      // ---------------------------------------------------------
      // ۱. بررسی قیمت (فیلتر کردن)
      // ---------------------------------------------------------
      const price = data.webengage?.price || 0;

      // اگر قیمت صفر یا منفی بود (توافقی)، نال برگردان تا کد متوقف شود
      if (price <= 0) {
        console.log(`⛔ قیمت توافقی است، نادیده گرفته شد. (ID: ${adId})`);
        return null;
      }

      // ---------------------------------------------------------
      // ۲. استخراج عکس
      // ---------------------------------------------------------
      const imageSection = data.sections.find(
        (s) => s.section_name === "IMAGE"
      );
      const carouselWidget = imageSection?.widgets.find(
        (w) => w.widget_type === "IMAGE_CAROUSEL"
      );

      let mainImageUrl = null;
      if (carouselWidget && carouselWidget.data.items.length > 0) {
        mainImageUrl = carouselWidget.data.items[0].image.url;
      } else {
        console.log("⚠️ آگهی عکس ندارد.");
      }

      // لاگ جهت اطلاع
      console.log(`✅ آگهی تایید شد.`);
      console.log(`💰 قیمت: ${price.toLocaleString("fa-IR")}`);
      console.log(`📸 عکس: ${mainImageUrl}`);

      // بازگرداندن اطلاعات مورد نیاز برای تلگرام
      return {
        imageUrl: mainImageUrl,
        price,
        formattedPrice: price.toLocaleString("fa-IR"),
      };
    } catch (error) {
      console.error("خطا در دریافت اطلاعات دیوار:", error.message);
      return null;
    }
  }

  async getPhoneNumber(adUrl) {
    if (!this.browser) await this.initBrowser();
    const page = await this.browser.newPage();
    await page.setUserAgent(COMMON_USER_AGENT);

    const isDivar = adUrl.includes("divar");
    const siteUrl = isDivar ? config.DIVAR_URL : config.SHEYPOOR_URL;

    await loadCookies(page, siteUrl);

    try {
      await page.goto(adUrl, {
        waitUntil: "networkidle2",
        timeout: 45000,
      });
    } catch (err) {
      console.error("❌ Error loading page:", err.message);
      await page.close();
      return "N/A";
    }

    let phoneNumber = "N/A";

    try {
      // ============================
      // 📌 منطق دیوار (DIVAR)
      // ============================
      if (isDivar) {
        const adIdMatch = adUrl.split("/").filter(Boolean);
        if (!adIdMatch) {
          throw new Error("Could not extract Ad ID from Sheypoor URL.");
        }

        const adId = adIdMatch[adIdMatch.length - 1];

        const DivarApiUrl = `https://api.divar.ir/v8/postcontact/web/contact_info_v2/${adId}`;

        const randomTime = getRandomDelay(MIN_DELAY_MS, MAX_DELAY_MS);
        const randomSeconds = (randomTime / 1000).toFixed(1); // نمایش به صورت ثانیه
        console.log(
          `⏱️ Waiting for a random delay of ${randomSeconds} seconds...`
        );

        await delay(randomTime);

        const cookies = await page.cookies(siteUrl);
        const cookieHeader = cookies
          .map((c) => `${c.name}=${c.value}`)
          .join("; ");

        const tokenCookie = cookies.find((c) => c.name === "token");
        if (!tokenCookie) {
          throw new Error(
            "Divar API: Authentication 'token' cookie not found."
          );
        }

        const authorizationHeader = `Bearer ${tokenCookie.value}`;

        const response = await axios.post(
          DivarApiUrl,
          {},
          {
            headers: {
              // ✅ هدرهای حیاتی امنیتی
              Authorization: authorizationHeader,
              "x-render-type": "CSR",
              "Content-Type": "application/json",
              "User-Agent": COMMON_USER_AGENT,
              Cookie: cookieHeader,
              "Accept-Language": "fa-IR,fa;q=0.9",
              Origin: "https://divar.ir",
              Referer: "https://divar.ir/",
            },
            timeout: 15000,
          }
        ); // 3. ✅ استخراج شماره از پاسخ API (تطبیق با ساختار JSON ارسالی)

        const widgets = response.data.widget_list;

        const phoneWidget = widgets.find(
          (w) => w.data.title === "شمارهٔ موبایل" // 👈 عنوان مورد انتظار
        );

        if (phoneWidget) {
          // شماره انگلیسی از payload را استخراج می‌کنیم
          const enNumber =
            phoneWidget.data?.action?.payload?.phone_number?.trim();

          phoneNumber = enNumber;
          console.log(`✅ Divar Phone Result (API): ${phoneNumber}`);
        } else {
          phoneNumber = "چت دیوار";
          console.log(`✅ Divar Phone Result (API): ${phoneNumber}`);
        }
      } else {
        const adIdMatch = adUrl.match(/(\d+)\.html$/);
        if (!adIdMatch) {
          throw new Error("Could not extract Ad ID from Sheypoor URL.");
        }
        const adId = adIdMatch[1];
        const sheypoorApiUrl = `https://www.sheypoor.com/api/v10.0.0/listings/${adId}/number`;
        console.log(`ℹ️ [Sheypoor API] Fetching number for: ${adUrl}`); // 2. ساخت درخواست API (استخراج کوکی برای احراز هویت)

        const randomTime = getRandomDelay(MIN_DELAY_MS, MAX_DELAY_MS);
        const randomSeconds = (randomTime / 1000).toFixed(1); // نمایش به صورت ثانیه
        console.log(
          `⏱️ Waiting for a random delay of ${randomSeconds} seconds...`
        );

        await delay(randomTime);

        const cookies = await page.cookies(siteUrl);
        const cookieHeader = cookies
          .map((c) => `${c.name}=${c.value}`)
          .join("; ");
        const response = await axios.get(sheypoorApiUrl, {
          headers: {
            Cookie: cookieHeader,
            "User-Agent": COMMON_USER_AGENT,
          },
          timeout: 15000,
        }); // 3. ✅ استخراج شماره از پاسخ API (تطبیق با ساختار JSON ارسالی)

        if (
          response.data &&
          response.data.data &&
          response.data.data.attributes
        ) {
          phoneNumber = response.data.data.attributes.phoneNumber.trim();
        } else {
          throw new Error(
            "API response was missing expected data path (data.attributes.phoneNumber)."
          );
        }
        console.log(`✅ Sheypoor Phone Result (API): ${phoneNumber}`);
      }
    } catch (error) {
      console.error(
        `❌ Error getting phone number (${isDivar ? "Divar" : "Sheypoor"}):`,
        error.message
      );
    }

    await page.close();
    return phoneNumber;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log("Browser closed.");
    }
  }
}

module.exports = new Scraper();
