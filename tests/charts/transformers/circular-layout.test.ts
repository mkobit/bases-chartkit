import { describe, expect, it } from 'bun:test'
import { resolveCircularLayout } from '../../../src/charts/transformers/circular-layout'

describe('resolveCircularLayout', () => {
  it('returns default center and radius when no chrome is configured', () => {
    expect(resolveCircularLayout()).toEqual({
      center: ['50%', '50%'],
      radius: '75%',
    })
  })

  it('shifts center horizontally and shrinks radius for left/right legends', () => {
    expect(resolveCircularLayout({ legend: true, legendPosition: 'right' })).toEqual({
      center: ['42%', '50%'],
      radius: '62%',
    })
    expect(resolveCircularLayout({ legend: true, legendPosition: 'left' }, { sideLegendRadius: '55%' })).toEqual({
      center: ['58%', '50%'],
      radius: '55%',
    })
  })

  it('balances center and shrinks radius when both top subtitle and bottom legend are present', () => {
    expect(resolveCircularLayout({
      title: 'Server load',
      description: 'Angle is time-of-day',
      legend: true,
      legendPosition: 'bottom',
    })).toEqual({
      center: ['50%', '54%'],
      radius: '58%',
    })
  })

  it('shrinks radius when both top legend and bottom visualMap are present', () => {
    expect(resolveCircularLayout(
      { legend: true, legendPosition: 'top' },
      { hasBottomVisualMap: true },
    )).toEqual({
      center: ['50%', '50%'],
      radius: '60%',
    })
  })

  it('shifts center down when only top chrome is present', () => {
    expect(resolveCircularLayout({ legend: true, legendPosition: 'top' })).toEqual({
      center: ['50%', '54%'],
      radius: '66%',
    })
    expect(resolveCircularLayout({
      title: 'Title',
      description: 'Subtitle',
      legend: true,
      legendPosition: 'top',
    })).toEqual({
      center: ['50%', '58%'],
      radius: '60%',
    })
  })

  it('shifts center up when only bottom chrome is present', () => {
    expect(resolveCircularLayout({ legend: true, legendPosition: 'bottom' })).toEqual({
      center: ['50%', '46%'],
      radius: '66%',
    })
  })
})
