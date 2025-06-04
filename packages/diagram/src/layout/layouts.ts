import { AbsolutePointLayoutConfig } from "./elements/canvas/absolutePointLayoutConfig.js";
import { CanvasBezierSegmentLayoutConfig } from "./elements/canvas/canvasBezierSegmentLayoutConfig.js";
import { CanvasConnectionLayoutConfig } from "./elements/canvas/canvasConnectionLayoutConfig.js";
import { CanvasElementLayoutConfig } from "./elements/canvas/canvasElementLayoutConfig.js";
import { CanvasLayoutConfig } from "./elements/canvas/canvasLayoutConfig.js";
import { CanvasLineSegmentLayoutConfig } from "./elements/canvas/canvasLineSegmentLayoutConfig.js";
import { LinePointLayoutConfig } from "./elements/canvas/linePointLayoutConfig.js";
import { MarkerLayoutConfig } from "./elements/canvas/markerLayoutConfig.js";
import { RelativePointLayoutConfig } from "./elements/canvas/relativePointLayoutConfig.js";
import { RectLayoutConfig } from "./elements/rectLayoutConfig.js";
import { SpanLayoutConfig } from "./elements/spanLayoutConfig.js";
import { TextLayoutConfig } from "./elements/textLayoutConfig.js";
import type { LayoutConfig } from "./layoutElement.js";
import { PathLayoutConfig } from "./elements/pathLayoutConfig.js";
import { CanvasAxisAlignedSegmentLayoutConfig } from "./elements/canvas/canvasAxisAlignedSegmentLayoutConfig.js";
import { EllipseLayoutConfig } from "./elements/ellipseLayoutConfig.js";
import { ContainerLayoutConfig } from "./elements/containerLayoutConfig.js";

/**
 * Known layouts
 */
export const layouts: LayoutConfig[] = [
    new ContainerLayoutConfig(),
    new RectLayoutConfig(),
    new TextLayoutConfig(),
    new SpanLayoutConfig(),
    new CanvasLayoutConfig(),
    new CanvasElementLayoutConfig(),
    new CanvasConnectionLayoutConfig(),
    new CanvasLineSegmentLayoutConfig(),
    new CanvasBezierSegmentLayoutConfig(),
    new CanvasAxisAlignedSegmentLayoutConfig(),
    new AbsolutePointLayoutConfig(),
    new RelativePointLayoutConfig(),
    new LinePointLayoutConfig(),
    new MarkerLayoutConfig(),
    new PathLayoutConfig(),
    new EllipseLayoutConfig()
];
