import { ContainerModule } from "inversify";
import { configureActionHandler, configureCommand, TYPES } from "sprotty";
import { Toolbox } from "./toolbox.js";
import { SetModelAction, UpdateModelAction } from "sprotty-protocol";

/**
 * Toolbox module
 */
export const toolboxModule = new ContainerModule((bind, _unbind, isBound) => {
    const context = { bind, isBound };
    bind(Toolbox).toSelf().inSingletonScope();
    bind(TYPES.IUIExtension).toService(Toolbox);
    configureActionHandler(context, UpdateModelAction.KIND, Toolbox);
    configureActionHandler(context, SetModelAction.KIND, Toolbox);
});
