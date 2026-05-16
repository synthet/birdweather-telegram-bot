import { Telegraf } from 'telegraf';
import { env } from '../config/env.js';
import { birdweatherService } from '../birdweather/service.js';
import { db } from '../db/client.js';
import { formatStation } from './formatters/stations.js';
import { formatDetection } from './formatters/detections.js';
import { formatSpecies } from './formatters/species.js';

export const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);
const ensureSettings = (chatId:number) => db.prepare('INSERT OR IGNORE INTO chat_settings(chat_id) VALUES(?)').run(chatId);

bot.command('start', (ctx)=>ctx.reply('BirdWeather bot: monitor stations and detections. Use /help for commands.'));
bot.command('help', (ctx)=>ctx.reply('/station <id>\n/stations <query>\n/recent <id>\n/species <name>\n/top <id>\n/subscribe_station <id>\n/unsubscribe_station <id>\n/subscriptions\n/settings\n/set_score <num>\n/set_confidence <num>\n/set_probability <num>\n/pause\n/resume'));
bot.command('station', async(ctx)=>{const id=ctx.payload.trim(); if(!id)return ctx.reply('Usage: /station <station_id>'); const st=await birdweatherService.station(id); return ctx.reply(st?formatStation(st):'Station not found');});
bot.command('stations', async(ctx)=>{const q=ctx.payload.trim(); if(!q)return ctx.reply('Usage: /stations <query>'); const list=await birdweatherService.stations(q,10); return ctx.reply(list.length?list.map(formatStation).join('\n\n'):'No stations found');});
bot.command('recent', async(ctx)=>{const id=ctx.payload.trim(); if(!id)return ctx.reply('Usage: /recent <station_id>'); const list=await birdweatherService.detections(id,10); return ctx.reply(list.length?list.map(formatDetection).join('\n\n'):'No detections found');});
bot.command('species', async(ctx)=>{const q=ctx.payload.trim(); if(!q)return ctx.reply('Usage: /species <name>'); const list=await birdweatherService.searchSpecies(q); return ctx.reply(list.slice(0,10).map(formatSpecies).join('\n\n') || 'No species found');});
bot.command('top', async(ctx)=>{const id=ctx.payload.trim(); if(!id)return ctx.reply('Usage: /top <station_id>'); const list=await birdweatherService.topSpecies(id,10); return ctx.reply(list.length?list.map((x,i)=>`${i+1}. ${x.species.commonName} (${x.species.scientificName}) - ${x.count}`).join('\n'):'No top species data');});
bot.command('subscribe_station', async(ctx)=>{const id=ctx.payload.trim(); const chatId=ctx.chat.id; if(!id)return ctx.reply('Usage: /subscribe_station <station_id>'); ensureSettings(chatId); const st=await birdweatherService.station(id); db.prepare('INSERT OR REPLACE INTO station_subscriptions(chat_id,station_id,station_name,active) VALUES(?,?,?,1)').run(chatId,id,st?.name ?? null); return ctx.reply(`Subscribed to station ${id}`);});
bot.command('unsubscribe_station', (ctx)=>{const id=ctx.payload.trim(); if(!id)return ctx.reply('Usage: /unsubscribe_station <station_id>'); db.prepare('DELETE FROM station_subscriptions WHERE chat_id=? AND station_id=?').run(ctx.chat.id,id); return ctx.reply(`Unsubscribed from ${id}`);});
bot.command('subscriptions', (ctx)=>{const rows=db.prepare('SELECT station_id, station_name FROM station_subscriptions WHERE chat_id=? AND active=1').all(ctx.chat.id) as any[]; return ctx.reply(rows.length?rows.map(r=>`${r.station_id} - ${r.station_name ?? 'Unknown'}`).join('\n'):'No subscriptions');});
bot.command('settings', (ctx)=>{ensureSettings(ctx.chat.id); const s:any=db.prepare('SELECT * FROM chat_settings WHERE chat_id=?').get(ctx.chat.id); return ctx.reply(`score>=${s.min_score}\nconfidence>=${s.min_confidence}\nprobability>=${s.min_probability}\ninclude soundscape=${!!s.include_soundscape_links}\npaused=${!!s.paused}`);});
for (const field of ['score','confidence','probability'] as const) { bot.command(`set_${field}`, (ctx)=>{ensureSettings(ctx.chat.id); const n=Number(ctx.payload.trim()); if(Number.isNaN(n)) return ctx.reply(`Usage: /set_${field} <number>`); db.prepare(`UPDATE chat_settings SET min_${field}=?, updated_at=CURRENT_TIMESTAMP WHERE chat_id=?`).run(n,ctx.chat.id); return ctx.reply(`Updated ${field} threshold to ${n}`);}); }
bot.command('pause', (ctx)=>{ensureSettings(ctx.chat.id); db.prepare('UPDATE chat_settings SET paused=1 WHERE chat_id=?').run(ctx.chat.id); return ctx.reply('Notifications paused');});
bot.command('resume', (ctx)=>{ensureSettings(ctx.chat.id); db.prepare('UPDATE chat_settings SET paused=0 WHERE chat_id=?').run(ctx.chat.id); return ctx.reply('Notifications resumed');});

bot.catch((err, ctx)=>{ void ctx.reply('Something went wrong. Please try again.'); console.error(err); });
