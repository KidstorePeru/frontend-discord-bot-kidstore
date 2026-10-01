import { describe, expect, it } from 'vitest';
import { SEASON_ENDS, isSeasonCurrent } from './season';

describe('isSeasonCurrent', () => {
  it('muestra la temporada mientras no termina', () => {
    expect(isSeasonCurrent(new Date('2026-10-01T12:00:00Z'))).toBe(true);
    expect(isSeasonCurrent(new Date(Date.parse(SEASON_ENDS) - 1))).toBe(true);
  });

  it('la oculta en cuanto termina, para no anunciar una temporada vieja', () => {
    expect(isSeasonCurrent(new Date(SEASON_ENDS))).toBe(false);
    expect(isSeasonCurrent(new Date('2026-12-01T00:00:00Z'))).toBe(false);
  });

  it('una fecha mal escrita no oculta la insignia', () => {
    expect(isSeasonCurrent(new Date('2030-01-01T00:00:00Z'), 'fecha-invalida')).toBe(true);
  });
});
