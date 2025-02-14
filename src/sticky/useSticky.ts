import { useEffect, useRef, useState } from 'react'
import { subscribe } from 'subscribe-ui-event'
import shallowEqual from '../shallowequal'

// constants
const STATUS_ORIGINAL = 0 // The default status, locating at the original position.
const STATUS_RELEASED = 1 // The released status, locating at somewhere on document but not default one.
const STATUS_FIXED = 2 // The sticky status, locating fixed to the top or the bottom of screen.

let TRANSFORM_PROP = 'transform'

// global variable for all instances
let doc
let docBody
let docEl
let canEnableTransforms = true // Use transform by default, so no Sticky on lower-end browser when no Modernizr
let M
let scrollDelta = 0
let win
let winHeight = -1

export function useSticky(props) {
  const dataRef = useRef({
    delta: 0,
    stickyTop: 0,
    stickyBottom: 0,
    frozen: false,
    skipNextScrollEvent: false,
    scrollTop: -1,

    bottomBoundaryTarget: undefined,
    topTarget: undefined,
    subscribers: undefined,
  })

  const outerElement = useRef<HTMLDivElement | undefined>(undefined)
  const innerElement = useRef<HTMLDivElement | undefined>(undefined)
  const propsRef = useRef(props)
  const propsEnabledChange = props.enabled !== propsRef.current.enabled
  const propsHasChanged = !shallowEqual(props, propsRef.current)
  const needTriggerUpdate =   propsRef.current.top !== props.top || propsRef.current.bottomBoundary !== props.bottomBoundary  // if the top or bottomBoundary props were changed, then trigger the update
  propsRef.current = props

  const [state, setState] = useState({
    top: 0, // A top offset from viewport top where Sticky sticks to when scrolling up
    bottom: 0, // A bottom offset from viewport top where Sticky sticks to when scrolling down
    width: 0, // Sticky width
    height: 0, // Sticky height
    x: 0, // The original x of Sticky
    y: 0, // The original y of Sticky
    topBoundary: 0, // The top boundary on document
    bottomBoundary: Infinity, // The bottom boundary on document
    status: STATUS_ORIGINAL, // The Sticky status
    pos: 0, // Real y-axis offset for rendering position-fixed and position-relative
    activated: false, // once browser info is available after mounted, it becomes true to avoid checksum error
  })

  const getTargetHeight = (target) => {
    return (target && target.offsetHeight) || 0
  }

  const getTopPosition = (top) => {
    // a top argument can be provided to override reading from the props
    top = top || props.top || 0
    if (typeof top === 'string') {
      if (!dataRef.current.topTarget) {
        dataRef.current.topTarget = doc.querySelector(top)
      }
      top = getTargetHeight(dataRef.current.topTarget)
    }
    return top
  }

  const getTargetBottom = (target) => {
    if (!target) {
      return -1
    }
    const rect = target.getBoundingClientRect()
    return dataRef.current.scrollTop + rect.bottom
  }

  const getBottomBoundary = (bottomBoundary) => {
    // a bottomBoundary can be provided to avoid reading from the props
    let boundary = bottomBoundary || props.bottomBoundary

    // TODO, bottomBoundary was an object, depricate it later.
    if (typeof boundary === 'object') {
      boundary = boundary.value || boundary.target || 0
    }

    if (typeof boundary === 'string') {
      if (!dataRef.current.bottomBoundaryTarget) {
        dataRef.current.bottomBoundaryTarget = doc.querySelector(boundary)
      }
      boundary = getTargetBottom(dataRef.current.bottomBoundaryTarget)
    }
    return boundary && boundary > 0 ? boundary : Infinity
  }

  const reset = () => {
    setState({
      status: STATUS_ORIGINAL,
      pos: 0,
    })
  }

  const release = (pos) => {
    setState({
      status: STATUS_RELEASED,
      pos: pos - state.y,
    })
  }

  const fix = (pos) => {
    setState({
      status: STATUS_FIXED,
      pos,
    })
  }

  /**
   * Update the initial position, width, and height. It should update whenever children change.
   * @param {object} options optional top and bottomBoundary new values
   */
  const updateInitialDimension = (options) => {
    options = options || {}

    if (!outerElement.current || !innerElement.current) {
      return
    }

    const outerRect = outerElement.current.getBoundingClientRect()
    const innerRect = innerElement.current.getBoundingClientRect()

    const width = outerRect.width || outerRect.right - outerRect.left
    const height = innerRect.height || innerRect.bottom - innerRect.top
    const outerY = outerRect.top + dataRef.current.scrollTop

    setState({
      top: getTopPosition(options.top),
      bottom: Math.min(state.top + height, winHeight),
      width,
      height,
      x: outerRect.left,
      y: outerY,
      bottomBoundary: getBottomBoundary(options.bottomBoundary),
      topBoundary: outerY,
    })
  }

  const update = () => {
    let disabled
            = !props.enabled
              || state.bottomBoundary - state.topBoundary
              <= state.height
              || (state.width === 0 && state.height === 0)

    if (disabled) {
      if (state.status !== STATUS_ORIGINAL) {
        reset()
      }
      return
    }

    let delta = scrollDelta
    // "top" and "bottom" are the positions that state.top and state.bottom project
    // on document from viewport.
    let top = dataRef.current.scrollTop + state.top
    let bottom = dataRef.current.scrollTop + state.bottom

    // There are 2 principles to make sure Sticky won't get wrong so much:
    // 1. Reset Sticky to the original postion when "top" <= topBoundary
    // 2. Release Sticky to the bottom boundary when "bottom" >= bottomBoundary
    if (top <= state.topBoundary) {
      // #1
      reset()
    }
    else if (bottom >= state.bottomBoundary) {
      // #2
      dataRef.current.stickyBottom = state.bottomBoundary
      dataRef.current.stickyTop = dataRef.current.stickyBottom - state.height
      release(dataRef.current.stickyTop)
    }
    else {
      if (state.height > winHeight - state.top) {
        // In this case, Sticky is higher then viewport minus top offset
        switch (state.status) {
          case STATUS_ORIGINAL:
            release(state.y)
            dataRef.current.stickyTop = state.y
            dataRef.current.stickyBottom = dataRef.current.stickyTop + state.height
            // Commentting out "break" is on purpose, because there is a chance to transit to FIXED
            // from ORIGINAL when calling window.scrollTo().
            // break;
            /* eslint-disable-next-line no-fallthrough */
          case STATUS_RELEASED:
            // If "top" and "bottom" are inbetween stickyTop and stickyBottom, then Sticky is in
            // RELEASE status. Otherwise, it changes to FIXED status, and its bottom sticks to
            // viewport bottom when scrolling down, or its top sticks to viewport top when scrolling up.
            dataRef.current.stickyBottom = dataRef.current.stickyTop + state.height
            if (delta > 0 && bottom > dataRef.current.stickyBottom) {
              fix(state.bottom - state.height)
            }
            else if (delta < 0 && top < dataRef.current.stickyTop) {
              fix(state.top)
            }
            break
          case STATUS_FIXED:
            var toRelease = true
            var pos = state.pos
            var height = state.height
            // In regular cases, when Sticky is in FIXED status,
            // 1. it's top will stick to the screen top,
            // 2. it's bottom will stick to the screen bottom,
            // 3. if not the cases above, then it's height gets changed
            if (delta > 0 && pos === state.top) {
              // case 1, and scrolling down
              dataRef.current.stickyTop = top - delta
              dataRef.current.stickyBottom = dataRef.current.stickyTop + height
            }
            else if (
              delta < 0
              && pos === state.bottom - height
            ) {
              // case 2, and scrolling up
              dataRef.current.stickyBottom = bottom - delta
              dataRef.current.stickyTop = dataRef.current.stickyBottom - height
            }
            else if (
              pos !== state.bottom - height
              && pos !== state.top
            ) {
              // case 3
              // This case only happens when Sticky's bottom sticks to the screen bottom and
              // its height gets changed. Sticky should be in RELEASE status and update its
              // sticky bottom by calculating how much height it changed.
              const deltaHeight
                                = pos + height - state.bottom
              dataRef.current.stickyBottom = bottom - delta + deltaHeight
              dataRef.current.stickyTop = dataRef.current.stickyBottom - height
            }
            else {
              toRelease = false
            }

            if (toRelease) {
              release(dataRef.current.stickyTop)
            }
            break
        }
      }
      else {
        // In this case, Sticky is shorter then viewport minus top offset
        // and will always fix to the top offset of viewport
        fix(state.top)
      }
    }
    dataRef.current.delta = delta
  }

  const handleResize = (e, ae) => {
    if (props.shouldFreeze()) {
      return
    }

    winHeight = ae.resize.height
    updateInitialDimension()
    update()
  }

  const handleScrollStart = (e, ae) => {
    dataRef.current.frozen = props.shouldFreeze()

    if (dataRef.current.frozen) {
      return
    }

    if (dataRef.current.scrollTop === ae.scroll.top) {
      // Scroll position hasn't changed,
      // do nothing
      dataRef.current.skipNextScrollEvent = true
    }
    else {
      dataRef.current.scrollTop = ae.scroll.top
      updateInitialDimension()
    }
  }

  const handleScroll = (e, ae) => {
    // Scroll doesn't need to be handled
    if (dataRef.current.skipNextScrollEvent) {
      dataRef.current.skipNextScrollEvent = false
      return
    }

    scrollDelta = ae.scroll.delta
    dataRef.current.scrollTop = ae.scroll.top
    update()
  }

  const translate = (style, pos) => {
    const enableTransforms
            = canEnableTransforms && props.enableTransforms
    if (enableTransforms && state.activated) {
      style[TRANSFORM_PROP]
                = `translate3d(0,${Math.round(pos)}px,0)`
    }
    else {
      style.top = `${pos}px`
    }
  }

  useEffect(() => {
    // Only initialize the globals if this is the first
    // time this component type has been mounted
    if (!win) {
      win = window
      doc = document
      docEl = doc.documentElement
      docBody = doc.body
      winHeight = win.innerHeight || docEl.clientHeight
      M = window.Modernizr
      // No Sticky on lower-end browser when no Modernizr
      if (M && M.prefixed) {
        canEnableTransforms = M.csstransforms3d
        TRANSFORM_PROP = M.prefixed('transform')
      }
    }

    // when mount, the scrollTop is not necessary on the top
    dataRef.current.scrollTop = docBody.scrollTop + docEl.scrollTop

    if (props.enabled) {
      setState({ activated: true })
      updateInitialDimension()
      update()
    }
    // bind the listeners regardless if initially enabled - allows the component to toggle sticky functionality
    dataRef.current.subscribers = [
      subscribe('scrollStart', handleScrollStart, {
        useRAF: true,
      }),
      subscribe('scroll', handleScroll, {
        useRAF: true,
        enableScrollInfo: true,
      }),
      subscribe('resize', handleResize, {
        enableResizeInfo: true,
      }),
    ]

    return () => {
      const subscribers = dataRef.current.subscribers || []
      for (let i = subscribers.length - 1; i >= 0; i--) {
        dataRef.current.subscribers[i].unsubscribe()
      }
    }
  }, [])

  useEffect(() => {
    if (
      propsRef.current.onStateChange
    ) {
      propsRef.current.onStateChange({ status: state.status })
    }
  }, [state.status])

  useEffect(() => {
    updateInitialDimension()
    update()
  }, [state.top])


  useEffect(() => {
    if(propsHasChanged){
      if(propsEnabledChange) {
        if (propsRef.current.enabled) {
          setState({ activated: true })
          updateInitialDimension()
          update()
        } else {
          setState({ activated: false })
          reset()
        }
      } else if(needTriggerUpdate) {
        updateInitialDimension()
        update()
      }
    }
      
   
  }, [propsEnabledChange, propsHasChanged, needTriggerUpdate])

  return {
    state,
    setState,

    // getTargetHeight,
    // getTopPosition,
    // getTargetBottom,
    // getBottomBoundary,
    // reset,
    // release,
    // fix,
    // updateInitialDimension,
    // update,
    // handleResize,
    // handleScrollStart,
    // handleScroll,
    translate,

    outerElement,
    innerElement,
  }
}
