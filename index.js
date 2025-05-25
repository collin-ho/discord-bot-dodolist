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

const {
  BOT_TOKEN,
  HUB_CHANNEL_ID,
  MAKE_WEBHOOK_URL,
  BOT_USER_ID,
  SUMMARY_ROLE_ID,
} = process.env;

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (msg) => {
  console.log('💡DEBUG messageCreate:', msg.author.tag, msg.content);
  if (msg.channelId !== HUB_CHANNEL_ID || msg.author.bot) return;

  const isSummaryTrigger = msg.mentions.roles.has(SUMMARY_ROLE_ID);
  const isNewTrigger     = !isSummaryTrigger && msg.mentions.roles.size > 0;

  if (isSummaryTrigger) {
    const payload = {
      type:        'summary',
      authorId:    msg.author.id,
      channelId:   msg.channelId,
      messageId:   msg.id,
      content:     msg.content,
      timestamp:   msg.createdAt.toISOString(),
      roleIds:     [...msg.mentions.roles.keys()],
    };
    console.log('💡DEBUG summary payload:', payload);
    try {
      const res = await fetch(MAKE_WEBHOOK_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      console.log('💡DEBUG Make response status:', res.status);
      console.log('💡DEBUG Make response body:', await res.text());
    } catch (err) {
      console.error('⚠️ DEBUG fetch error:', err);
    }
  }

  if (isNewTrigger) {
    console.log('💡DEBUG sending new task to Make');
    try {
      const res = await fetch(MAKE_WEBHOOK_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          type:        'new',
          messageId:   msg.id,
          content:     msg.content,
          timestamp:   msg.createdAt.toISOString(),
          roleIds:     [...msg.mentions.roles.keys()],
        }),
      });
      console.log('💡DEBUG Make response status:', res.status);
      console.log('💡DEBUG Make response body:', await res.text());
    } catch (err) {
      console.error('⚠️ DEBUG fetch error:', err);
    }
  }
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
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
    console.log('💡DEBUG reactionCreate:', user.tag, msg.id);
    try {
      const res = await fetch(MAKE_WEBHOOK_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          type:              'done',
          authorId:          user.id,
          channelId:         msg.channelId,
          messageId:         msg.id,
          content:           msg.content,
          timestamp:         new Date().toISOString(),
          originalTimestamp: msg.createdAt.toISOString(),
        }),
      });
      console.log('💡DEBUG Make response status:', res.status);
      console.log('💡DEBUG Make response body:', await res.text());
    } catch (err) {
      console.error('⚠️ DEBUG fetch error:', err);
    }
  }
});

client.login(BOT_TOKEN);
