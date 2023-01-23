import {
    AbsolutePoint,
    Canvas,
    CanvasBezierSegment,
    CanvasConnection,
    CanvasElement,
    CanvasLineSegment,
    Marker,
    Rect,
    RelativePoint,
    Root,
    Text
} from "@hylimo/diagram-common";
import { Container, ContainerModule } from "inversify";
import {
    configureModelElement,
    loadDefaultModules,
    overrideViewerOptions,
    selectFeature,
    updateModule as sprottyUpdateModule,
    moveModule as sprottyMoveModule,
    zorderModule as sprottyZOrderModule,
    moveFeature,
    TYPES,
    decorationModule,
    registerModelElement
} from "sprotty";
import { CommandStack } from "./base/commandStack";
import { moveModule } from "./features/move/di.config";
import { transactionModule } from "./features/transaction/di.config";
import { updateModule } from "./features/update/di.config";
import { zorderModule } from "./features/zorder/di.config";
import { SAbsolutePoint } from "./model/canvas/sAbsolutePoint";
import { SCanvas } from "./model/canvas/sCanvas";
import { SCanvasBezierSegment } from "./model/canvas/sCanvasBezierSegment";
import { SCanvasConnection } from "./model/canvas/sCanvasConnection";
import { SCanvasElement } from "./model/canvas/sCanvasElement";
import { SCanvasLineSegment } from "./model/canvas/sCanvasLineSegment";
import { SMarker } from "./model/canvas/sMarker";
import { SRelativePoint } from "./model/canvas/sRelativePoint";
import { SRect } from "./model/sRect";
import { SRoot } from "./model/sRoot";
import { SText } from "./model/sText";
import { AbsolutePointView } from "./views/canvas/absolutePointView";
import { CanvasView } from "./views/canvas/canvasView";
import { CanvasConnectionView } from "./views/canvas/canvasConnectionView";
import { CanvasElementView } from "./views/canvas/canvasElementView";
import { MarkerView } from "./views/canvas/markerView";
import { RelativePointView } from "./views/canvas/relativePointView";
import { RectView } from "./views/rectView";
import { SRootView } from "./views/rootView";
import { TextView } from "./views/textView";

/**
 * The module used
 */
const diagramModule = new ContainerModule((bind, unbind, isBound, rebind) => {
    const context = { bind, unbind, isBound, rebind };

    rebind(TYPES.ICommandStack).to(CommandStack).inSingletonScope();

    configureModelElement(context, Root.TYPE, SRoot, SRootView);
    configureModelElement(context, Rect.TYPE, SRect, RectView);
    configureModelElement(context, Text.TYPE, SText, TextView);
    configureModelElement(context, Canvas.TYPE, SCanvas, CanvasView);
    configureModelElement(context, CanvasElement.TYPE, SCanvasElement, CanvasElementView, {
        enable: [selectFeature, moveFeature]
    });
    configureModelElement(context, AbsolutePoint.TYPE, SAbsolutePoint, AbsolutePointView, {
        enable: [selectFeature, moveFeature]
    });
    configureModelElement(context, RelativePoint.TYPE, SRelativePoint, RelativePointView, {
        enable: [selectFeature, moveFeature]
    });
    configureModelElement(context, CanvasConnection.TYPE, SCanvasConnection, CanvasConnectionView, {
        enable: [selectFeature]
    });
    configureModelElement(context, Marker.TYPE, SMarker, MarkerView);
    registerModelElement(context, CanvasLineSegment.TYPE, SCanvasLineSegment);
    registerModelElement(context, CanvasBezierSegment.TYPE, SCanvasBezierSegment);
});

/**
 * Creates the module for the diagram ui
 *
 * @param widgetId the id of the div to use
 * @returns the container
 */
export function createContainer(widgetId: string): Container {
    const container = new Container();
    loadDefaultModules(container, {
        exclude: [sprottyUpdateModule, sprottyMoveModule, sprottyZOrderModule, decorationModule]
    });
    container.load(updateModule, zorderModule, transactionModule, moveModule);
    container.load(diagramModule);

    overrideViewerOptions(container, {
        needsClientLayout: false,
        needsServerLayout: false,
        baseDiv: widgetId
    });
    return container;
}
