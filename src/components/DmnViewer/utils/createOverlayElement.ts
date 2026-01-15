import { themeColors } from '@base/theme';

interface OverlayElementConfig {
  decisionId: string;
  panelWidth: number;
  estimatedHeight: number;
  initialOffsetX: number;
  initialOffsetY: number;
  contentContainer: HTMLElement;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
  onClick?: () => void;
}

interface OverlayElementResult {
  element: HTMLElement;
  updateArrow: (translateX: number, translateY: number) => void;
  cleanup: () => void;
}

/**
 * Creates a draggable overlay element for DMN decision data display.
 * Includes the panel, drag handle, and arrow pointing to the decision element.
 */
export function createOverlayElement(config: OverlayElementConfig): OverlayElementResult {
  const {
    decisionId,
    panelWidth,
    estimatedHeight,
    initialOffsetX,
    initialOffsetY,
    contentContainer,
    onHoverStart,
    onHoverEnd,
    onClick,
  } = config;

  // Initial transform offset
  const initialTranslateX = 23;
  const initialTranslateY = 62;

  // Track drag state
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let currentTranslateX = initialTranslateX;
  let currentTranslateY = initialTranslateY;

  // Create DOM structure
  const dataEl = document.createElement('div');

  // Create wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'dmn-data-wrapper';
  wrapper.style.cssText = `position: relative; width: ${panelWidth}px;`;
  wrapper.style.transform = `translate(${initialTranslateX}px, ${initialTranslateY}px)`;

  // Create main panel container
  const container = document.createElement('div');
  container.className = 'dmn-data-overlay';
  container.style.cssText = `
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 10px;
    background: linear-gradient(to bottom, ${themeColors.dmn.panelBg}, ${themeColors.dmn.panelBgGradient});
    border-radius: 8px;
    box-sizing: border-box;
    cursor: pointer;
    box-shadow: 0 3px 12px ${themeColors.shadows.medium};
    transition: box-shadow 0.15s ease;
  `;

  // Add border SVG
  const borderSvg = createBorderSvg();
  container.appendChild(borderSvg);

  // Add content container
  container.appendChild(contentContainer);
  wrapper.appendChild(container);

  // Create drag handle
  const dragHandle = createDragHandle();
  wrapper.appendChild(dragHandle);

  // Create arrow SVG
  const { arrowSvg, arrowPath } = createArrowSvg(decisionId);
  wrapper.appendChild(arrowSvg);

  dataEl.appendChild(wrapper);

  // Function to update arrow path
  const updateArrow = (translateX: number, translateY: number) => {
    // Panel position (including transform)
    const panelX = initialOffsetX + translateX;
    const panelY = initialOffsetY + translateY;

    // Arrow starts from bottom-right corner of panel
    const startX = panelWidth;
    const startY = (container?.offsetHeight || estimatedHeight) + 1;

    // Arrow ends exactly at DMN element top-left corner (1px before)
    const endX = -panelX - 1;
    const endY = -panelY - 1;

    // Control point for curve (slightly more curved)
    const ctrlX = startX + (endX - startX) * 0.5 + 20;
    const ctrlY = startY + (endY - startY) * 0.25;

    arrowPath?.setAttribute('d', `M ${startX} ${startY} Q ${ctrlX} ${ctrlY}, ${endX} ${endY}`);
  };

  // Initial arrow
  updateArrow(initialTranslateX, initialTranslateY);

  // Event handlers
  const handleContainerMouseEnter = () => {
    container.style.boxShadow = `0 5px 20px ${themeColors.shadows.dark}`;
    onHoverStart?.();
  };

  const handleContainerMouseLeave = () => {
    container.style.boxShadow = `0 3px 12px ${themeColors.shadows.medium}`;
    onHoverEnd?.();
  };

  const handleDragHandleMouseEnter = () => {
    dragHandle.style.opacity = '1';
  };

  const handleDragHandleMouseLeave = () => {
    dragHandle.style.opacity = '0.4';
  };

  const handleMouseDown = (e: MouseEvent) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const transform = wrapper.style.transform;
    const match = /translate\(([^,]+)px,\s*([^)]+)px\)/.exec(transform);
    if (match) {
      currentTranslateX = parseFloat(match[1]);
      currentTranslateY = parseFloat(match[2]);
    }
    e.stopPropagation();
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const newTranslateX = currentTranslateX + dx;
    const newTranslateY = currentTranslateY + dy;
    wrapper.style.transform = `translate(${newTranslateX}px, ${newTranslateY}px)`;
    updateArrow(newTranslateX, newTranslateY);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      const transform = wrapper.style.transform;
      const match = /translate\(([^,]+)px,\s*([^)]+)px\)/.exec(transform);
      if (match) {
        currentTranslateX = parseFloat(match[1]);
        currentTranslateY = parseFloat(match[2]);
      }
    }
    isDragging = false;
  };

  const handleContainerClick = (e: MouseEvent) => {
    if (isDragging) return;
    e.stopPropagation();
    onClick?.();
  };

  // Attach event listeners
  container.addEventListener('mouseenter', handleContainerMouseEnter);
  container.addEventListener('mouseleave', handleContainerMouseLeave);
  dragHandle.addEventListener('mouseenter', handleDragHandleMouseEnter);
  dragHandle.addEventListener('mouseleave', handleDragHandleMouseLeave);
  dragHandle.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  container.addEventListener('click', handleContainerClick);

  // Cleanup function
  const cleanup = () => {
    container.removeEventListener('mouseenter', handleContainerMouseEnter);
    container.removeEventListener('mouseleave', handleContainerMouseLeave);
    dragHandle.removeEventListener('mouseenter', handleDragHandleMouseEnter);
    dragHandle.removeEventListener('mouseleave', handleDragHandleMouseLeave);
    dragHandle.removeEventListener('mousedown', handleMouseDown);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    container.removeEventListener('click', handleContainerClick);
  };

  return {
    element: dataEl,
    updateArrow,
    cleanup,
  };
}

