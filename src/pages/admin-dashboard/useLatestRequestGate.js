import { useCallback, useMemo, useRef } from 'react'

export default function useLatestRequestGate() {
  const requestIdRef = useRef(0)

  const nextRequestId = useCallback(() => {
    requestIdRef.current += 1
    return requestIdRef.current
  }, [])

  const isCurrentRequest = useCallback((requestId) => (
    requestIdRef.current === requestId
  ), [])

  return useMemo(() => ({
    isCurrentRequest,
    nextRequestId,
  }), [isCurrentRequest, nextRequestId])
}
