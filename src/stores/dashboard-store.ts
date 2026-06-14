import { create } from 'zustand'
import type { ComplianceService } from '@/types/api'

interface DashboardStore {
  activeService:         ComplianceService
  activeEntityKey:       string | null
  subscribedServices:    ComplianceService[] | null   // null = probe not yet run
  setService:            (service: ComplianceService) => void
  setEntityKey:          (key: string) => void
  clearEntity:           () => void
  setSubscribedServices: (services: ComplianceService[]) => void
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  activeService:         'sqas',
  activeEntityKey:       null,
  subscribedServices:    null,
  setService:            (service)   => set({ activeService: service, activeEntityKey: null }),
  setEntityKey:          (key)       => set({ activeEntityKey: key }),
  clearEntity:           ()          => set({ activeEntityKey: null }),
  setSubscribedServices: (services)  => set({ subscribedServices: services }),
}))
