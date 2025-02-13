import classNames from 'classnames'
import React, { useEffect, useRef, useState } from 'react'
import { subscribe } from 'subscribe-ui-event'
import shallowEqual from './shallowequal'

// constants
const STATUS_ORIGINAL = 0
const STATUS_RELEASED = 1
const STATUS_FIXED = 2

let TRANSFORM_PROP = 'transform'

let doc: Document
let docBody: HTMLElement
let docEl: HTMLElement
let canEnableTransforms = true
let M: any
let scrollDelta = 0
let win: Window
let winHeight = -1

interface StickyProps {
  enabled?: boolean
  top?: string | number
  bottomBoundary?: string | number | { value: number, target: string }
  enableTransforms?: boolean
  activeClass?: string
  releasedClass?: string
  innerClass?: string
  innerActiveClass?: string
  className?: string
  onStateChange?: (state: { status: number }) => void
  shouldFreeze?: () => boolean
  innerZ?: string | number
  children: React.ReactNode | ((status: { status: number }) => React.ReactNode)
}

interface StickyState {
  top: number
  bottom: number
  width: number
  height: number
  x: number
  y: number
  topBoundary: number
  bottomBoundary: number
  status: number
  pos: number
  activated: boolean
}

const Sticky: React.FC<StickyProps> = (props) => {
  const [state, setState] = useState<StickyState>({
    top: 0,
    bottom: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    topBoundary: 0,
    bottomBoundary: Infinity,
    status: STATUS_ORIGINAL,
    pos: 0,
    activated: false,
  })

  const outerElement = useRef<HTMLDivElement>(null)
  const innerElement = useRef<HTMLDivElement>(null)

  const [scrollTop, setScrollTop] = useState(-1)
  const skipNextScrollEvent = useRef(false)

  const frozen = props.shouldFreeze ? props.shouldFreeze() : false

  const getTargetHeight = (target: HTMLElement | null) => target?.offsetHeight || 0

  const getTopPosition = (top: number | string | undefined) => {
    if (typeof top === 'string') {
      if (!doc) { doc = document }
      const topTarget = doc.querySelector(top)
      return getTargetHeight(topTarget)
    }
    return top || props.top || 0
  }

  const getTargetBottom = (target: HTMLElement | null) => {
    if (!target) { return -1 }
    const rect = target.getBoundingClientRect()
    return scrollTop + rect.bottom
  }

  const getBottomBoundary = (bottomBoundary: string | number | { value: number, target: string } | undefined) => {
    let boundary = bottomBoundary || props.bottomBoundary
    if (typeof boundary === 'object') {
      boundary = boundary.value || boundary.target || 0
    }

    if (typeof boundary === 'string') {
      if (!doc) { doc = document }
      const bottomBoundaryTarget = doc.querySelector(boundary)
      return getTargetBottom(bottomBoundaryTarget)
    }

    return boundary && boundary > 0 ? boundary : Infinity
  }

  const updateInitialDimension = (options: { top?: number, bottomBoundary?: number } = {}) => {
    if (!outerElement.current || !innerElement.current) { return }

    const outerRect = outerElement.current.getBoundingClientRect()
    const innerRect = innerElement.current.getBoundingClientRect()

    const width = outerRect.width || outerRect.right - outerRect.left
    const height = innerRect.height || innerRect.bottom - innerRect.top
    const outerY = outerRect.top + scrollTop

    setState(prevState => ({
      ...prevState,
      top: getTopPosition(options.top),
      bottom: Math.min(prevState.top + height, winHeight),
      width,
      height,
      x: outerRect.left,
      y: outerY,
      bottomBoundary: getBottomBoundary(options.bottomBoundary),
      topBoundary: outerY,
    }))
  }

  const handleResize = (e: Event, ae: any) => {
    if (props.shouldFreeze && props.shouldFreeze()) { return }
    winHeight = ae.resize.height
    updateInitialDimension()
    update()
  }

  const handleScrollStart = (e: Event, ae: any) => {
    if (frozen) { return }

    if (scrollTop === ae.scroll.top) {
      skipNextScrollEvent.current = true
    }
    else {
      setScrollTop(ae.scroll.top)
      updateInitialDimension()
    }
  }

  const handleScroll = (e: Event, ae: any) => {
    if (skipNextScrollEvent.current) {
      skipNextScrollEvent.current = false
      return
    }

    scrollDelta = ae.scroll.delta
    setScrollTop(ae.scroll.top)
    update()
  }

  const update = () => {
    let disabled = !props.enabled || state.bottomBoundary - state.topBoundary <= state.height || (state.width === 0 && state.height === 0)
    if (disabled) {
      if (state.status !== STATUS_ORIGINAL) {
        reset()
      }
      return
    }

    let delta = scrollDelta
    let top = scrollTop + state.top
    let bottom = scrollTop + state.bottom

    if (top <= state.topBoundary) {
      reset()
    }
    else if (bottom >= state.bottomBoundary) {
      setState(prevState => ({
        ...prevState,
        status: STATUS_RELEASED,
        pos: state.bottomBoundary - state.height - state.y,
      }))
    }
    else {
      if (state.height > winHeight - state.top) {
        if (state.status === STATUS_ORIGINAL) {
          setState(prevState => ({
            ...prevState,
            status: STATUS_RELEASED,
            pos: state.y,
          }))
        }

        if (state.status === STATUS_RELEASED) {
          setState(prevState => ({
            ...prevState,
            status: STATUS_FIXED,
            pos: top,
          }))
        }
      }
      else {
        setState(prevState => ({
          ...prevState,
          status: STATUS_FIXED,
          pos: state.top,
        }))
      }
    }
  }

  const reset = () => {
    setState({ ...state, status: STATUS_ORIGINAL, pos: 0 })
  }

  useEffect(() => {
    if (!win) {
      win = window
      doc = document
      docEl = doc.documentElement
      docBody = doc.body
      winHeight = win.innerHeight || docEl.clientHeight
      M = window.Modernizr
      if (M && M.prefixed) {
        canEnableTransforms = M.csstransforms3d
        TRANSFORM_PROP = M.prefixed('transform')
      }
    }

    setScrollTop(docBody.scrollTop + docEl.scrollTop)

    if (props.enabled) {
      setState({ ...state, activated: true })
      updateInitialDimension()
      update()
    }

    const subscribers = [
      subscribe('scrollStart', handleScrollStart, { useRAF: true }),
      subscribe('scroll', handleScroll, { useRAF: true, enableScrollInfo: true }),
      subscribe('resize', handleResize, { enableResizeInfo: true }),
    ]

    return () => {
      subscribers.forEach(subscriber => subscriber.unsubscribe())
    }
  }, [])

  const innerStyle: React.CSSProperties = {
    position: state.status === STATUS_FIXED ? 'fixed' : 'relative',
    top: state.status === STATUS_FIXED ? '0px' : '',
    zIndex: props.innerZ,
  }
  const outerStyle: React.CSSProperties = {}

  if (state.status !== STATUS_ORIGINAL) {
    innerStyle.width = `${state.width}px`
    outerStyle.height = `${state.height}px`
  }

  const outerClasses = classNames('sticky-outer-wrapper', props.className, {
    [props.activeClass]: state.status === STATUS_FIXED,
    [props.releasedClass]: state.status === STATUS_RELEASED,
  })

  const innerClasses = classNames('sticky-inner-wrapper', props.innerClass, {
    [props.innerActiveClass]: state.status === STATUS_FIXED,
  })

  return (
    <div ref={outerElement} className={outerClasses} style={outerStyle}>
      <div ref={innerElement} className={innerClasses} style={innerStyle}>
        {typeof props.children === 'function' ? props.children({ status: state.status }) : props.children}
      </div>
    </div>
  )
}

// Sticky.defaultProps = {
//   shouldFreeze: () => false,
//   enabled: true,
//   top: 0,
//   bottomBoundary: 0,
//   enableTransforms: true,
//   activeClass: 'active',
//   releasedClass: 'released',
//   onStateChange: null,
//   innerClass: '',
//   innerActiveClass: '',
// }

export default Sticky
