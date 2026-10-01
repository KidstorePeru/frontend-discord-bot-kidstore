// Prepara el comprobante antes de subirlo: las fotos del celular (que pueden
// pesar 10 MB o más) se reducen a 2000 px y se pasan a JPEG en el propio
// navegador, así la subida es rápida aunque la conexión sea lenta. El
// servidor igual vuelve a validar y limpiar el archivo.

export const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const TARGET_SIDE = 2000;

export type ProofError = 'unsupported' | 'too_large' | 'unreadable';

export class ProofPrepareError extends Error {
  constructor(public code: ProofError) {
    super(code);
  }
}

export interface PreparedProof {
  blob: Blob;
  name: string;
  isPdf: boolean;
}

async function decodeImage(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file);
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function shrinkImage(file: File): Promise<Blob | null> {
  try {
    const img = await decodeImage(file);
    const scale = Math.min(1, TARGET_SIDE / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff'; // capturas con transparencia
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
  } catch {
    return null;
  }
}

export async function prepareProof(file: File): Promise<PreparedProof> {
  const type = (file.type || '').toLowerCase();
  const isPdf = type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (isPdf) {
    if (file.size > MAX_PROOF_BYTES) throw new ProofPrepareError('too_large');
    return { blob: file, name: file.name || 'comprobante.pdf', isPdf: true };
  }
  if (!type.startsWith('image/')) throw new ProofPrepareError('unsupported');

  const shrunk = await shrinkImage(file);
  if (shrunk && shrunk.size > 0 && shrunk.size <= MAX_PROOF_BYTES) {
    return { blob: shrunk, name: 'comprobante.jpg', isPdf: false };
  }
  // El navegador no pudo procesarla (formato raro como HEIC): se sube tal cual
  // si es lo bastante liviana; el servidor dirá si no la puede leer.
  if (!shrunk && file.size <= MAX_PROOF_BYTES && /^image\/(jpe?g|png|webp)$/.test(type)) {
    return { blob: file, name: file.name || 'comprobante', isPdf: false };
  }
  throw new ProofPrepareError(shrunk ? 'too_large' : 'unreadable');
}
