/**
 * Observes container element size changes and debounces chart resize calls.
 */
export class ChartResizeController {
  private readonly observer: ResizeObserver
  private readonly onResize: () => void
  private readonly delayMs: number
  private resizeTimeout: number | null = null

  constructor(targetEl: HTMLElement, onResize: () => void, delayMs = 100) {
    this.onResize = onResize
    this.delayMs = delayMs
    this.observer = new ResizeObserver((_entries) => {
      this.trigger()
    })
    this.observer.observe(targetEl)
  }

  public trigger(): void {
    if (this.resizeTimeout !== null) {
      window.clearTimeout(this.resizeTimeout)
    }
    this.resizeTimeout = window.setTimeout(() => {
      this.resizeTimeout = null
      this.onResize()
    }, this.delayMs)
  }

  public disconnect(): void {
    if (this.resizeTimeout !== null) {
      window.clearTimeout(this.resizeTimeout)
      this.resizeTimeout = null
    }
    this.observer.disconnect()
  }
}
