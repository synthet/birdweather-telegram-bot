import { createStationBirdweatherService } from '../birdweather/service.js';
import { getAccount, updateStationNames } from '../db/accounts.js';

export async function refreshStationNameForChat(chatId: number): Promise<string | null> {
  const account = getAccount(chatId);
  if (!account) return null;

  try {
    const station = await createStationBirdweatherService(account.station_token).station(
      account.station_id,
    );
    const name = station?.name ?? null;
    if (name) updateStationNames(chatId, account.station_id, name);
    return name;
  } catch {
    return account.station_name;
  }
}
