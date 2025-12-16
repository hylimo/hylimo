import { ContainerModule } from "inversify";
import { DiagramStateProvider } from "./diagramStateProvider.js";
import { TYPES } from "../types.js";
import { configureActionHandler } from "sprotty";
import { DiagramErrorAction } from "@hylimo/diagram-protocol";
import { SetModelAction, UpdateModelAction } from "sprotty-protocol";

/**
 * Diagram state feature module
 */
export const diagramStateModule = new ContainerModule((bind, _unbind, isBound) => {
    const context = { bind, isBound };
    bind(DiagramStateProvider).toSelf().inSingletonScope();
    bind(TYPES.DiagramStateProvider).toService(DiagramStateProvider);
    configureActionHandler(context, DiagramErrorAction.KIND, DiagramStateProvider);
    configureActionHandler(context, UpdateModelAction.KIND, DiagramStateProvider);
    configureActionHandler(context, SetModelAction.KIND, DiagramStateProvider);
});
