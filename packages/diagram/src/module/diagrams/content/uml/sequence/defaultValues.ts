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
        scope.margin = 5
        scope.instanceDistance = 200
        scope.eventDistance = 30
        
        // Used for internal layout
        scope.internal.sequenceDiagramElements = list() // the whole instance, including '.pos' for the position and '.line' for the vertical line down
        scope.internal.lastSequenceDiagramElement = null // the next element will be positioned at 'elem + rpos(elem, instanceDistance, 0)'
        scope.internal.lastSequenceDiagramEvent = null // the next event will be positioned at 'event + rpos(event, 0, eventDistance)'
    `)
    ]
);
