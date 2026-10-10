import type { CollisionDetection } from "@dnd-kit/core";
import { pointerWithin, rectIntersection } from "@dnd-kit/core";
import { getIframeElements } from "@pedia/ui/lib/ui-builder/context/dnd-utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TransformState {
  scale: number;
  positionX: number;
  positionY: number;
}

interface Point {
  x: number;
  y: number;
}

interface Rect {
  top: number;
  left: number;
  bottom: number;
  right: number;
  width: number;
  height: number;
}

interface IframeGeometry {
  scrollOffset: Point;
  rect: { left: number; top: number };
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/** Read the current zoom/pan transform from the DOM. */
function getTransformState(): TransformState {
  const transformComponent = document.querySelector(
    '[data-testid="transform-component"]'
  );
  if (!transformComponent) {
    return { scale: 1, positionX: 0, positionY: 0 };
  }

  const transform = globalThis.getComputedStyle(transformComponent).transform;
  if (!transform || transform === "none") {
    return { scale: 1, positionX: 0, positionY: 0 };
  }

  const matrixMatch = /matrix\(([^)]*)\)/.exec(transform);
  if (!matrixMatch?.[1]) {
    return { scale: 1, positionX: 0, positionY: 0 };
  }

  const values = matrixMatch[1]
    .split(",")
    .map((v) => Number.parseFloat(v.trim()));

  if (values.length < 6) {
    return { scale: 1, positionX: 0, positionY: 0 };
  }

  const scale = values[0];
  const positionX = values[4];
  const positionY = values[5];
  if (
    scale === undefined ||
    positionX === undefined ||
    positionY === undefined
  ) {
    return { scale: 1, positionX: 0, positionY: 0 };
  }

  return { scale, positionX, positionY };
}

/** Read the iframe's current scroll position and its viewport rect. */
function getIframeGeometry(): IframeGeometry {
  const iframeElements = getIframeElements();
  if (!iframeElements) {
    return { scrollOffset: { x: 0, y: 0 }, rect: { left: 0, top: 0 } };
  }

  const { iframe, window: iframeWindow } = iframeElements;
  const scrollOffset: Point = iframeWindow
    ? {
        x: iframeWindow.pageXOffset || iframeWindow.scrollX || 0,
        y: iframeWindow.pageYOffset || iframeWindow.scrollY || 0,
      }
    : { x: 0, y: 0 };

  const bounding = iframe.getBoundingClientRect();
  return {
    scrollOffset,
    rect: { left: bounding.left, top: bounding.top },
  };
}

/** Convert a viewport-relative rect into iframe-content coordinates. */
function toContentRect(
  viewportRect: DOMRect,
  iframeRect: { left: number; top: number },
  scrollOffset: Point
): Rect {
  return {
    top: viewportRect.top - iframeRect.top + scrollOffset.y,
    left: viewportRect.left - iframeRect.left + scrollOffset.x,
    bottom: viewportRect.bottom - iframeRect.top + scrollOffset.y,
    right: viewportRect.right - iframeRect.left + scrollOffset.x,
    width: viewportRect.width,
    height: viewportRect.height,
  };
}

/**
 * Apply the current zoom/pan transform to a pointer that's already been
 * converted to iframe-relative coordinates.
 */
function applyTransform(
  iframeRelative: Point,
  transform: TransformState
): Point {
  return {
    x: (iframeRelative.x - transform.positionX) / transform.scale,
    y: (iframeRelative.y - transform.positionY) / transform.scale,
  };
}

// ---------------------------------------------------------------------------
// Fresh-rect recalculation
// ---------------------------------------------------------------------------

/**
 * Recalculate droppable rectangles from the DOM.
 *
 * The cached rectangles from dnd-kit become stale during auto-scroll or
 * when the iframe's scroll offset changes significantly. When the offset
 * is large (mid-scroll) or very small (at the top), we read fresh rects
 * from the DOM and convert them into the iframe-content coordinate space
 * that dnd-kit expects.
 */
function recalculateDroppableRects(
  droppableContainers: Parameters<CollisionDetection>[0]["droppableContainers"],
  iframeRect: { left: number; top: number },
  scrollOffset: Point
): Map<string, Rect> {
  const fresh = new Map<string, Rect>();

  droppableContainers.forEach((container) => {
    const element = container.node.current;
    if (!element) return;

    try {
      const viewportRect = element.getBoundingClientRect();
      fresh.set(
        String(container.id),
        toContentRect(viewportRect, iframeRect, scrollOffset)
      );
    } catch (error) {
      // Keep the old rectangle if we can't get a fresh one.
      console.warn("Failed to get fresh rectangle for:", container.id, error);
    }
  });

  return fresh;
}

// ---------------------------------------------------------------------------
// Collision strategies
// ---------------------------------------------------------------------------

interface StrategyArgs {
  active: Parameters<CollisionDetection>[0]["active"];
  droppableContainers: Parameters<CollisionDetection>[0]["droppableContainers"];
  collisionRect: Parameters<CollisionDetection>[0]["collisionRect"];
  droppableRects: Parameters<CollisionDetection>[0]["droppableRects"];
  pointerCoordinates: Point;
}

