import { enumObject, id } from "@hylimo/core";
import { ContentModule } from "../contentModule.js";
import { SCOPE } from "../../../base/dslModule.js";

/**
 * Module providing enums for DSL usage
 */
export const enumsModule = ContentModule.create(
    "base/enum",
    [],
    [],
    [
        id(SCOPE).assignField(
            "Position",
            enumObject({
                Right: 0,
                BottomRight: 0.125,
                Bottom: 0.25,
                BottomLeft: 0.375,
                Left: 0.5,
                TopLeft: 0.625,
                Top: 0.75,
                TopRight: 0.875
            })
        ),
        id(SCOPE).assignField(
            "VAlign",
            enumObject({
                Top: "top",
                Center: "center",
                Bottom: "bottom"
            })
        ),
        id(SCOPE).assignField(
            "HAlign",
            enumObject({
                Left: "left",
                Center: "center",
                Right: "right"
            })
        ),
        id(SCOPE).assignField(
            "Visibility",
            enumObject({
                Visible: "visible",
                Hidden: "hidden",
                Collapse: "collapse"
            })
        )
    ]
);
