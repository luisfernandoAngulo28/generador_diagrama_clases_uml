import { toPng, toSvg } from 'html-to-image';
import { getViewportForBounds, type Rect } from '@xyflow/react';

const MARGIN = 80;
const CANVAS_BACKGROUND = '#0a0a0f';

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function captureDiagram(bounds: Rect | null, format: 'png' | 'svg'): Promise<string> {
  const viewportEl = document.querySelector<HTMLElement>('.react-flow__viewport');
  if (!viewportEl || !bounds) {
    throw new Error('No hay clases en el diagrama todavía.');
  }

  const width = Math.round(bounds.width + MARGIN * 2);
  const height = Math.round(bounds.height + MARGIN * 2);
  const viewport = getViewportForBounds(bounds, width, height, 0.5, 2, '40px');

  const options = {
    backgroundColor: CANVAS_BACKGROUND,
    width,
    height,
    pixelRatio: format === 'png' ? 2 : 1,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    },
  };

  return format === 'png' ? toPng(viewportEl, options) : toSvg(viewportEl, options);
}

export async function exportDiagramAsImage(
  bounds: Rect | null,
  format: 'png' | 'svg',
  fileName: string,
): Promise<void> {
  const dataUrl = await captureDiagram(bounds, format);
  downloadDataUrl(dataUrl, `${fileName}.${format}`);
}
