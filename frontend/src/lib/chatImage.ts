/**
 * Prepares an image attached to the chat (image → text with Gemini). Socket.io frames are limited
 * to 1 MB, so the picture is redrawn as a JPEG small enough to travel, but large enough for the AI
 * to read handwriting. A much smaller thumbnail is stored with the message so the room sees it.
 */
export interface PreparedChatImage {
  /** Base64 without the data-URL prefix (what the server forwards to Gemini). */
  data: string;
  mediaType: 'image/jpeg';
  /** Small JPEG data URL shown in the chat bubble. */
  thumb: string;
}

/** Below the server limit (900 000 base64 chars) with some margin. */
const MAX_BASE64 = 800_000;
const START_SIDE = 1600;
const THUMB_SIDE = 320;

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen.'));
    };
    img.src = url;
  });
}

function toJpeg(img: HTMLImageElement, maxSide: number, quality: number): string {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('El navegador no permite procesar la imagen.');
  ctx.fillStyle = '#fff'; // transparent PNGs would turn black in JPEG
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

export async function prepareChatImage(file: Blob): Promise<PreparedChatImage> {
  if (!file.type.startsWith('image/')) throw new Error('El archivo no es una imagen.');
  const img = await loadImage(file);

  let side = START_SIDE;
  let quality = 0.85;
  let dataUrl = toJpeg(img, side, quality);
  // Shrink until it fits the socket frame.
  while (dataUrl.length > MAX_BASE64 && side > 400) {
    side = Math.round(side * 0.8);
    quality = Math.max(0.6, quality - 0.05);
    dataUrl = toJpeg(img, side, quality);
  }
  if (dataUrl.length > MAX_BASE64) throw new Error('La imagen es demasiado grande.');

  return {
    data: dataUrl.slice(dataUrl.indexOf(',') + 1),
    mediaType: 'image/jpeg',
    thumb: toJpeg(img, THUMB_SIDE, 0.7),
  };
}
