import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCoalescedNotifier } from './coalesceStoreNotifications'

describe('KC-0102B createCoalescedNotifier', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('coalesces synchronous bumps into one microtask flush', async () => {
    const notify = vi.fn()
    const { bump, dispose, getFlushCount } = createCoalescedNotifier(notify)

    bump()
    bump()
    bump()
    expect(notify).not.toHaveBeenCalled()

    await Promise.resolve()
    expect(notify).toHaveBeenCalledTimes(1)
    expect(getFlushCount()).toBe(1)

    dispose()
  })

  it('uses trailing window to merge bumps across turns', async () => {
    vi.useFakeTimers()
    const notify = vi.fn()
    const { bump, dispose } = createCoalescedNotifier(notify, { trailingMs: 50 })

    bump()
    await Promise.resolve() // microtask schedules trailing timer
    expect(notify).not.toHaveBeenCalled()

    bump()
    await Promise.resolve()
    expect(notify).not.toHaveBeenCalled()

    vi.advanceTimersByTime(49)
    expect(notify).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(notify).toHaveBeenCalledTimes(1)

    dispose()
  })

  it('does not notify after dispose', async () => {
    const notify = vi.fn()
    const { bump, dispose } = createCoalescedNotifier(notify)
    bump()
    dispose()
    await Promise.resolve()
    expect(notify).not.toHaveBeenCalled()
  })
})
