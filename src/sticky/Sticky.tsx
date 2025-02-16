import classNames from 'classnames';
import React from 'react';
import {
  STATUS_FIXED,
  STATUS_ORIGINAL,
  STATUS_RELEASED,
  useSticky,
} from './useSticky';

interface IProps {
  enabled?: boolean;
  top?: string | number;
  bottomBoundary?: object | string | number;
  enableTransforms?: boolean;
  activeClass?: string;
  releasedClass?: string;
  innerClass?: string;
  innerActiveClass?: string;
  className?: string;
  onStateChange?: () => void;
  shouldFreeze?: () => void;
  innerZ?: string | number;
}

const defaultProps: IProps = {
  shouldFreeze() {
    return false;
  },
  enabled: true,
  top: 0,
  bottomBoundary: 0,
  enableTransforms: true,
  activeClass: 'active',
  releasedClass: 'released',
  onStateChange: undefined,
  innerClass: '',
  innerActiveClass: '',
};

function Sticky(props: React.PropsWithChildren<IProps>) {
  const mergedProps = { ...defaultProps, ...props };
  const sticky = useSticky(mergedProps);
  const { state, translate, outerElement, innerElement } = sticky;

  // TODO, "overflow: auto" prevents collapse, need a good way to get children height
  const innerStyle = {
    position: state.status === STATUS_FIXED ? 'fixed' : 'relative',
    top: state.status === STATUS_FIXED ? '0px' : '',
    zIndex: mergedProps.innerZ,
  };

  const outerStyle = {};

  // always use translate3d to enhance the performance
  translate(innerStyle, state.pos);
  if (state.status !== STATUS_ORIGINAL) {
    innerStyle.width = `${state.width}px`;
    outerStyle.height = `${state.height}px`;
  }

  const outerClasses = classNames(
    'sticky-outer-wrapper',
    mergedProps.className,
    {
      [mergedProps.activeClass]: state.status === STATUS_FIXED,
      [mergedProps.releasedClass]: state.status === STATUS_RELEASED,
    }
  );

  const innerClasses = classNames(
    'sticky-inner-wrapper',
    mergedProps.innerClass,
    {
      [mergedProps.innerActiveClass]: state.status === STATUS_FIXED,
    }
  );

  const children = mergedProps.children;

  return (
    <div ref={outerElement} className={outerClasses} style={outerStyle}>
      <div ref={innerElement} className={innerClasses} style={innerStyle}>
        {typeof children === 'function'
          ? children({ status: state.status })
          : children}
      </div>
    </div>
  );
}

Sticky.displayName = 'Sticky';

export default Sticky;
