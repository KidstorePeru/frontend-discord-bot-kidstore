import { describe, it, expect, afterEach } from 'vitest';
import { registerSectionFiles, sectionBackground, sectionBackgrounds, sectionKey, shopDay } from './sectionMeta';

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

// Varios fondos por sección ("Portada.jpg", "Portada 2.jpg", "Portada 3.jpg"):
// rotan cada día de tienda (00:00 UTC), como en la tienda oficial.
describe('sectionMeta — fondos que rotan cada día', () => {
  const REAL = import.meta.glob('../../assets/secciones/*.{jpg,jpeg,png,webp,avif}', {
    eager: true, query: '?url', import: 'default',
  }) as Record<string, string>;
  afterEach(() => registerSectionFiles(REAL));

  it('agrupa las variantes con número bajo la misma sección, en orden', () => {
    registerSectionFiles({
      'x/Portada.jpg': '/a/portada-1.jpg',
      'x/Portada 3.jpg': '/a/portada-3.jpg',
      'x/Portada 2.jpg': '/a/portada-2.jpg',
      'x/Look del día (2).png': '/a/look-2.png',
      'x/Look del día.jpg': '/a/look-1.jpg',
      'x/Dominus GT.jpg': '/a/dominus.jpg',
    });
    expect(sectionBackgrounds('PORTADA')).toEqual(['/a/portada-1.jpg', '/a/portada-2.jpg', '/a/portada-3.jpg']);
    expect(sectionBackgrounds('Look del día')).toEqual(['/a/look-1.jpg', '/a/look-2.png']);
    expect(sectionBackgrounds('Dominus GT')).toEqual(['/a/dominus.jpg']);
  });

  it('cambia cada día, recorre todas las variantes y no repite dos días seguidos', () => {
    registerSectionFiles({ 'x/Portada.jpg': '/p1', 'x/Portada 2.jpg': '/p2', 'x/Portada 3.jpg': '/p3' });
    const day = shopDay(Date.UTC(2026, 8, 30, 12));
    const week = Array.from({ length: 6 }, (_, i) => sectionBackground('Portada', day + i));
    expect(new Set(week.slice(0, 3))).toEqual(new Set(['/p1', '/p2', '/p3']));
    for (let i = 1; i < week.length; i++) expect(week[i]).not.toBe(week[i - 1]);
    // El mismo día siempre da el mismo fondo (no cambia al recargar).
    expect(sectionBackground('Portada', day)).toBe(sectionBackground('portada', day));
  });

  it('el día cambia a las 00:00 UTC', () => {
    expect(shopDay(Date.UTC(2026, 8, 30, 23, 59, 59))).toBe(shopDay(Date.UTC(2026, 8, 30, 0, 0, 0)));
    expect(shopDay(Date.UTC(2026, 9, 1, 0, 0, 0))).toBe(shopDay(Date.UTC(2026, 8, 30, 12)) + 1);
  });

  it('una sección con número propio usa su archivo si no hay uno sin número', () => {
    registerSectionFiles({ 'x/Resident Evil 4.jpg': '/re4' });
    expect(sectionBackground('Resident Evil 4')).toBe('/re4');
  });

  it('_por-defecto también admite variantes para secciones sin fondo propio', () => {
    registerSectionFiles({ 'x/_por-defecto.jpg': '/d1', 'x/_por-defecto 2.jpg': '/d2' });
    const day = shopDay(Date.UTC(2026, 8, 30));
    expect(['/d1', '/d2']).toContain(sectionBackground('Sección nueva', day));
  });

  it('con las imágenes reales: Portada tiene 3 fondos, Look del día 3 y Peregrine TT el suyo', () => {
    expect(sectionBackgrounds('Portada')).toHaveLength(3);
    expect(sectionBackgrounds('Look del día')).toHaveLength(3);
    expect(sectionBackgrounds('No te preocupes')).toHaveLength(2);
    expect(sectionBackgrounds('Pasos con estilo')).toHaveLength(2);
    expect(sectionBackground('Peregrine TT')).not.toContain('unrealengine');
  });
});
