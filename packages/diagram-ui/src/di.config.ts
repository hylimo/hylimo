import {
    AbsolutePoint,
    Canvas,
    CanvasAxisAlignedSegment,
    CanvasBezierSegment,
    CanvasConnection,
    CanvasElement,
    CanvasLineSegment,
    Ellipse,
    LinePoint,
    Marker,
    Path,
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
    decorationModule,
    registerModelElement,
    undoRedoModule as sprottyUndoRedoModule,
    exportModule,
    viewportModule as sprottyViewportModule
} from "sprotty";
import { CommandStack } from "./base/commandStack.js";
import { transactionModule } from "./features/transaction/di.config.js";
import { updateModule } from "./features/update/di.config.js";
import { zorderModule } from "./features/zorder/di.config.js";
import { SAbsolutePoint } from "./model/canvas/sAbsolutePoint.js";
import { SCanvas } from "./model/canvas/sCanvas.js";
import { SCanvasBezierSegment } from "./model/canvas/sCanvasBezierSegment.js";
import { SCanvasConnection } from "./model/canvas/sCanvasConnection.js";
import { SCanvasElement } from "./model/canvas/sCanvasElement.js";
import { SCanvasLineSegment } from "./model/canvas/sCanvasLineSegment.js";
import { SMarker } from "./model/canvas/sMarker.js";
import { SRelativePoint } from "./model/canvas/sRelativePoint.js";
import { SRect } from "./model/sRect.js";
import { SRoot } from "./model/sRoot.js";
import { SText } from "./model/sText.js";
import { AbsolutePointView } from "./views/canvas/absolutePointView.js";
import { CanvasView } from "./views/canvas/canvasView.js";
import { CanvasConnectionView } from "./views/canvas/canvasConnectionView.js";
import { CanvasElementView } from "./views/canvas/canvasElementView.js";
import { MarkerView } from "./views/canvas/markerView.js";
import { RelativePointView } from "./views/canvas/relativePointView.js";
import { RectView } from "./views/rectView.js";
import { RootView } from "./views/rootView.js";
import { TextView } from "./views/textView.js";
import { SLinePoint } from "./model/canvas/sLinePoint.js";
import { LinePointView } from "./views/canvas/linePointView.js";
import { SPath } from "./model/sPath.js";
import { PathView } from "./views/pathView.js";
import { SCanvasAxisAlignedSegment } from "./model/canvas/sCanvasAxisAlignedSegment.js";
import { SEllipse } from "./model/sEllipse.js";
import { EllipseView } from "./views/ellipseView.js";
import { navigationModule } from "./features/navigation/di.config.js";
import { canvasContentMoveEditModule } from "./features/canvas-content-move-edit/di.config.js";
import { resetCanvasBoundsModule } from "./features/canvas-bounds/di.config.js";
import { viewportModule } from "./features/viewport/di.config.js";
import { undoRedoModule } from "./features/undo-redo/di.config.js";
import { toolboxModule } from "./features/toolbox/di.config.js";
import { moveModule } from "./features/move/di.config.js";
import { configModule } from "./features/config/di.config.js";
import { splitCanvasSegmentModule } from "./features/split-canvas-segment/di.config.js";
import { createConnectionModule } from "./features/create-connection/di.config.js";
import { TYPES } from "./features/types.js";
import { cursorModule } from "./features/cursor/di.config.js";
import { selectModule } from "./features/select/di.config.js";
import { boxSelectFeature } from "./features/select/boxSelectFeature.js";
import { keyStateModule } from "./features/key-state/di.config.js";
import { contribModule } from "./features/contrib/di.config.js";
import { snapModule } from "./features/snap/di.config.js";

/**
 * The module used
 */
const diagramModule = new ContainerModule((bind, unbind, isBound, rebind) => {
    const context = { bind, unbind, isBound, rebind };

    rebind(TYPES.ICommandStack).to(CommandStack).inSingletonScope();

    configureModelElement(context, Root.TYPE, SRoot, RootView);
    configureModelElement(context, Rect.TYPE, SRect, RectView);
    configureModelElement(context, Ellipse.TYPE, SEllipse, EllipseView);
    configureModelElement(context, Path.TYPE, SPath, PathView);
    configureModelElement(context, Text.TYPE, SText, TextView);
    configureModelElement(context, Canvas.TYPE, SCanvas, CanvasView);
    configureModelElement(context, CanvasElement.TYPE, SCanvasElement, CanvasElementView, {
        enable: [selectFeature, moveFeature, boxSelectFeature]
    });
    configureModelElement(context, AbsolutePoint.TYPE, SAbsolutePoint, AbsolutePointView, {
        enable: [selectFeature, moveFeature, boxSelectFeature]
    });
    configureModelElement(context, RelativePoint.TYPE, SRelativePoint, RelativePointView, {
        enable: [selectFeature, moveFeature, boxSelectFeature]
    });
    configureModelElement(context, LinePoint.TYPE, SLinePoint, LinePointView, {
        enable: [selectFeature, moveFeature, boxSelectFeature]
    });
    configureModelElement(context, CanvasConnection.TYPE, SCanvasConnection, CanvasConnectionView, {
        enable: [selectFeature, moveFeature]
    });
    configureModelElement(context, Marker.TYPE, SMarker, MarkerView, {
        enable: [selectFeature, moveFeature]
    });
    registerModelElement(context, CanvasLineSegment.TYPE, SCanvasLineSegment);
    registerModelElement(context, CanvasBezierSegment.TYPE, SCanvasBezierSegment);
    registerModelElement(context, CanvasAxisAlignedSegment.TYPE, SCanvasAxisAlignedSegment);
});

/**
 * Creates the module for the diagram ui
 *
 * @param widgetId the id of the div to use
 * @returns the container
 */
export function createContainer(widgetId: string): Container {
    const container = new Container();
    // TODO remove this cast after upgrade to inversify 7.x
    loadDefaultModules(container as any, {
        exclude: [
            sprottyUpdateModule,
            sprottyMoveModule,
            sprottyZOrderModule,
            decorationModule,
            sprottyUndoRedoModule,
            exportModule,
            sprottyViewportModule
        ]
    });
    container.load(
        updateModule,
        zorderModule,
        transactionModule,
        moveModule,
        resetCanvasBoundsModule,
        navigationModule,
        canvasContentMoveEditModule,
        splitCanvasSegmentModule,
        viewportModule,
        undoRedoModule,
        toolboxModule,
        configModule,
        createConnectionModule,
        cursorModule,
        selectModule,
        keyStateModule,
        snapModule,
        contribModule
    );
    container.load(diagramModule);

    // TODO remove this cast after upgrade to inversify 7.x
    overrideViewerOptions(container as any, {
        needsClientLayout: false,
        needsServerLayout: false,
        baseDiv: widgetId
    });
    return container;
}
