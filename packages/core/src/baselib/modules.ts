import { booleanModule } from "./modules/boolean";
import { commonModule } from "./modules/common";
import { debugModule } from "./modules/debug";
import { numberModule } from "./modules/number";
import { objectModule } from "./modules/object";
import { operatorModule } from "./modules/operator";

/**
 * Default baselib modules
 */
export const defaultModules = [objectModule, debugModule, commonModule, booleanModule, operatorModule, numberModule];
