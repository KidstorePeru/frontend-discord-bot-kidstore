// Temporada de Fortnite que se muestra en la portada (textos en i18n.ts:
// land.season y land.season.name).
//
// Al cambiar de temporada: actualizar esos dos textos (ES y EN) y SEASON_ENDS.
// Pasada SEASON_ENDS la insignia se oculta sola: es mejor no mostrar nada que
// anunciar una temporada que ya terminó.
//
// Capítulo 7, Temporada 4 «Override»: del 20 de agosto al 1 de noviembre de
// 2026 (hora del Este de EE. UU.). 09:00 UTC = 04:00 en Lima, cuando Epic
// suele apagar los servidores para el cambio de temporada.
export const SEASON_ENDS = '2026-11-01T09:00:00Z';

export function isSeasonCurrent(now: Date = new Date(), ends: string = SEASON_ENDS): boolean {
  const end = Date.parse(ends);
  return Number.isNaN(end) || now.getTime() < end;
}
