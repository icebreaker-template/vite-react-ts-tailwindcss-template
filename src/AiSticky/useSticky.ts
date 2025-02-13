import { useEffect, useRef, useState } from 'react'
import { getBottomBoundary, getTargetBottom, getTopPosition } from './utils'

export function useSticky(props: any) {
  const [state, setState] = useState({
    top: 0,
    bottom: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    topBoundary: 0,
    bottomBoundary: Infinity,
    status: 0,
    pos: 0,
    activated: false,
  })

  const scrollTop = useRef(0)
  const skipNextScrollEvent = useRef(false)
  const doc = document

  const updateInitialDimension = () => {
    if (!state.outerElement || !state.innerElement) { return }
    const outerRect = state.outerElement.getBoundingClientRect()
    const innerRect = state.innerElement.getBoundingClientRect()
    const width = outerRect.width || outerRect.right - outerRect.left
    const height = innerRect.height || innerRect.bottom - innerRect.top
    const outerY = outerRect.top + scrollTop.current

    setState(prevState => ({
      ...prevState,
      top: getTopPosition(props.top, null, doc),
      bottom: Math.min(prevState.top + height, winHeight),
      width,
      height,
      x: outerRect.left,
      y: outerY,
      bottomBoundary: getBottomBoundary(props.bottomBoundary, doc),
      topBoundary: outerY,
    }))
  }

  const update = () => {
    let top = scrollTop.current + state.top
    let bottom = scrollTop.current + state.bottom

    if (top <= state.topBoundary) {
      reset()
    }
    else if (bottom >= state.bottomBoundary) {
      release(state.bottomBoundary - state.height)
    }
    else {
      if (state.height > winHeight - state.top) {
        // Sticky should transition from released to fixed state
        if (state.status === 0) { release(state.y) }
        if (state.status === 1) { fix(state.top) }
      }
    }
  }

  const release = (pos: number) => {
    setState({ ...state, status: 1, pos: pos - state.y })
  }

  const fix = (pos: number) => {
    setState({ ...state, status: 2, pos })
  }

  const reset = () => {
    setState({ ...state, status: 0, pos: 0 })
  }

  return { state, updateInitialDimension, update, release, fix, reset }
}
