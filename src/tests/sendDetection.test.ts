import { describe, expect, it, vi } from 'vitest';
import { sendDetection, speciesPhotoUrl } from '../bot/sendDetection.js';

describe('speciesPhotoUrl', () => {
  it('prefers full image over thumbnail', () => {
    expect(
      speciesPhotoUrl({
        commonName: 'Robin',
        scientificName: 'Turdus migratorius',
        imageUrl: 'https://example.com/full.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
      }),
    ).toBe('https://example.com/full.jpg');
  });

  it('falls back to thumbnail when no full image', () => {
    expect(
      speciesPhotoUrl({
        commonName: 'Robin',
        scientificName: 'Turdus migratorius',
        thumbnailUrl: 'https://example.com/thumb.jpg',
      }),
    ).toBe('https://example.com/thumb.jpg');
  });
});

describe('sendDetection', () => {
  it('uses sendPhoto when a species image is available', async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const sendPhoto = vi.fn().mockResolvedValue(undefined);

    await sendDetection(
      { sendMessage, sendPhoto },
      123,
      {
        id: '1',
        species: {
          commonName: 'Robin',
          scientificName: 'Turdus migratorius',
          imageUrl: 'https://example.com/full.jpg',
        },
      },
    );

    expect(sendPhoto).toHaveBeenCalledWith(
      123,
      'https://example.com/full.jpg',
      expect.objectContaining({ caption: expect.stringContaining('Robin') }),
    );
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('uses sendMessage when no species image is available', async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const sendPhoto = vi.fn().mockResolvedValue(undefined);

    await sendDetection(
      { sendMessage, sendPhoto },
      123,
      {
        id: '1',
        species: { commonName: 'Robin', scientificName: 'Turdus migratorius' },
      },
    );

    expect(sendMessage).toHaveBeenCalledOnce();
    expect(sendPhoto).not.toHaveBeenCalled();
  });

  it('falls back to sendMessage when Telegram rejects a species image', async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const sendPhoto = vi.fn().mockRejectedValue(new Error('PHOTO_INVALID'));

    await sendDetection(
      { sendMessage, sendPhoto },
      123,
      {
        id: '1',
        species: {
          commonName: 'Robin',
          scientificName: 'Turdus migratorius',
          imageUrl: 'https://example.com/full.jpg',
        },
      },
    );

    expect(sendPhoto).toHaveBeenCalledOnce();
    expect(sendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining('Robin'),
      expect.objectContaining({ link_preview_options: { is_disabled: true } }),
    );
  });
});
