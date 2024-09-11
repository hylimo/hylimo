import { ContainerModule } from "inversify";
import { TYPES } from "sprotty";
import { ViewportTouchListener } from "./touch.js";

/**
 * Module which configures the ViewportTouchListener
 */
export const viewportModule = new ContainerModule((bind) => {
    bind(ViewportTouchListener).toSelf().inSingletonScope();
    bind(TYPES.IVNodePostprocessor).toService(ViewportTouchListener);
});