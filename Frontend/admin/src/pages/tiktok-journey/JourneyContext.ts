import { createContext, useContext } from 'react'
import type { StepBodyProps } from './types'

/**
 * JourneyContext exposes the entire wizard state to step components without
 * threading 80+ props through every level. Step files call `useJourney()` and
 * read whatever they need; only the page-level component (`TikTokJourneyPage`)
 * is responsible for assembling and providing the value.
 *
 * The context value reuses the shape of `StepBodyProps` so existing types stay
 * authoritative — once all consumers migrate, `StepBodyProps` can be deleted
 * entirely and `JourneyContextValue` becomes the single source of truth.
 */
export type JourneyContextValue = StepBodyProps

export const JourneyContext = createContext<JourneyContextValue | null>(null)

JourneyContext.displayName = 'JourneyContext'

/**
 * Hook used by step components to read the journey state. Throws if called
 * outside a `<JourneyContext.Provider>` so we surface wiring mistakes loudly.
 */
export function useJourney(): JourneyContextValue {
  const value = useContext(JourneyContext)
  if (!value) {
    throw new Error(
      'useJourney() must be used inside <JourneyContext.Provider>. Did you ' +
        'forget to wrap TikTokStepScreen in <JourneyProvider>?',
    )
  }
  return value
}
