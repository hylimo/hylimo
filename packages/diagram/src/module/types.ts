import { literal, objectType, SemanticFieldNames } from "@hylimo/core";

/**
 * Type for any type of point
 */
export const canvasPointType = objectType(
    new Map([[SemanticFieldNames.PROTO, objectType(new Map([["_type", literal("element")]]))]])
);
