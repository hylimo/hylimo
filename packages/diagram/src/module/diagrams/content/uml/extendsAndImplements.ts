import { InterpreterModule } from "@hylimo/core";

/**
 * Module providing extends and implements connection operators
 */
export const extendsAndImplementsModule = InterpreterModule.create(
    "uml/extendsAndImplements",
    ["common/defaultMarkers"],
    [],
    `
        this.create = scope.internal.createConnectionOperator
        scope.extends = create(
            endMarkerFactory = scope.defaultMarkers.triangle
        )
        scope.implements = create(
            endMarkerFactory = scope.defaultMarkers.triangle,
            class = list("dashed-connection")
        )
    `
);
