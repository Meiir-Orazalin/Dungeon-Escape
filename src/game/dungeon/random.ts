export class SeededRandom {
  private state: number;

  public constructor(initialState: number) {
    if (!Number.isFinite(initialState)) {
      throw new TypeError("The PRNG state must be finite.");
    }

    this.state = initialState >>> 0;
  }

  public next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000;
  }

  public integer(minimum: number, maximum: number): number {
    if (!Number.isInteger(minimum) || !Number.isInteger(maximum) || minimum > maximum) {
      throw new RangeError("PRNG integer bounds must be ordered integers.");
    }

    return minimum + Math.floor(this.next() * (maximum - minimum + 1));
  }

  public choice<T>(values: readonly T[]): T {
    if (values.length === 0) {
      throw new RangeError("PRNG choice requires at least one value.");
    }

    return values[this.integer(0, values.length - 1)] as T;
  }

  public boolean(probability = 0.5): boolean {
    if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
      throw new RangeError("PRNG boolean probability must be between zero and one.");
    }

    return this.next() < probability;
  }

  public shuffle<T>(values: readonly T[]): T[] {
    const shuffled = [...values];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = this.integer(0, index);
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex] as T, shuffled[index] as T];
    }

    return shuffled;
  }
}
