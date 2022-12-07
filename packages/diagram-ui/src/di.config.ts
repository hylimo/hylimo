import { Container, ContainerModule } from "inversify";
import { configureModelElement, loadDefaultModules, overrideViewerOptions, SGraph, SGraphView } from "sprotty";
import { SRect } from "./model/rect";
import { SRoot } from "./model/root";
import { SText } from "./model/text";
import { RectView } from "./views/rect";
import { SRootView } from "./views/root";
import { TextView } from "./views/text";

/**
 * The module used
 */
const diagramModule = new ContainerModule((bind, unbind, isBound, rebind) => {
    const context = { bind, unbind, isBound, rebind };

    // TODO replace with custom implementation which handles fonts
    configureModelElement(context, "root", SRoot, SRootView);
    configureModelElement(context, "rect", SRect, RectView);
    configureModelElement(context, "text", SText, TextView);
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
