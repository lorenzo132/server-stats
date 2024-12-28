import { Database } from "bun:sqlite";
import {
  ActivityType,
  ChannelType,
  Client,
  EmbedBuilder,
  IntentsBitField,
} from "discord.js";
import getSystemStats from "./lib/sysinfo";
import { BotData } from "./lib/types";

if (!process.env.TOKEN) throw new Error("No token provided");

const botData: BotData = {
  token: process.env.TOKEN as string,
  prefix: "!",
  ownerIds: ["365644930556755969", "188363246695219201"],
};

const DATABASE = new Database("./stats.db", { create: true });

DATABASE.exec(`CREATE TABLE IF NOT EXISTS channel_database (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT,
    message_id TEXT
)`);

const QUERIES = {
  CREATE_TABLE: DATABASE.prepare(`CREATE TABLE IF NOT EXISTS channel_database (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        channel_id TEXT,
        message_id TEXT
    )`),
  INSERT: DATABASE.prepare(
    `INSERT INTO channel_database (guild_id, channel_id, message_id) VALUES (?, ?, ?)`
  ),
  SELECT: DATABASE.prepare(`SELECT * FROM channel_database WHERE guild_id = ?`),
  SELECT_ALL: DATABASE.prepare(`SELECT * FROM channel_database`),
  DELETE: DATABASE.prepare(
    `DELETE FROM channel_database WHERE guild_id = ? AND channel_id = ?`
  ),
  UPDATE: DATABASE.prepare(
    `UPDATE channel_database SET message_id = ? WHERE guild_id = ? AND channel_id = ?`
  ),
};

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

client.once("ready", async () => {
  QUERIES.CREATE_TABLE.run();
});

async function getSystemInformationAndUpdateMessages() {
  const channelAndMessageIds: {
    guild_id: string;
    channel_id: string;
    message_id: string;
  }[] = (QUERIES.SELECT_ALL.all() || []) as any;
  const systemStats = await getSystemStats();

  const messageEmbed = new EmbedBuilder()
    .setTitle("Server Stats")
    .setColor("#3cfa5f")
    .addFields(
      {
        name: "Server Info",
        value: systemStats,
        inline: false,
      },
      {
        name: "Discord API websocket ping",
        value: `\`\`\`${client.ws.ping}ms\`\`\``,
      }
    );

  for (const { channel_id, message_id } of channelAndMessageIds) {
    const channel = await client.channels.fetch(channel_id);
    if (!channel || channel.type !== ChannelType.GuildText) continue;

    const message = await channel.messages.fetch(message_id);
    if (!message) continue;

    await message.edit({
      embeds: [messageEmbed],
      content: "",
    });
  }
}

client.on("ready", () => {
  console.log(`Logged in as ${client.user!.tag}!`);

client.user?.setStatus("dnd");
client.user?.setActivity({
  name: "watching the servers",
  type: ActivityType.Streaming,
  url: "https://twitch.tv/kidw33d132" // Replace with your streaming URL
});

  setInterval(getSystemInformationAndUpdateMessages, 5 * 1000);
});

client.on("messageCreate", async (message) => {
  const { content, author } = message;
  if (
    author.bot ||
    !content.startsWith(botData.prefix) ||
    !botData.ownerIds.includes(author.id)
  )
    return;

  const args = content.slice(botData.prefix.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  if (!command) return;

  if (command === "ping") {
    message.reply("Pong!");
    return;
  }

  if (command === "add-channel") {
    const channel = message.channel;
    if (channel.type !== ChannelType.GuildText) return;

    try {
      const pingMessage = await message.channel.send("using this message");
      QUERIES.INSERT.run(message.guildId, message.channelId, pingMessage.id);
      await pingMessage.edit("Channel added!");
    } catch (error: any) {
      await message.channel.send(`Error: \`\`\`${error.message}\`\`\``);
    } finally {
      return;
    }
  }

  if (command === "remove-channel") {
    const channel = message.channel;
    if (channel.type !== ChannelType.GuildText) return;

    try {
      QUERIES.DELETE.run(message.guildId, message.channelId);
      await message.channel.send("Channel removed!");
    } catch (error: any) {
      await message.channel.send(`Error: \`\`\`${error.message}\`\`\``);
    } finally {
      return;
    }
  }
});

client.login(process.env.TOKEN);
