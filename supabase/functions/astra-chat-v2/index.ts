const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? Deno.env.get("BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const PRODUCT_KEY = "full_numerology_profile_v1";
const PRODUCT_STARS = 199;

const menu = {
  keyboard: [
    [{ text: "🔢 Нумерология" }, { text: "🤝 Совместимость" }],
    [{ text: "📖 Справочник" }, { text: "ℹ️ О боте" }],
    [{ text: "❓ Помощь" }]
  ],
  resize_keyboard: true,
  is_persistent: true
};

function tg(method: string, body: Record<string, unknown>) {
  return fetch("https://api.telegram.org/bot" + BOT_TOKEN + "/" + method, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  }).then(async r => {
    const data = await r.json();
    if (!data.ok) throw new Error("Telegram " + method + ": " + JSON.stringify(data));
    return data.result;
  });
}

async function db(path: string, options: RequestInit = {}) {
  const r = await fetch(SUPABASE_URL + "/rest/v1/" + path, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });
  if (!r.ok) throw new Error("DB " + r.status + ": " + await r.text());
  return r.status === 204 ? null : r.json();
}

function digits(s: string) {
  return s.replace(/\D/g, "").split("").reduce((a, x) => a + Number(x), 0);
}

function reduceNumber(value: number) {
  let n = value;
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n).split("").reduce((a, x) => a + Number(x), 0);
  }
  return n;
}

function parseDate(input: string) {
  const m = input.trim().match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day ||
    year < 1900 ||
    year > 2100
  ) return null;
  return { day, month, year };
}

async function row(category: string, key: string) {
  const q = "numerology_knowledge?category=eq." +
    encodeURIComponent(category) +
    "&key=eq." +
    encodeURIComponent(key) +
    "&select=*";
  const rows = await db(q);
  return rows?.[0] ?? null;
}

async function reference(category: string, key: string) {
  return row(category, key) ?? {};
}

function dateNumbers(d: {day:number; month:number; year:number}) {
  const yearSum = digits(String(d.year));
  const life = reduceNumber(reduceNumber(d.month) + reduceNumber(d.day) + yearSum);
  const attitude = reduceNumber(d.month + d.day);
  const currentYear = new Date().getUTCFullYear();
  const personalYear = reduceNumber(d.month + d.day + digits(String(currentYear)));

  const fullDigitSum = digits(
    String(d.day).padStart(2, "0") +
    String(d.month).padStart(2, "0") +
    String(d.year)
  );

  const karmic = [13, 14, 16, 19].includes(fullDigitSum)
    ? fullDigitSum
    : [13, 14, 16, 19].includes(d.day)
      ? d.day
      : null;

  return { life, attitude, personalYear, karmic };
}

function labelNumber(n: number) {
  return n === 11 || n === 22 || n === 33 ? "мастер-число " + n : "число " + n;
}

function clean(text: unknown) {
  return String(text ?? "").replace(/—/g, "-").replace(/–/g, "-").trim();
}

function block(title: string, text: unknown) {
  const t = clean(text);
  return t ? title + "\n" + t : "";
}

