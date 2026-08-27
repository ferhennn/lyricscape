export const JAMENDO_PREFIX = "jamendo_";

export function isJamendoId(songId: string): boolean {
  return songId.startsWith(JAMENDO_PREFIX);
}

export function jamendoId(songId: string): string {
  return isJamendoId(songId) ? songId.slice(JAMENDO_PREFIX.length) : songId;
}
