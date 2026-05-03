import { useMemo, useState } from 'react'

type BusyActions = Record<string, boolean>

export function useActionState() {
  const [busyActions, setBusyActions] = useState<BusyActions>({})

  const startAction = (actionName: string) => {
    setBusyActions((current) => ({ ...current, [actionName]: true }))
  }

  const finishAction = (actionName: string) => {
    setBusyActions((current) => ({ ...current, [actionName]: false }))
  }

  const runAction = async <T>(actionName: string, task: () => Promise<T> | T) => {
    startAction(actionName)
    try {
      return await task()
    } finally {
      finishAction(actionName)
    }
  }

  const isBusy = useMemo(
    () => Object.values(busyActions).some(Boolean),
    [busyActions],
  )

  return {
    busyActions,
    isBusy,
    startAction,
    finishAction,
    runAction,
  }
}
