const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const QRCode = require("qrcode");
const { Sticker } = require("wa-sticker-formatter");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const math = require("mathjs");
const puppeteer = require("puppeteer");
const fs = require("fs");

console.log("🚀 Starting Master Bot...");

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "Master" }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--disable-extensions',
            '--disable-infobars'
        ],
        executablePath: puppeteer.executablePath(),
    }
});

// QR code event
client.on("qr", async (qr) => {
    console.log("📱 Scan this QR code to connect Master Bot:");
    qrcode.generate(qr, { small: true });
    await QRCode.toFile("qr.png", qr);
    console.log("✅ QR code saved as qr.png — download it from Railway files to scan easily.");
});

client.on("ready", () => {
    console.log("✅ Master Bot is online and connected to WhatsApp!");
});

client.on("message", async (message) => {
    const msg = message.body.toLowerCase();

    // Greeting
    if (msg === "hi") {
        return message.reply("Hello! 👋 I am Master bot, here to assist you.");
    }

    // Sticker maker
    if (message.hasMedia && msg.includes("sticker")) {
        const media = await message.downloadMedia();
        if (media) {
            const sticker = new Sticker(media.data, {
                pack: "Master Pack",
                author: "Master Bot",
                type: "full",
                quality: 100,
            });
            return client.sendMessage(message.from, await sticker.build());
        }
    }

    // Calculator
    if (msg.startsWith("!calc")) {
        try {
            const expression = message.body.slice(5).trim();
            const result = math.evaluate(expression);
            return message.reply(`🧮 Result: ${result}`);
        } catch (err) {
            return message.reply("❌ Invalid calculation.");
        }
    }

    // Search
    if (msg.startsWith("!search")) {
        const query = message.body.slice(8).trim();
        if (!query) return message.reply("❌ Please provide a search term.");
        try {
            const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`);
            const data = await res.json();
            let text = `🔍 Search results for: ${query}\n\n`;
            let count = 1;
            data.RelatedTopics.slice(0, 5).forEach(item => {
                if (item.Text && item.FirstURL) {
                    text += `${count}. ${item.Text} - ${item.FirstURL}\n`;
                    count++;
                }
            });
            return message.reply(text || "❌ No results found.");
        } catch (err) {
            return message.reply("❌ Search failed.");
        }
    }
});

// Welcome & Goodbye messages
client.on("group_participants_update", async (update) => {
    try {
        const groupChat = await client.getChatById(update.id.remote);
        const memberCount = groupChat.participants.length;
        const mentions = [await client.getContactById(update.participants[0])];
        const memberNumber = mentions[0].number;

        if (update.action === "add") {
            groupChat.sendMessage(
                `🎉 Welcome @${memberNumber}!\n📛 Group: ${groupChat.name}\n📊 Members: ${memberCount}\nWe’re happy to have you here! 🚀`,
                { mentions }
            );
        } else if (update.action === "remove") {
            groupChat.sendMessage(
                `😢 Goodbye @${memberNumber}!\n📛 Group: ${groupChat.name}\n📊 Members left: ${memberCount}\nWe’ll miss you 💔`,
                { mentions }
            );
        }
    } catch (err) {
        console.error("Error handling group participant update:", err);
    }
});

client.initialize();
