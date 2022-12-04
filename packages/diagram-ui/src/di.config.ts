import { Container, ContainerModule } from "inversify";
import {
    configureModelElement,
    loadDefaultModules,
    overrideViewerOptions,
    PreRenderedElement,
    SGraph,
    SGraphView,
    SShapeElement
} from "sprotty";
import { SRectElement } from "./model/rect";
import { RectView } from "./views/rect";

/**
 * The module used
 */
const diagramModule = new ContainerModule((bind, unbind, isBound, rebind) => {
    const context = { bind, unbind, isBound, rebind };

    // TODO replace with custom implementation which handles fonts
    configureModelElement(context, "root", SGraph, SGraphView);
    configureModelElement(context, "rect", SRectElement, RectView);
});

/**
 * Creates the module for the diagram ui
 *
 * @param widgetId the id of the div to use
 * @returns the container
 */
export function createContainer(widgetId: string): Container {
    const container = new Container();
    loadDefaultModules(container);
    container.load(diagramModule);

    overrideViewerOptions(container, {
        needsClientLayout: false,
        needsServerLayout: false,
        baseDiv: widgetId
    });
    return container;
}
