import classNames from 'classnames'
import React, { useEffect, useRef } from 'react'
import { useSticky } from './useSticky'

const Sticky: React.FC<any> = (props) => {
  const { state, updateInitialDimension, update } = useSticky(props)

  const outerElement = useRef<HTMLDivElement>(null)
  const innerElement = useRef<HTMLDivElement>(null)

  useEffect(() => {
    updateInitialDimension()
    update()
  }, [state])

  const innerStyle: React.CSSProperties = {
    position: state.status === 2 ? 'fixed' : 'relative',
    top: state.status === 2 ? '0px' : '',
    zIndex: props.innerZ,
  }

  return (
    <div ref={outerElement} className={classNames('sticky-outer-wrapper', props.className)}>
      <div ref={innerElement} className={classNames('sticky-inner-wrapper', props.innerClass)} style={innerStyle}>
        {props.children}
      </div>
    </div>
  )
}

export default Sticky
