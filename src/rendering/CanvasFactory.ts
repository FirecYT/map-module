/**
 * Factory for creating canvas elements.
 * 
 * Provides abstraction over canvas creation to support different environments:
 * - Browser (main thread): uses OffscreenCanvas when available, falls back to HTMLCanvasElement
 * - Web Workers: uses OffscreenCanvas
 * - Node.js/Testing: uses mock or returns null
 * 
 * @example
 * ```typescript
 * // Default factory (auto-detects best option)
 * const canvas = createCanvas(512, 512);
 * 
 * // Custom factory for testing
 * const testFactory = () => mockCanvas;
 * ```
 */

export type CanvasType = HTMLCanvasElement | OffscreenCanvas;

/**
 * Factory function type for creating canvas elements.
 */
export type CanvasFactory = (width: number, height: number) => CanvasType | null;

/**
 * Creates a canvas element using the best available method.
 * 
 * Priority:
 * 1. OffscreenCanvas (modern, works in Workers)
 * 2. HTMLCanvasElement (fallback for older browsers)
 * 3. null (if no canvas support, e.g., Node.js)
 * 
 * @param width - Canvas width in pixels
 * @param height - Canvas height in pixels
 * @returns Canvas element or null if not available
 */
export function createCanvas(width: number, height: number): CanvasType | null {
  // Try OffscreenCanvas first (preferred)
  if (typeof OffscreenCanvas !== 'undefined') {
    try {
      return new OffscreenCanvas(width, height);
    } catch (error) {
      console.warn('OffscreenCanvas creation failed, falling back to HTMLCanvasElement:', error);
    }
  }

  // Fallback to HTMLCanvasElement (browser main thread only)
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  // No canvas support (Node.js, SSR, etc.)
  return null;
}

/**
 * Gets the 2D rendering context from a canvas.
 * 
 * @param canvas - Canvas element (OffscreenCanvas or HTMLCanvasElement)
 * @returns 2D rendering context or null if not available
 */
export function getCanvasContext(
  canvas: CanvasType
): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null {
  if (!canvas) return null;
  
  try {
    const ctx = canvas.getContext('2d');
    return ctx;
  } catch (error) {
    console.error('Failed to get canvas context:', error);
    return null;
  }
}

/**
 * Transfers OffscreenCanvas to ImageBitmap for efficient rendering.
 * Only applicable to OffscreenCanvas.
 * 
 * @param canvas - Canvas element
 * @returns ImageBitmap promise or null if not applicable
 */
export async function canvasToImageBitmap(canvas: CanvasType): Promise<ImageBitmap | null> {
  if (canvas instanceof OffscreenCanvas) {
    try {
      return await canvas.transferToImageBitmap();
    } catch (error) {
      console.warn('Failed to transfer OffscreenCanvas to ImageBitmap:', error);
    }
  }
  return null;
}

/**
 * Checks if canvas is OffscreenCanvas.
 */
export function isOffscreenCanvas(canvas: CanvasType): canvas is OffscreenCanvas {
  return typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas;
}

/**
 * Checks if canvas is HTMLCanvasElement.
 */
export function isHTMLCanvasElement(canvas: CanvasType): canvas is HTMLCanvasElement {
  return typeof HTMLCanvasElement !== 'undefined' && canvas instanceof HTMLCanvasElement;
}