type CollisionStrategy = (args: StrategyArgs) => ReturnType<CollisionDetection>;

interface Strategy {
  name: string;
  run: CollisionStrategy;
}

/**
 * The fallback chain of collision strategies, in order of preference.
 *
 * Each strategy is tried in turn; the first one that returns a non-empty
 * collision list wins. The order matters — the first two use the adjusted
 * pointer coordinates and fresh rects, the third uses the "simple"
 * coordinates as a sanity check, the fourth falls back to the cached
 * rects, and the fifth falls back to the original pointer coordinates.
 */
const STRATEGIES: readonly Strategy[] = [
  { name: "pointerWithin+adjusted", run: pointerWithin },
  { name: "rectIntersection+adjusted", run: rectIntersection },
  { name: "pointerWithin+simple", run: pointerWithin },
  { name: "pointerWithin+cached", run: pointerWithin },
  { name: "pointerWithin+original", run: pointerWithin },
];

function runStrategies(
  strategies: readonly Strategy[],
  args: StrategyArgs[]
): ReturnType<CollisionDetection> {
  for (const [index, strategy] of strategies.entries()) {
    const strategyArgs = args[index];
    if (!strategyArgs) continue;
    const collisions = strategy.run(strategyArgs);
    if (collisions.length > 0) {
      return collisions;
    }
  }
  return [];
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Custom collision detection that accounts for the iframe's scroll offset
 * and the editor's zoom/pan transform.
 *
 * dnd-kit's default detectors operate in viewport coordinates and use
 * cached droppable rects. Inside the ui-builder, droppables live inside
 * an iframe that can be scrolled and a canvas that can be zoomed. Both
 * require the pointer and the droppable rects to be converted into the
 * same coordinate space before the collision check runs.
 */
export const createTransformAwareCollisionDetection =
  (): CollisionDetection =>
  ({
    active,
    droppableRects,
    droppableContainers,
    pointerCoordinates,
    collisionRect,
  }) => {
    if (!pointerCoordinates) {
      return [];
    }

    const transformState = getTransformState();
    const { scrollOffset, rect: iframeRect } = getIframeGeometry();

    // Fresh rects are only needed when we're mid-scroll or at the very top —
    // otherwise the cached rects are accurate enough and re-measuring is
    // pure overhead.
    const isAtTop = Math.abs(scrollOffset.y) < 5;
    const needsFreshRects = Math.abs(scrollOffset.y) > 10 || isAtTop;

    const freshDroppableRects = needsFreshRects
      ? recalculateDroppableRects(droppableContainers, iframeRect, scrollOffset)
      : new Map(droppableRects);

    // Pointer → iframe-relative → transform-adjusted. When at the top, the
    // scroll offset is effectively zero, so we skip adding it back.
    const iframeRelative = {
      x: pointerCoordinates.x - iframeRect.left,
      y: pointerCoordinates.y - iframeRect.top,
    };
    const transformAdjusted = applyTransform(iframeRelative, transformState);

    const adjustedPointerCoordinates: Point = isAtTop
      ? transformAdjusted
      : {
          x: transformAdjusted.x + scrollOffset.x,
          y: transformAdjusted.y + scrollOffset.y,
        };

    // A simpler coordinate calculation that skips the transform math —
    // used as a sanity check when the complex math gets out of sync
    // during rapid auto-scroll.
    const simpleAdjustedCoordinates: Point = {
      x: pointerCoordinates.x - iframeRect.left + scrollOffset.x,
      y: pointerCoordinates.y - iframeRect.top + scrollOffset.y,
    };

    // Guard against NaN coordinates from broken transform state. Fall back
    // to the original pointer coordinates if we can't compute a valid one.
    if (
      Number.isNaN(adjustedPointerCoordinates.x) ||
      Number.isNaN(adjustedPointerCoordinates.y)
    ) {
      console.warn("Invalid adjusted coordinates, falling back to original");
      return pointerWithin({
        active,
        droppableRects,
        droppableContainers,
        pointerCoordinates,
        collisionRect,
      });
    }

    // The fallback chain. Each entry pairs a set of coordinate/rect inputs
    // with the dnd-kit collision function to run against them.
    const collisionArgs: StrategyArgs[] = [
      {
        active,
        droppableRects: freshDroppableRects,
        droppableContainers,
        pointerCoordinates: adjustedPointerCoordinates,
        collisionRect,
      },
      {
        active,
        droppableRects: freshDroppableRects,
        droppableContainers,
        pointerCoordinates: adjustedPointerCoordinates,
        collisionRect,
      },
      {
        active,
        droppableRects: freshDroppableRects,
        droppableContainers,
        pointerCoordinates: simpleAdjustedCoordinates,
        collisionRect,
      },
      {
        active,
        droppableRects,
        droppableContainers,
        pointerCoordinates: adjustedPointerCoordinates,
        collisionRect,
      },
      {
        active,
        droppableRects,
        droppableContainers,
        pointerCoordinates,
        collisionRect,
      },
    ];

    return runStrategies(STRATEGIES, collisionArgs);
  };
