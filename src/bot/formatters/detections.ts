import type { Detection } from '../../birdweather/types.js';
import { formatDetectionTime } from '../../utils/dates.js';
import { formatAsPercent, formatScore } from '../../utils/numbers.js';
import { escapeTelegramHtml, telegramHtmlLink } from '../../utils/telegramHtml.js';
import { stationBirdweatherUrl } from '../../utils/stationId.js';
import { Markup } from 'telegraf';
import type { InlineKeyboardMarkup } from 'telegraf/types';

export interface DetectionFormatOptions {
  /** Shown above the species block (e.g. "New detection"). */
  title?: string;
  includeSoundscapeLink?: boolean;
}

function formatMetrics(d: Detection): string | null {
  const parts = [
    d.score != null ? `Score ${formatScore(d.score)}` : null,
    d.confidence != null ? `Confidence ${formatAsPercent(d.confidence)}` : null,
    d.probability != null ? `Probability ${formatAsPercent(d.probability)}` : null,
  ].filter((p): p is string => p != null);
  return parts.length ? parts.join(' · ') : null;
}

function formatFooterLinks(d: Detection, includeSoundscape: boolean): string | null {
  const links = [
    includeSoundscape && d.soundscapeUrl
      ? telegramHtmlLink('🔊 Listen', d.soundscapeUrl)
      : null,
    d.species.birdweatherUrl ? telegramHtmlLink('BirdWeather', d.species.birdweatherUrl) : null,
    d.species.ebirdUrl ? telegramHtmlLink('eBird', d.species.ebirdUrl) : null,
    d.species.macaulayUrl ? telegramHtmlLink('Macaulay', d.species.macaulayUrl) : null,
  ].filter((l): l is string => l != null);
  return links.length ? links.join(' · ') : null;
}

export function formatDetectionHtml(
  d: Detection,
  options: DetectionFormatOptions = {},
): string {
  const { title, includeSoundscapeLink = true } = options;
  const common = escapeTelegramHtml(d.species.commonName);
  const scientific = escapeTelegramHtml(d.species.scientificName);
  const lines: string[] = [];

  if (title) lines.push(`<b>${escapeTelegramHtml(title)}</b>`, '');
  lines.push(`<b>${common}</b>`, `<i>${scientific}</i>`);

  const when = formatDetectionTime(d.detectedAt);
  if (d.station?.id) {
    const stationUrl = stationBirdweatherUrl(d.station.id);
    const label = d.station.name ? escapeTelegramHtml(d.station.name) : 'Station';
    lines.push(`${when} · ${telegramHtmlLink(label, stationUrl)}`);
  } else if (d.station?.name) {
    lines.push(`${when} · ${escapeTelegramHtml(d.station.name)}`);
  } else {
    lines.push(when);
  }

  const metrics = formatMetrics(d);
  if (metrics) lines.push(metrics);

  if (d.rarityNote) lines.push(escapeTelegramHtml(d.rarityNote));

  const footer = formatFooterLinks(d, includeSoundscapeLink);
  if (footer) {
    lines.push('');
    lines.push(footer);
  }

  return lines.join('\n');
}

export function detectionReplyMarkup(
  d: Detection,
  includeSoundscape = true,
): InlineKeyboardMarkup | undefined {
  const row = [
    includeSoundscape && d.soundscapeUrl
      ? Markup.button.url('🔊 Listen', d.soundscapeUrl)
      : null,
    d.species.birdweatherUrl ? Markup.button.url('BirdWeather', d.species.birdweatherUrl) : null,
    d.species.ebirdUrl ? Markup.button.url('eBird', d.species.ebirdUrl) : null,
    d.species.macaulayUrl ? Markup.button.url('Macaulay', d.species.macaulayUrl) : null,
  ].filter((b): b is NonNullable<typeof b> => b != null);

  if (!row.length) return undefined;
  return Markup.inlineKeyboard([row]).reply_markup;
}

/** Plain-text fallback (e.g. logs). */
export const formatDetection = (d: Detection): string =>
  formatDetectionHtml(d).replace(/<[^>]+>/g, '');
