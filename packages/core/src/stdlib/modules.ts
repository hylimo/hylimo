import { booleanModule } from "./modules/booleanModule";
import { commonModule } from "./modules/commonModule";
import { debugModule } from "./modules/debugModule";
import { functionModule } from "./modules/functionModule";
import { listModule } from "./modules/listModule";
import { numberModule } from "./modules/numberModule";
import { objectModule } from "./modules/objectModule";
import { operatorModule } from "./modules/operatorModule";
import { stringModule } from "./modules/stringModule";

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
    functionModule
];
