import { CstParser } from "chevrotain";
import { lexerDefinition } from "./lexer";

export class Parser extends CstParser {
    constructor() {
        super(Object.values(lexerDefinition), {
            nodeLocationTracking: "full"
        });

        const $ = this;
    }
}
