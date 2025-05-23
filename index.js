import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, Events } from 'discord.js';
import fetch from 'node-fetch';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Reaction, Partials.Channel],
});

const { BOT_TOKEN, HUB_CHANNEL_ID, MAKE_WEBHOOK_URL, BOT_USER_ID } = process.env;

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (msg) => {
  console.log('💡DEBUG messageCreate:', message.author.tag, message.content);
  if (msg.channelId !== HUB_CHANNEL_ID || msg.author.bot) return;
  if (msg.mentions.roles.size > 0) {
    await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'new',
        messageId: msg.id,
        content: msg.content,
        timestamp: msg.createdAt.toISOString(),
        roleIds: [...msg.mentions.roles.keys()],
      }),
    });
  }
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
  // if the reaction or its message is partial, fetch the full data
  if (reaction.partial) {
    try { await reaction.fetch(); }
    catch (err) { console.error('Failed to fetch reaction:', err); return; }
  }
  const msg = reaction.message;
  if (msg.partial) {
    try { await msg.fetch(); }
    catch (err) { console.error('Failed to fetch message:', err); return; }
  }
  if (user.id === BOT_USER_ID) return;
  if (reaction.emoji.name === '💯') {
    await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'done',
        messageId: msg.id,
        channelId: msg.channelId,
        content: msg.content,
        timestamp: new Date().toISOString(),
        originalTimestamp: msg.createdAt.toISOString()
      }),
    });
  }
});


client.login(BOT_TOKEN); 