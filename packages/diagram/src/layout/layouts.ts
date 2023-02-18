import { AbsolutePointLayoutConfig } from "./elements/canvas/absolutePointLayoutConfig";
import { CanvasBezierSegmentLayoutConfig } from "./elements/canvas/canvasBezierSegmentLayoutConfig";
import { CanvasConnectionLayoutConfig } from "./elements/canvas/canvasConnectionLayoutConfig";
import { CanvasElementLayoutConfig } from "./elements/canvas/canvasElementLayoutConfig";
import { CanvasLayoutConfig } from "./elements/canvas/canvasLayoutConfig";
import { CanvasLineSegmentLayoutConfig } from "./elements/canvas/canvasLineSegmentLayoutConfig";
import { LinePointLayoutConfig } from "./elements/canvas/linePointLayoutConfig";
import { MarkerLayoutConfig } from "./elements/canvas/markerLayoutConfig";
import { RelativePointLayoutConfig } from "./elements/canvas/relativePointLayoutConfig";
import { HBoxLayoutConfig } from "./elements/hboxLayoutConfig";
import { RectLayoutConfig } from "./elements/rectLayoutConfig";
import { SpanLayoutConfig } from "./elements/spanLayoutConfig";
import { TextLayoutConfig } from "./elements/textLayoutConfig";
import { VBoxLayoutConfig } from "./elements/vboxLayoutConfig";
import { LayoutConfig } from "./layoutElement";
import { PathLayoutConfig } from "./elements/pathLayoutConfig";

/**
 * Known layouts
 */
export const layouts: LayoutConfig[] = [
    new RectLayoutConfig(),
    new VBoxLayoutConfig(),
    new HBoxLayoutConfig(),
    new TextLayoutConfig(),
    new SpanLayoutConfig(),
    new CanvasLayoutConfig(),
    new CanvasElementLayoutConfig(),
    new CanvasConnectionLayoutConfig(),
    new CanvasLineSegmentLayoutConfig(),
    new CanvasBezierSegmentLayoutConfig(),
    new AbsolutePointLayoutConfig(),
    new RelativePointLayoutConfig(),
    new LinePointLayoutConfig(),
    new MarkerLayoutConfig(),
    new PathLayoutConfig()
];
