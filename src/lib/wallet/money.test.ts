import { describe, expect, test } from 'vitest'
import { formatUsdFromCents, sumLedgerAmountsCents } from '@/lib/wallet/money'

describe('formatUsdFromCents', () => {
  test('formats whole dollars without a decimal part', () => {
    expect(formatUsdFromCents(2500)).toBe('$25')
  })

  test('pads the cents remainder to two digits', () => {
    expect(formatUsdFromCents(2505)).toBe('$25.05')
  })

  test('rejects non-integer input', () => {
    expect(() => formatUsdFromCents(10.5)).toThrow()
  })
})

describe('sumLedgerAmountsCents', () => {
  test('sums integer cents and skips null entries', () => {
    expect(sumLedgerAmountsCents([1000, null, -250, undefined])).toBe(750)
  })
})
