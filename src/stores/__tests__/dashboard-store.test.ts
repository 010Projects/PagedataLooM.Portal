import { describe, it, expect, beforeEach } from 'vitest'
import { useDashboardStore } from '@/stores/dashboard-store'

describe('useDashboardStore', () => {
  beforeEach(() => {
    useDashboardStore.setState({ activeService: 'sqas', activeEntityKey: null, subscribedServices: null })
  })

  it('defaults to sqas with no entity selected', () => {
    expect(useDashboardStore.getState().activeService).toBe('sqas')
    expect(useDashboardStore.getState().activeEntityKey).toBeNull()
  })

  it('setEntityKey selects an entity', () => {
    useDashboardStore.getState().setEntityKey('RSC-COMP-001')
    expect(useDashboardStore.getState().activeEntityKey).toBe('RSC-COMP-001')
  })

  it('setService clears the selected entity', () => {
    useDashboardStore.getState().setEntityKey('RSC-COMP-001')
    useDashboardStore.getState().setService('bbbee')
    expect(useDashboardStore.getState().activeService).toBe('bbbee')
    expect(useDashboardStore.getState().activeEntityKey).toBeNull()
  })

  it('clearEntity deselects without changing service', () => {
    useDashboardStore.getState().setEntityKey('RSC-COMP-001')
    useDashboardStore.getState().clearEntity()
    expect(useDashboardStore.getState().activeEntityKey).toBeNull()
    expect(useDashboardStore.getState().activeService).toBe('sqas')
  })

  describe('subscribedServices', () => {
    it('starts as null (probe not yet run)', () => {
      expect(useDashboardStore.getState().subscribedServices).toBeNull()
    })

    it('setSubscribedServices stores the list', () => {
      useDashboardStore.getState().setSubscribedServices(['sqas'])
      expect(useDashboardStore.getState().subscribedServices).toEqual(['sqas'])
    })

    it('empty array means no subscriptions (not null)', () => {
      useDashboardStore.getState().setSubscribedServices([])
      expect(useDashboardStore.getState().subscribedServices).toEqual([])
      expect(useDashboardStore.getState().subscribedServices).not.toBeNull()
    })
  })
})
