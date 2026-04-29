import { useMemo, useState } from 'react'

export function useActionState() {
  const [busyActions, setBusyActions] = useState({})

  const startAction = (actionName) => {
    setBusyActions((current) => ({ ...current, [actionName]: true }))
  }

  const finishAction = (actionName) => {
    setBusyActions((current) => ({ ...current, [actionName]: false }))
  }

  const runAction = async (actionName, task) => {
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
