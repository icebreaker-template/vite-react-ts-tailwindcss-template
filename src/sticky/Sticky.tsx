import classNames from 'classnames'
import React from 'react'
import { useSticky } from './useSticky'

// constants
const STATUS_ORIGINAL = 0 // The default status, locating at the original position.
const STATUS_RELEASED = 1 // The released status, locating at somewhere on document but not default one.
const STATUS_FIXED = 2 // The sticky status, locating fixed to the top or the bottom of screen.

function Sticky(props) {

    const sticky = useSticky(props)
    const { state, translate, outerElement, innerElement } = sticky

  // TODO, "overflow: auto" prevents collapse, need a good way to get children height
  const innerStyle = {
    position: state.status === STATUS_FIXED ? 'fixed' : 'relative',
    top: state.status === STATUS_FIXED ? '0px' : '',
    zIndex: props.innerZ,
  }
  const outerStyle = {}

  // always use translate3d to enhance the performance
  translate(innerStyle, state.pos)
  if (state.status !== STATUS_ORIGINAL) {
    innerStyle.width = `${state.width}px`
    outerStyle.height = `${state.height}px`
  }

  const outerClasses = classNames(
    'sticky-outer-wrapper',
    props.className,
    {
      [props.activeClass]: state.status === STATUS_FIXED,
      [props.releasedClass]:
                state.status === STATUS_RELEASED,
    },
  )

  const innerClasses = classNames(
    'sticky-inner-wrapper',
    props.innerClass,
    {
      [props.innerActiveClass]:
                state.status === STATUS_FIXED,
    },
  )

  const children = props.children

  return (
    <div
      ref={outerElement}
      className={outerClasses}
      style={outerStyle}
    >
      <div
        ref={innerElement}
        className={innerClasses}
        style={innerStyle}
      >
        {
          typeof children === 'function'
            ? children({ status: state.status })
            : children
        }
      </div>
    </div>
  )
}

Sticky.displayName = 'Sticky'

Sticky.defaultProps = {
  shouldFreeze() {
    return false
  },
  enabled: true,
  top: 0,
  bottomBoundary: 0,
  enableTransforms: true,
  activeClass: 'active',
  releasedClass: 'released',
  onStateChange: null,
  innerClass: '',
  innerActiveClass: '',
}

/**
 * @param {Bool} enabled A switch to enable or disable Sticky.
 * @param {String/Number} top A top offset px for Sticky. Could be a selector representing a node
 *        whose height should serve as the top offset.
 * @param {String/Number} bottomBoundary A bottom boundary px on document where Sticky will stop.
 *        Could be a selector representing a node whose bottom should serve as the bottom boudary.
 */
// Sticky.propTypes = {
//   children: PropTypes.elementType,
//   enabled: PropTypes.bool,
//   top: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
//   bottomBoundary: PropTypes.oneOfType([
//     PropTypes.object, // TODO, may remove
//     PropTypes.string,
//     PropTypes.number,
//   ]),
//   enableTransforms: PropTypes.bool,
//   activeClass: PropTypes.string,
//   releasedClass: PropTypes.string,
//   innerClass: PropTypes.string,
//   innerActiveClass: PropTypes.string,
//   className: PropTypes.string,
//   onStateChange: PropTypes.func,
//   shouldFreeze: PropTypes.func,
//   innerZ: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
// }

Sticky.STATUS_ORIGINAL = STATUS_ORIGINAL
Sticky.STATUS_RELEASED = STATUS_RELEASED
Sticky.STATUS_FIXED = STATUS_FIXED

export default Sticky
