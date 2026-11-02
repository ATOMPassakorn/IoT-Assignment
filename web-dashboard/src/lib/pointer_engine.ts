export interface DOMRectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PointerOffset {
  x: number;
  y: number;
}

export function calculatePointerOffset(
  rect: DOMRectLike,
  clientX: number,
  clientY: number
): PointerOffset {
  const x = Math.round(clientX - rect.left);
  const y = Math.round(clientY - rect.top);
  return { x, y };
}

export function attachLiquidPointerTracker(element: HTMLElement) {
  const handlePointerMove = (e: MouseEvent) => {
    const rect = element.getBoundingClientRect();
    const offset = calculatePointerOffset(rect, e.clientX, e.clientY);
    element.style.setProperty("--mouse-x", `${offset.x}px`);
    element.style.setProperty("--mouse-y", `${offset.y}px`);
  };

  const handlePointerLeave = () => {
    element.style.removeProperty("--mouse-x");
    element.style.removeProperty("--mouse-y");
  };

  element.addEventListener("mousemove", handlePointerMove);
  element.addEventListener("mouseleave", handlePointerLeave);

  return () => {
    element.removeEventListener("mousemove", handlePointerMove);
    element.removeEventListener("mouseleave", handlePointerLeave);
  };
}
