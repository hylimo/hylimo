import { ContainerModule } from "inversify";
import { configureActionHandler, TYPES } from "sprotty";
import { ViewportTouchListener } from "./touch.js";
import { SetModelAction } from "sprotty-protocol";
import { SetModelActionHandler } from "./setModelActionHandler.js";

/**
 * Module which configures the ViewportTouchListener
 */
export const viewportModule = new ContainerModule((bind, _, isBound) => {
    bind(ViewportTouchListener).toSelf().inSingletonScope();
    bind(TYPES.IVNodePostprocessor).toService(ViewportTouchListener);
    configureActionHandler({ bind, isBound }, SetModelAction.KIND, SetModelActionHandler);
});
