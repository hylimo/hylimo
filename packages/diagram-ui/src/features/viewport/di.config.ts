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
export const viewportModule = new ContainerModule((bind, unbind, isBound) => {
    bind(ViewportTouchListener).toSelf().inSingletonScope();
    bind(TYPES.IVNodePostprocessor).toService(ViewportTouchListener);
    // unbind(SprottyCenterKeyboardListener);
    bind(CenterKeyboardListener).toSelf().inSingletonScope();
    configureActionHandler({ bind, isBound }, SetModelAction.KIND, SetModelActionHandler);
});