function splitText(text: string, max = 3800) {
  const out: string[] = [];
  let rest = text;
  while (rest.length > max) {
    let cut = rest.lastIndexOf("\n", max);
    if (cut < 1000) cut = rest.lastIndexOf(" ", max);
    if (cut < 1000) cut = max;
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out;
}

async function sendLong(chatId: number, text: string, extra: Record<string, unknown> = {}) {
  for (const part of splitText(text)) {
    await tg("sendMessage", { chat_id: chatId, text: part, ...extra });
  }
}

function mainKeyboard() {
  return { reply_markup: menu };
}

async function showNumerology(chatId: number) {
  await tg("sendMessage", {
    chat_id: chatId,
    text:
      "🔢 НУМЕРОЛОГИЯ\n\n" +
      "Давай посмотрим на твою дату рождения чуть внимательнее 🙂\n\n" +
      "Отправь дату в формате ДД.ММ.ГГГГ\n" +
      "Например: 04.05.1993\n\n" +
      "Город и время рождения здесь не нужны.",
    ...mainKeyboard()
  });
}

async function calculateProfile(dateText: string) {
  const d = parseDate(dateText);
  if (!d) return null;
  const nums = dateNumbers(d);

  const lifeCategory = [11, 22, 33].includes(nums.life) ? "master" : "core";
  const life = await reference(lifeCategory, String(nums.life));
  const birthday = await reference("birthday", String(d.day));
  const attitude = await reference(
    [11, 22, 33].includes(nums.attitude) ? "master" : "core",
    String(nums.attitude)
  );
  const personalYear = await reference("core", String(nums.personalYear));

  return { d, nums, life, birthday, attitude, personalYear };
}

function freeText(p: any) {
  const d = p.d;
  const n = p.nums;
  return (
    "🔢 ТВОЙ НУМЕРОЛОГИЧЕСКИЙ ПРОФИЛЬ\n\n" +
    "📅 " + String(d.day).padStart(2, "0") + "." + String(d.month).padStart(2, "0") + "." + d.year + "\n\n" +
    "✨ Жизненный путь: " + labelNumber(n.life) + "\n" +
    clean(p.life.meaning) + "\n\n" +
    "🎂 День рождения: " + d.day + "\n" +
    clean(p.birthday.meaning) + "\n\n" +
    "🧭 Число установки: " + n.attitude + "\n" +
    clean(p.attitude.meaning) + "\n\n" +
    "📅 Персональный год " + new Date().getUTCFullYear() + ": " + n.personalYear + "\n" +
    clean(p.personalYear.meaning) + "\n\n" +
    "Это базовый символический разбор. Нумерология не является научным методом прогнозирования.\n\n" +
    "💎 Хочешь увидеть картину глубже?\n" +
    "Полный профиль добавляет отношения, деньги, реализацию, сильные стороны, зоны роста и практические рекомендации."
  );
}

function premiumText(p: any) {
  const d = p.d, n = p.nums;
  const date = String(d.day).padStart(2, "0") + "." + String(d.month).padStart(2, "0") + "." + d.year;

  const parts = [
    "💎 ПОЛНЫЙ ПРОФИЛЬ ASTRA AURA",
    "",
    "📅 " + date,
    "",
    "✨ 1. ЖИЗНЕННЫЙ ПУТЬ",
    "Твоё " + labelNumber(n.life) + ".",
    clean(p.life.meaning),
    clean(p.life.essence),
    "",
    block("💪 Сильные стороны", p.life.strengths),
    block("⚠️ Что может мешать", p.life.challenges),
    block("🎯 Реализация", p.life.realization),
    block("💰 Деньги", p.life.money),
    block("❤️ Отношения", p.life.relationships),
    block("🧭 Смысл", p.life.purpose),
    block("💡 Практический совет", p.life.practical_advice),

    "",
    "🎂 2. ДЕНЬ РОЖДЕНИЯ: " + d.day,
    clean(p.birthday.meaning),
    block("💪 Сильная сторона", p.birthday.strengths),
    block("⚠️ Теневая сторона", p.birthday.challenges),
    block("❤️ В отношениях", p.birthday.relationships),
    block("💰 В реализации", p.birthday.money),
    block("💡 Совет", p.birthday.practical_advice),

    "",
    "🧭 3. ЧИСЛО УСТАНОВКИ: " + n.attitude,
    clean(p.attitude.meaning),
    block("Как это может проявляться", p.attitude.essence),
    block("В отношениях", p.attitude.relationships),

    "",
    "📅 4. ПЕРСОНАЛЬНЫЙ ГОД " + new Date().getUTCFullYear(),
    "Твоё число года: " + n.personalYear + ".",
    clean(p.personalYear.meaning),
    block("Главная тема", p.personalYear.essence),
    block("Практический ориентир", p.personalYear.practical_advice),

    n.karmic
      ? "\n♾ 5. КАРМИЧЕСКАЯ ТЕМА\nВ расчёте проявилось число " + n.karmic + ". В традиционной нумерологии его связывают с темой ответственности, повторяющихся уроков и необходимости осознанно менять привычные сценарии."
      : "",

    "",
    "🌙 ИТОГ",
    "Если собрать всё вместе, твой профиль не про одну отдельную цифру. В нём одновременно видны твои способы действовать, строить отношения, обращаться с ресурсами и проходить текущий период.",
    "Главное здесь не искать жёсткое предсказание. Полезнее использовать этот разбор как зеркало и повод посмотреть на свои привычные решения со стороны.",
    "",
    "Спасибо, что доверил ASTRA AURA свою дату рождения ✨"
  ].filter(Boolean);

  return parts.join("\n");
}

async function issuePremium(chatId: number, user: any, payload: string, payment: any) {
  const parsed = payload.match(/^full_numerology_profile_v1:(\d{2}\.\d{2}\.\d{4})$/);
  if (!parsed) {
    await tg("sendMessage", { chat_id: chatId, text: "Не удалось определить дату заказа. Напиши её ещё раз через «🔢 Нумерология»." });
    return;
  }

  const profile = await calculateProfile(parsed[1]);
  if (!profile) {
    await tg("sendMessage", { chat_id: chatId, text: "Похоже, дата в заказе повреждена. Давай пересчитаем 🙂" });
    return;
  }

  await db("numerology_purchases", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates" },
    body: JSON.stringify({
      telegram_user_id: user.id,
      username: user.username ?? null,
      product_key: PRODUCT_KEY,
      payload,
      currency: payment.currency,
      amount: payment.total_amount,
      telegram_charge_id: payment.telegram_payment_charge_id
    })
  });

  await sendLong(chatId, premiumText(profile), mainKeyboard());
}

