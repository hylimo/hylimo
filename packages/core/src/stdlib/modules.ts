import { booleanModule } from "./modules/booleanModule.js";
import { commonModule } from "./modules/commonModule.js";
import { debugModule } from "./modules/debugModule.js";
import { functionModule } from "./modules/functionModule.js";
import { listModule } from "./modules/listModule.js";
import { numberModule } from "./modules/numberModule.js";
import { objectModule } from "./modules/objectModule.js";
import { operatorModule } from "./modules/operatorModule.js";
import { stringModule } from "./modules/stringModule.js";
import { wrapperModule } from "./modules/wrapperModule.js";

/**
 * Default baselib modules
 */
export const defaultModules = [
    objectModule,
    debugModule,
    commonModule,
    booleanModule,
    operatorModule,
    numberModule,
    stringModule,
    listModule,
    functionModule,
    wrapperModule
];
