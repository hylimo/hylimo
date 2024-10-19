import { InterpreterModule, parse } from "@hylimo/core";

/**
 * Provides a default margin - the additional (vertical) length that is added to each line on top of its normally calculated borders
 */
export const defaultValues = InterpreterModule.create(
    "uml/sequence/defaultValues",
    [],
    [],
    [
        ...parse(`
        // Exposed and changable variables
        scope.margin = 10
        scope.instanceMargin = 200
        
        // Used for internal layout
        scope.internal.sequenceDiagramTimelines = list()
        scope.internal.lastSequenceDiagramElement = null // the next element will be positioned at 'elem + rpos(elem, instanceMargin, 0)'
    `)
    ]
);