async function handleUpdate(update: any) {
  if (update.pre_checkout_query) {
    const q = update.pre_checkout_query;
    const valid =
      q.currency === "XTR" &&
      Number(q.total_amount) === PRODUCT_STARS &&
      typeof q.invoice_payload === "string" &&
      q.invoice_payload.startsWith(PRODUCT_KEY + ":");

    await tg("answerPreCheckoutQuery", {
      pre_checkout_query_id: q.id,
      ok: valid,
      ...(valid ? {} : { error_message: "Не удалось проверить заказ. Попробуй ещё раз через минуту." })
    });
    return;
  }

  const message = update.message;
  if (!message) return;

  const chatId = message.chat?.id;
  const user = message.from;
  if (!chatId || !user) return;

  if (message.successful_payment) {
    await issuePremium(
      chatId,
      user,
      message.successful_payment.invoice_payload,
      message.successful_payment
    );
    return;
  }

  const text = String(message.text ?? "").trim();

  if (text === "/paysupport") {
    await tg("sendMessage", {
      chat_id: chatId,
      text: "💬 Поддержка по оплате ASTRA AURA\n\nЕсли оплата прошла, а полный профиль не пришёл, напиши сюда и укажи время покупки. Мы проверим платёж.",
      ...mainKeyboard()
    });
    return;
  }

  if (text === "/start" || text === "🏠 Главное меню") {
    await tg("sendMessage", {
      chat_id: chatId,
      text: "✨ ASTRA AURA\n\nСпокойно разберём числа твоей даты рождения. Выбирай направление ниже 👇",
      ...mainKeyboard()
    });
    return;
  }

  if (text === "🔢 Нумерология") {
    await showNumerology(chatId);
    return;
  }

  if (text === "🤝 Совместимость") {
    await tg("sendMessage", {
      chat_id: chatId,
      text: "🤝 СОВМЕСТИМОСТЬ\n\nЗдесь будет разбор пары по двум датам рождения ❤️\n\nРаздел уже подготовлен и станет следующим платным продуктом ASTRA AURA.",
      ...mainKeyboard()
    });
    return;
  }

  if (text === "📖 Справочник") {
    await tg("sendMessage", {
      chat_id: chatId,
      text:
        "📖 СПРАВОЧНИК\n\n" +
        "🔢 Числа 1-9: базовые качества\n" +
        "🌟 11, 22, 33: мастер-числа\n" +
        "🎂 День рождения 1-31\n" +
        "🧭 Число установки\n" +
        "📅 Персональный год\n" +
        "♾ Кармические числа: 13/4, 14/5, 16/7, 19/1\n\n" +
        "Хочешь персональный разбор? Нажми «🔢 Нумерология» 🙂",
      ...mainKeyboard()
    });
    return;
  }

  if (text === "ℹ️ О боте") {
    await tg("sendMessage", {
      chat_id: chatId,
      text:
        "ℹ️ О БОТЕ\n\n" +
        "ASTRA AURA помогает посмотреть на дату рождения через символическую систему нумерологии.\n\n" +
        "Без сложных формул и лишнего шума. Сначала расчёт, потом понятная интерпретация ✨",
      ...mainKeyboard()
    });
    return;
  }

  if (text === "❓ Помощь") {
    await tg("sendMessage", {
      chat_id: chatId,
      text:
        "❓ ПОМОЩЬ\n\n" +
        "1. Нажми «🔢 Нумерология».\n" +
        "2. Отправь дату рождения ДД.ММ.ГГГГ.\n" +
        "3. Получи базовый разбор.\n" +
        "4. Если захочешь глубже, можно открыть полный профиль 💎\n\n" +
        "Город и время рождения не нужны.",
      ...mainKeyboard()
    });
    return;
  }

  const profile = await calculateProfile(text);
  if (profile) {
    await tg("sendMessage", {
      chat_id: chatId,
      text: freeText(profile),
      reply_markup: {
        inline_keyboard: [[
          { text: "💎 Полный профиль · " + PRODUCT_STARS + "⭐", callback_data: "buy_profile" }
        ]]
      }
    });
    return;
  }

  await tg("sendMessage", {
    chat_id: chatId,
    text: "Я здесь 🙂 Отправь дату рождения в формате ДД.ММ.ГГГГ или выбери «🔢 Нумерология».",
    ...mainKeyboard()
  });
}

async function setWebhookMenu() {
  return;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("ASTRA AURA v37", { status: 200 });
    }

    if (!BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing required environment variables");
      return new Response("configuration error", { status: 500 });
    }

    const update = await req.json();
    if (update.callback_query) {
      const c = update.callback_query;
      await tg("answerCallbackQuery", { callback_query_id: c.id });
      if (c.data === "buy_profile" && c.message?.chat?.id) {
        const chatId = c.message.chat.id;
        const last = await tg("sendMessage", {
          chat_id: chatId,
          text: "💎 Полный профиль ASTRA AURA\n\n" +
            "Чтобы открыть полный разбор, сначала ещё раз отправь дату рождения. " +
            "После этого я сформирую персональный счёт на " + PRODUCT_STARS + "⭐.",
          ...mainKeyboard()
        });
        void last;
      }
      return new Response("ok");
    }

    await handleUpdate(update);
    return new Response("ok");
  } catch (e) {
    console.error(e);
    return new Response("ok");
  }
});
