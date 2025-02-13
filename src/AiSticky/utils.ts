export const getTargetHeight = (target: HTMLElement | null) => target?.offsetHeight || 0

export function getTopPosition(top: number | string | undefined, topTarget: HTMLElement | null, doc: Document) {
  if (typeof top === 'string') {
    if (!topTarget) {
      topTarget = doc.querySelector(top)
    }
    top = getTargetHeight(topTarget)
  }
  return top || 0
}

export function getTargetBottom(target: HTMLElement | null, scrollTop: number) {
  if (!target) { return -1 }
  const rect = target.getBoundingClientRect()
  return scrollTop + rect.bottom
}

export function getBottomBoundary(bottomBoundary: string | number | { value: number, target: string } | undefined, doc: Document) {
  let boundary = bottomBoundary || 0
  if (typeof boundary === 'object') {
    boundary = boundary.value || boundary.target || 0
  }
  if (typeof boundary === 'string') {
    const bottomBoundaryTarget = doc.querySelector(boundary)
    boundary = getTargetBottom(bottomBoundaryTarget, 0) // pass correct scrollTop value here
  }
  return boundary && boundary > 0 ? boundary : Infinity
}
