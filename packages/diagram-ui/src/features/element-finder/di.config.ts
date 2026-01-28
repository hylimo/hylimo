import { TYPES } from "../types.js";
import { ElementFinder } from "./elementFinder.js";
import { ContainerModule } from "inversify";

/**
 * Module for element finder feature
 */
export const elementFinderModule = new ContainerModule((bind) => {
    bind(ElementFinder).toSelf().inSingletonScope();
    bind(TYPES.ElementFinder).toService(ElementFinder);
});
