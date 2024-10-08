import { ContainerModule } from "inversify";
import { configureActionHandler, TYPES } from "sprotty";
import { ViewportTouchListener } from "./touch.js";
import { SetModelAction } from "sprotty-protocol";
import { SetModelActionHandler } from "./setModelActionHandler.js";
import { CenterKeyboardListener } from "./fitToScreenKeyboardListener.js";
import { CenterKeyboardListener as SprottyCenterKeyboardListener } from "sprotty";

/**
 * Module which configures touch support for the viewport and other additional event handlers
 */
export const viewportModule = new ContainerModule((bind, unbind, isBound, rebind) => {
    bind(ViewportTouchListener).toSelf().inSingletonScope();
    bind(TYPES.IVNodePostprocessor).toService(ViewportTouchListener);

    // Sprotty has a default behavior for ctrl+shift+f/c that we want to customize
    bind(CenterKeyboardListener).toSelf().inSingletonScope();
    rebind(SprottyCenterKeyboardListener).toService(CenterKeyboardListener);

    // Layout viewport on initial load
    configureActionHandler({ bind, isBound }, SetModelAction.KIND, SetModelActionHandler);
});
