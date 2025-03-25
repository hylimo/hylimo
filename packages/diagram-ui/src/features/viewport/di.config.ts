import { ContainerModule } from "inversify";
import {
    CenterCommand,
    configureActionHandler,
    configureCommand,
    FitToScreenCommand,
    GetViewportCommand
} from "sprotty";
import { ViewportTouchListener } from "./touch.js";
import { SetModelAction } from "sprotty-protocol";
import { SetModelActionHandler } from "./setModelActionHandler.js";
import { CenterKeyboardListener } from "./fitToScreenKeyboardListener.js";
import { SetViewportCommand } from "./viewport.js";
import { ScrollMouseListener } from "./scroll.js";
import { ZoomMouseListener } from "./zoom.js";
import { TYPES } from "../types.js";
import { PointerCapturePointerListener } from "./pointerCapturePointerListener.js";

/**
 * Module which configures touch support for the viewport and other additional event handlers
 */
export const viewportModule = new ContainerModule((bind, unbind, isBound) => {
    // unmodified
    configureCommand({ bind, isBound }, CenterCommand);
    configureCommand({ bind, isBound }, FitToScreenCommand);
    configureCommand({ bind, isBound }, GetViewportCommand);
    bind(PointerCapturePointerListener).toSelf().inSingletonScope();
    bind(TYPES.IPointerListener).toService(PointerCapturePointerListener);

    // modified
    configureCommand({ bind, isBound }, SetViewportCommand);
    bind(CenterKeyboardListener).toSelf().inSingletonScope();
    bind(TYPES.KeyListener).toService(CenterKeyboardListener);
    bind(ScrollMouseListener).toSelf().inSingletonScope();
    bind(ZoomMouseListener).toSelf().inSingletonScope();
    bind(TYPES.MouseListener).toService(ScrollMouseListener);
    bind(TYPES.MouseListener).toService(ZoomMouseListener);
    bind(ViewportTouchListener).toSelf().inSingletonScope();
    bind(TYPES.ITouchListener).toService(ViewportTouchListener);
    configureActionHandler({ bind, isBound }, SetModelAction.KIND, SetModelActionHandler);
});
