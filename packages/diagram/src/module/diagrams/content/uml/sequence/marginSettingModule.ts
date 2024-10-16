import { InterpreterModule, parse } from "@hylimo/core";

/**
 * Provides a default margin - the additional (vertical) length that is added to each line on top of its normally calculated borders
 */
export const marginSettingModule = InterpreterModule.create(
    "uml/sequence/margin",
    [],
    [],
    [
        ...parse(`
        scope.margin = 25
    `)
    ]
);
