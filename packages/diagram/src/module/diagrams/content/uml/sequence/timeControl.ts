import { fun, id, numberType } from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { ContentModule } from "../../contentModule.js";

/**
 * Module providing time control functions for sequence diagrams.
 */
export const timeControlModule = ContentModule.create(
    "uml/sequence/timeControl",
    ["uml/sequence/diagramState"],
    [],
    [
        id(SCOPE).assignField(
            "delay",
            fun(
                `
                    (offset) = args
                    this.position = scope.internal.calculatePosition(after = offset, priority = 3)
                    scope.internal.updateSequenceDiagramPosition(position)
                `,
                {
                    docs: "Delays the current position by a relative offset",
                    params: [[0, "the relative y offset from the current position", numberType]],
                    returns: "void",
                    snippet: "($1)"
                }
            )
        ),
        id(SCOPE).assignField(
            "moveTo",
            fun(
                `
                    (position) = args
                    this.calculatedPosition = scope.internal.calculatePosition(at = position)
                    scope.internal.updateSequenceDiagramPosition(calculatedPosition)
                `,
                {
                    docs: "Moves to an absolute y position",
                    params: [[0, "the absolute y position to move to", numberType]],
                    returns: "void",
                    snippet: "($1)"
                }
            )
        )
    ]
);