function createBorderSvg(): SVGSVGElement {
  const borderSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  borderSvg.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; border-radius: 8px; overflow: visible;';

  const borderRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  borderRect.setAttribute('x', '1');
  borderRect.setAttribute('y', '1');
  borderRect.setAttribute('width', 'calc(100% - 2px)');
  borderRect.setAttribute('height', 'calc(100% - 2px)');
  borderRect.setAttribute('rx', '7');
  borderRect.setAttribute('ry', '7');
  borderRect.setAttribute('fill', 'none');
  borderRect.setAttribute('stroke', themeColors.dmn.borderStroke);
  borderRect.setAttribute('stroke-width', '2');
  borderSvg.appendChild(borderRect);

  return borderSvg;
}

function createDragHandle(): HTMLDivElement {
  const dragHandle = document.createElement('div');
  dragHandle.className = 'dmn-drag-handle';
  dragHandle.title = 'Drag to move';
  dragHandle.style.cssText = `
    position: absolute;
    top: 4px;
    right: 4px;
    width: 20px;
    height: 14px;
    cursor: move;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 2px;
    opacity: 0.4;
    transition: opacity 0.15s;
    z-index: 10;
  `;

  const handleLine1 = document.createElement('div');
  handleLine1.style.cssText = `width: 12px; height: 2px; background: ${themeColors.dmn.handleBg}; border-radius: 1px;`;
  const handleLine2 = document.createElement('div');
  handleLine2.style.cssText = `width: 12px; height: 2px; background: ${themeColors.dmn.handleBg}; border-radius: 1px;`;

  dragHandle.appendChild(handleLine1);
  dragHandle.appendChild(handleLine2);

  return dragHandle;
}

function createArrowSvg(decisionId: string): { arrowSvg: SVGSVGElement; arrowPath: SVGPathElement } {
  const arrowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  arrowSvg.setAttribute('class', 'dmn-arrow-svg');
  arrowSvg.style.cssText = 'position: absolute; top: 0; left: 0; width: 300px; height: 300px; overflow: visible; pointer-events: none;';

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
  marker.setAttribute('id', `arrowhead-${decisionId}`);
  marker.setAttribute('markerWidth', '10');
  marker.setAttribute('markerHeight', '7');
  marker.setAttribute('refX', '9');
  marker.setAttribute('refY', '3.5');
  marker.setAttribute('orient', 'auto');

  const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
  polygon.setAttribute('fill', themeColors.dmn.borderStroke);
  marker.appendChild(polygon);
  defs.appendChild(marker);
  arrowSvg.appendChild(defs);

  const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  arrowPath.setAttribute('class', 'dmn-arrow-path');
  arrowPath.setAttribute('stroke', themeColors.dmn.borderStroke);
  arrowPath.setAttribute('stroke-width', '2');
  arrowPath.setAttribute('fill', 'none');
  arrowPath.setAttribute('stroke-dasharray', '6,4');
  arrowPath.setAttribute('marker-end', `url(#arrowhead-${decisionId})`);
  arrowSvg.appendChild(arrowPath);

  return { arrowSvg, arrowPath };
}

/**
 * Calculates the estimated panel height based on content
 */
export function calculatePanelHeight(inputCount: number, outputCount: number): number {
  const lineHeight = 16;
  const headerHeight = 18;
  const padding = 16;
  const dividerHeight = inputCount > 0 && outputCount > 0 ? 7 : 0;

  return (
    padding +
    (inputCount > 0 ? headerHeight + Math.min(inputCount, 3) * lineHeight + (inputCount > 3 ? 14 : 0) : 0) +
    dividerHeight +
    (outputCount > 0 ? headerHeight + Math.min(outputCount, 3) * lineHeight + (outputCount > 3 ? 14 : 0) : 0)
  );
}
