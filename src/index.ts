import { Bot, webhookCallback } from "grammy";

export interface Env {
  BOT_TOKEN: string;
}

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
  "asu",
];

const SPAM_LIMIT = 5;
const SPAM_WINDOW = 3000;

const userMessages = new Map<number, number[]>();

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const bot = new Bot(env.BOT_TOKEN);

    // Helper: username dengan fallback
    const getUserName = (ctx: any) =>
      ctx.from?.username || ctx.from?.first_name || "Nak";

    // Command: /start
    bot.command("start", (ctx) =>
      ctx.reply(
        "Halo! ini Emak c0desk1.\n\n" +
          "Tugas emak menjaga ketertiban grup c0desk1.\n\n" +
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
          "Emak akan otomatis menghapus pesan yang melanggar aturan."
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
        if (member.status === "administrator" || member.status === "creator" || member.status === "owner") {
          return next();
        }
      } catch (e) {
        // ignore
      }

      const userName = getUserName(ctx);

      // Cek bad words
      const hasBadWord = BAD_WORDS.some((word) =>
        new RegExp(`\\b${word}\\b`, "i").test(text)
      );

      if (hasBadWord) {
        try {
          await ctx.deleteMessage();
          await ctx.reply(
            `⚠️ ${userName}, pesanmu mengandung kata yang tidak pantas dan sudah dihapus.`
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
            `⚠️ ${userName}, jangan spam ya. Tunggu sebentar.`
          );
        } catch (e) {
          console.error("Spam action failed:", e);
        }
        return;
      }

      return next();
    });

    const handler = webhookCallback(bot, "cloudflare-mod");
    return handler(request);
  },
};