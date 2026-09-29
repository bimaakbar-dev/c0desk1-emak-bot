import { Bot, webhookCallback } from "grammy";

export interface Env {
  BOT_TOKEN: string;
}

// Daftar kata kasar (bisa ditambah)
const BAD_WORDS = [
  "anjing",
  "bangsat",
  "kontol",
  "memek",
  "ngentot",
  "bajingan",
  "pukimak",
  "kimak",
  "kampret",
  "tai",
];

// Rate limit: max pesan per detik
const SPAM_LIMIT = 5;
const SPAM_WINDOW = 3000; // 3 detik

// Map untuk tracking spam per user
const userMessages = new Map<number, number[]>();

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const bot = new Bot(env.BOT_TOKEN);

    // Command: /start
    bot.command("start", (ctx) =>
      ctx.reply(
        "Halo! Aku Emakc0desk1_bot.\n\n" +
          "Tugasku menjaga ketertiban grup discuss c0desk1.\n\n" +
          "Command:\n" +
          "/start - Mulai bot\n" +
          "/help - Bantuan\n" +
          "/rules - Aturan grup"
      )
    );

    // Command: /help
    bot.command("help", (ctx) =>
      ctx.reply(
        "Bantuan\n\n" +
          "/start - Mulai bot\n" +
          "/help - Bantuan\n" +
          "/rules - Aturan grup\n\n" +
          "Aku akan otomatis menghapus pesan yang melanggar aturan."
      )
    );

    // Command: /rules
    bot.command("rules", (ctx) =>
      ctx.reply(
        "Aturan c0desk1 discuss:\n\n" +
          "1. Saling menghormati\n" +
          "2. No spam\n" +
          "3. No SARA\n" +
          "4. No NSFW\n" +
          "5. No promo tanpa izin\n" +
          "6. Bahasa Indonesia/English OK\n\n" +
          "Pelanggar akan di-mute atau di-ban."
      )
    );

    // Filter: cek bad words & spam
    bot.on("message:text").use(async (ctx, next) => {
      const text = ctx.message.text.toLowerCase();
      const userId = ctx.from?.id;
      if (!userId) return next();

      // Skip kalau admin
      try {
        const member = await ctx.getChatMember(userId);
        if (member.status === "administrator" || member.status === "creator") {
          return next();
        }
      } catch (e) {
        // ignore error
      }

      // Cek bad words
      const hasBadWord = BAD_WORDS.some((word) => text.includes(word));
      if (hasBadWord) {
        try {
          await ctx.deleteMessage();
          await ctx.reply(
            `⚠️ ${ctx.from?.first_name}, pesanmu mengandung kata yang tidak pantas dan sudah dihapus.`
          );
        } catch (e) {
          console.error("Delete failed:", e);
        }
        return;
      }

      // Cek spam
      const now = Date.now();
      const timestamps = userMessages.get(userId) || [];
      const recent = timestamps.filter((t) => now - t < SPAM_WINDOW);
      recent.push(now);
      userMessages.set(userId, recent);

      if (recent.length > SPAM_LIMIT) {
        try {
          await ctx.deleteMessage();
          await ctx.reply(
            `⚠️ ${ctx.from?.first_name}, jangan spam ya. Tunggu sebentar.`
          );
        } catch (e) {
          console.error("Spam action failed:", e);
        }
        return;
      }

      return next();
    });

    // Handler webhook
    const handler = webhookCallback(bot, "cloudflare-mod");
    return handler(request);
  },
};