import { SeededRandom } from '../../utils/SeededRandom';

/**
 * Simple 2D value noise implementation for procedural generation.
 * 
 * This is not true Perlin noise, but a gradient-based value noise
 * that produces smooth, natural-looking patterns suitable for
 * terrain generation and other procedural content.
 * 
 * @example
 * ```typescript
 * const noise = new ValueNoise2D(12345);
 * const value = noise.get(10.5, 20.3); // Returns value in [0, 1]
 * const octaveValue = noise.octave(10.5, 20.3, 4, 0.5); // Multi-octave
 * ```
 */
export class ValueNoise2D {
  private readonly permutation: number[];

  constructor(seed: number) {
    const rng = new SeededRandom(seed);
    this.permutation = Array.from({ length: 256 }, (_, i) => i);
    rng.shuffle(this.permutation);
    // Duplicate to avoid overflow checks
    this.permutation = [...this.permutation, ...this.permutation];
  }

  /**
   * Gets noise value at the given coordinates.
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Noise value in range [0, 1]
   */
  get(x: number, y: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    
    const xf = x - xi;
    const yf = y - yi;

    // Get corner values
    const v00 = this.gradient(xi, yi);
    const v10 = this.gradient(xi + 1, yi);
    const v01 = this.gradient(xi, yi + 1);
    const v11 = this.gradient(xi + 1, yi + 1);

    // Smoothstep interpolation
    const u = this.fade(xf);
    const v = this.fade(yf);

    // Bilinear interpolation
    const x0 = this.lerp(v00, v10, u);
    const x1 = this.lerp(v01, v11, u);
    
    return this.lerp(x0, x1, v);
  }

  /**
   * Gets multi-octave noise (fractal Brownian motion).
   * Produces more natural, detailed patterns.
   * 
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param octaves - Number of octaves (layers)
   * @param persistence - Amplitude multiplier per octave (typically 0.5)
   * @param lacunarity - Frequency multiplier per octave (typically 2.0)
   * @returns Noise value (normalized to approximately [0, 1])
   */
  octave(
    x: number,
    y: number,
    octaves: number = 4,
    persistence: number = 0.5,
    lacunarity: number = 2.0
  ): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.get(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return total / maxValue;
  }

  /**
   * Gets noise value with custom range.
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param min - Minimum output value
   * @param max - Maximum output value
   */
  getRange(x: number, y: number, min: number, max: number): number {
    const value = this.get(x, y);
    return min + value * (max - min);
  }

  private gradient(x: number, y: number): number {
    const hash = this.permutation[(x & 255) + this.permutation[y & 255]];
    // Map hash to [0, 1]
    return hash / 255;
  }

  private fade(t: number): number {
    // Smoothstep: 6t^5 - 15t^4 + 10t^3
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }
}

/**
 * Creates a simple 2D noise function from a seed.
 * Convenience wrapper around ValueNoise2D.
 */
export function createNoise2D(seed: number): (x: number, y: number) => number {
  const noise = new ValueNoise2D(seed);
  return (x, y) => noise.get(x, y);
}
