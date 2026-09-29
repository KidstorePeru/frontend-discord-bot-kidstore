import { describe, it, expect } from 'vitest';
import { sectionBackground, sectionKey } from './sectionMeta';

// Fondos de sección descubiertos solos desde src/assets/secciones: basta guardar la
// imagen con el nombre de la sección, sin tocar código.
describe('sectionMeta — fondos por nombre de archivo', () => {
  it('encuentra el fondo por el nombre de la sección (el de The Binding of Isaac y el de más vendidos)', () => {
    expect(sectionBackground('The Binding of Isaac')).toMatch(/The(%20| )Binding(%20| )of(%20| )Isaac.*\.jpg/);
    expect(sectionBackground('LO MÁS VENDIDO DE HOY')).toMatch(/\.jpg/);
    expect(sectionBackground('LO MÁS VENDIDO DE HOY')).not.toContain('unrealengine');
  });

  it('no importan mayúsculas, tildes ni signos', () => {
    expect(sectionKey('Resident Evil (!)')).toBe(sectionKey('resident evil'));
    expect(sectionKey('LO MÁS VENDIDO DE HOY')).toBe('lomasvendidodehoy');
    expect(sectionBackground('THE BINDING OF ISAAC')).toBe(sectionBackground('The Binding of Isaac'));
    expect(sectionBackground('lo mas vendido de hoy')).toBe(sectionBackground('LO MÁS VENDIDO DE HOY'));
  });

  it('una sección sin fondo propio usa el de por defecto', () => {
    // Sin _por-defecto.* en la carpeta, es la textura por defecto de la tienda oficial.
    expect(sectionBackground('Sección que no existe 123')).toContain('default-sparks-sectionbg');
  });
});
