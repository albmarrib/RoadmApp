import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useOnboardingStore = create(
  persist(
    (set) => ({
      hasSeenMapTooltip: false,
      hasSeenPackingTooltip: false,
      hasSeenExpensesTooltip: false,
      hasSeenDocsTooltip: false,

      markTooltipAsSeen: (tooltipId) => 
        set((state) => ({ ...state, [`hasSeen${tooltipId}Tooltip`]: true })),
        
      resetOnboarding: () => set({
        hasSeenMapTooltip: false,
        hasSeenPackingTooltip: false,
        hasSeenExpensesTooltip: false,
        hasSeenDocsTooltip: false,
      })
    }),
    {
      name: 'roadmapp-onboarding-storage', // name of the item in the storage (must be unique)
    }
  )
);
