import type { Telegram } from 'telegraf';
import type { Detection, Species } from '../birdweather/types.js';
import {
  detectionReplyMarkup,
  formatDetectionHtml,
  type DetectionFormatOptions,
} from './formatters/detections.js';

export function speciesPhotoUrl(species: Species): string | undefined {
  return species.imageUrl ?? species.thumbnailUrl;
}

export interface SendDetectionTelegram {
  sendMessage: Telegram['sendMessage'];
  sendPhoto: Telegram['sendPhoto'];
}

export async function sendDetection(
  telegram: SendDetectionTelegram,
  chatId: number,
  detection: Detection,
  options: DetectionFormatOptions = {},
): Promise<void> {
  const includeSoundscape = options.includeSoundscapeLink !== false;
  const caption = formatDetectionHtml(detection, options);
  const reply_markup = detectionReplyMarkup(detection, includeSoundscape);
  const messageExtra = {
    parse_mode: 'HTML' as const,
    link_preview_options: { is_disabled: true },
    ...(reply_markup ? { reply_markup } : {}),
  };
  const photoExtra = {
    parse_mode: 'HTML' as const,
    ...(reply_markup ? { reply_markup } : {}),
  };

  const photoUrl = speciesPhotoUrl(detection.species);
  if (photoUrl) {
    try {
      await telegram.sendPhoto(chatId, photoUrl, { caption, ...photoExtra });
      return;
    } catch {
      // Telegram rejects some remote image URLs; keep the alert deliverable.
    }
  }

  await telegram.sendMessage(chatId, caption, messageExtra);
}
