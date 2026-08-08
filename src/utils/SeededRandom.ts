/**
 * Deterministic pseudo-random number generator using Linear Congruential Generator (LCG).
 * 
 * This implementation uses the same parameters as Numerical Recipes and is suitable
 * for procedural generation where the same seed must produce the same sequence.
 * 
 * @example
 * ```typescript
 * const rng = new SeededRandom(12345);
 * console.log(rng.next()); // Always the same value for seed 12345
 * console.log(rng.nextInt(1, 10)); // Integer in [1, 10)
 * ```
 */
export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    // Ensure unsigned 32-bit integer
    this.seed = seed >>> 0;
  }

  /**
   * Returns a pseudo-random number in [0, 1).
   */
  next(): number {
    // LCG parameters from Numerical Recipes
    this.seed = (1664525 * this.seed + 1013904223) >>> 0;
    return this.seed / 0x100000000;
  }

  /**
   * Returns a pseudo-random integer in [min, max).
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (exclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  /**
   * Returns a random element from an array.
   * @param arr - Array to choose from
   */
  choice<T>(arr: readonly T[]): T {
    return arr[this.nextInt(0, arr.length)];
  }

  /**
   * Shuffles an array in place using Fisher-Yates algorithm.
   * @param arr - Array to shuffle
   * @returns The same array, shuffled
   */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Returns a boolean with the given probability of being true.
   * @param probability - Probability of returning true (0 to 1)
   */
  chance(probability: number): boolean {
    return this.next() < probability;
  }

  /**
   * Returns a normally distributed random number using Box-Muller transform.
   * @param mean - Mean of the distribution (default: 0)
   * @param stddev - Standard deviation (default: 1)
   */
  normal(mean = 0, stddev = 1): number {
    const u1 = this.next();
    const u2 = this.next();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stddev + mean;
  }

  /**
   * Creates a new SeededRandom with a derived seed.
   * Useful for sub-generators that need independent random sequences.
   * @param offset - Offset to apply to the current seed
   */
  fork(offset: number): SeededRandom {
    // Mix seeds using a good hash function
    const newSeed = ((this.seed >>> 0) ^ ((offset * 2654435761) >>> 0)) >>> 0;
    return new SeededRandom(newSeed);
  }

  /**
   * Gets the current seed value.
   */
  getSeed(): number {
    return this.seed >>> 0;
  }
}

/**
 * Creates a deterministic seed from coordinates.
 * Uses a simple hash function that produces different seeds for different positions.
 */
export function createSeedFromCoords(x: number, y: number, baseSeed = 0): number {
  // Simple but effective coordinate-based seed mixing
  let seed = baseSeed;
  seed ^= (x * 73856093) >>> 0;
  seed ^= (y * 19349663) >>> 0;
  seed ^= 0x9E3779B9; // Golden ratio constant
  return seed >>> 0;
}
