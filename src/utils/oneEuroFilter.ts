/**
 * One Euro Filter implementation in TypeScript
 * A noise reduction filter for interactive systems (e.g., gesture tracking).
 */

export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xPrev: number | null;
  private dxPrev: number | null;
  private tPrev: number | null;

  constructor(minCutoff: number = 1.0, beta: number = 0.0, dCutoff: number = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.xPrev = null;
    this.dxPrev = null;
    this.tPrev = null;
  }

  private alpha(cutoff: number, dt: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  public filter(x: number, t: number): number {
    if (this.tPrev === null || this.xPrev === null || this.dxPrev === null) {
      this.tPrev = t;
      this.xPrev = x;
      this.dxPrev = 0;
      return x;
    }

    const dt = t - this.tPrev;
    if (dt <= 0) {
      return x; // prevent division by zero or negative time
    }

    let dx = (x - this.xPrev) / dt;
    const edx = this.alpha(this.dCutoff, dt) * dx + (1 - this.alpha(this.dCutoff, dt)) * this.dxPrev;
    
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    const result = this.alpha(cutoff, dt) * x + (1 - this.alpha(cutoff, dt)) * this.xPrev;

    this.tPrev = t;
    this.xPrev = result;
    this.dxPrev = edx;

    return result;
  }
}
