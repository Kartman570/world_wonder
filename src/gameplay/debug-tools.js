export const DEBUG_GOLD = 1_000_000;
export function grantDebugGold(w) {
  if (!w.debugMode) return { ok: false, message: 'Available only in debug mode.' };
  w.player.inventory.gold = (w.player.inventory.gold || 0) + DEBUG_GOLD;
  return { ok: true, message: 'Added 1,000,000 gold.' };
}
