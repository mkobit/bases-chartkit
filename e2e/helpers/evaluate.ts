import type { App } from 'obsidian'
import type { Page } from '@playwright/test'

export async function evaluateObsidian<T>(page: Page, fn: (app: App) => T | Promise<T>): Promise<T> {
  const fnSrc = fn.toString()

  return page.evaluate((src) => {
    const fnObj = new Function(`return (${src})`)() as (app: App) => T | Promise<T>
    return fnObj((activeWindow as unknown as { app: App }).app)
  }, fnSrc)
}

export async function evaluateObsidianWith<T, A>(page: Page, fn: (app: App, args: A) => T | Promise<T>, args: A): Promise<T> {
  const fnSrc = fn.toString()

  return page.evaluate(([src, fnArgs]) => {
    const fnObj = new Function(`return (${src})`)() as (app: App, a: A) => T | Promise<T>
    return fnObj((activeWindow as unknown as { app: App }).app, fnArgs as A)
  }, [fnSrc, args] as const)
}
