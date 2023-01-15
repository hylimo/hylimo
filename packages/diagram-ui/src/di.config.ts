import { AbsolutePoint, Canvas, CanvasElement, Rect, RelativePoint, Root, Text } from "@hylimo/diagram-common";
import { Container, ContainerModule } from "inversify";
import {
    configureModelElement,
    loadDefaultModules,
    overrideViewerOptions,
    selectFeature,
    updateModule as sprottyUpdateModule,
    moveModule as sprottyMoveModule,
    zorderModule as sprottyZOrderModule
} from "sprotty";
import updateModule from "./features/update/di.config";
import zorderModule from "./features/zorder/di.config";
import { SAbsolutePoint } from "./model/canvas/absolutePoint";
import { SCanvas } from "./model/canvas/canvas";
import { SCanvasElement } from "./model/canvas/canvasElement";
import { SRelativePoint } from "./model/canvas/relativePoint";
import { SRect } from "./model/rect";
import { SRoot } from "./model/root";
import { SText } from "./model/text";
import { AbsolutePointView } from "./views/canvas/absolutePoint";
import { CanvasView } from "./views/canvas/canvas";
import { CanvasElementView } from "./views/canvas/canvasElement";
import { RelativePointView } from "./views/canvas/relativePoint";
import { RectView } from "./views/rect";
import { SRootView } from "./views/root";
import { TextView } from "./views/text";

/**
 * The module used
 */
const diagramModule = new ContainerModule((bind, unbind, isBound, rebind) => {
    const context = { bind, unbind, isBound, rebind };

    configureModelElement(context, Root.TYPE, SRoot, SRootView);
    configureModelElement(context, Rect.TYPE, SRect, RectView);
    configureModelElement(context, Text.TYPE, SText, TextView);
    configureModelElement(context, Canvas.TYPE, SCanvas, CanvasView);
    configureModelElement(context, CanvasElement.TYPE, SCanvasElement, CanvasElementView, {
        enable: [selectFeature]
    });
    configureModelElement(context, AbsolutePoint.TYPE, SAbsolutePoint, AbsolutePointView, {
        enable: [selectFeature]
    });
    configureModelElement(context, RelativePoint.TYPE, SRelativePoint, RelativePointView, {
        enable: [selectFeature]
    });
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
        exclude: [sprottyUpdateModule, sprottyMoveModule, sprottyZOrderModule]
    });
    container.load(updateModule, zorderModule);
    container.load(diagramModule);

    overrideViewerOptions(container, {
        needsClientLayout: false,
        needsServerLayout: false,
        baseDiv: widgetId
    });
    return container;
}
