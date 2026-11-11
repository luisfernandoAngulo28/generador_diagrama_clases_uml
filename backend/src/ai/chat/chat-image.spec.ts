import { describe, expect, it } from 'vitest';
import { validImage, type ChatSendPayload } from './chat.gateway.js';

const base: ChatSendPayload = { diagramId: 'd1', text: 'transcríbela' };

describe('validImage (imagen adjunta al chat)', () => {
  it('sin imagen no hay nada que validar', () => {
    expect(validImage(base)).toBeUndefined();
  });

  it('acepta una imagen bien formada', () => {
    const image = { data: '/9j/4AAQSkZJRg==', mediaType: 'image/jpeg' as const };
    expect(validImage({ ...base, image })).toEqual(image);
  });

  it('rechaza un tipo que no es imagen', () => {
    const image = { data: 'AAAA', mediaType: 'application/pdf' as never };
    expect(validImage({ ...base, image })).toBeNull();
  });

  it('rechaza una imagen demasiado grande para el socket', () => {
    const image = { data: 'A'.repeat(900_001), mediaType: 'image/jpeg' as const };
    expect(validImage({ ...base, image })).toBeNull();
  });

  it('rechaza datos que no son base64', () => {
    const image = { data: '<script>alert(1)</script>', mediaType: 'image/png' as const };
    expect(validImage({ ...base, image })).toBeNull();
  });
});
