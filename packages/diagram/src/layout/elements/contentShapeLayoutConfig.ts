import { literal, objectType, optional, SemanticFieldNames } from "@hylimo/core";
import { AttributeConfig } from "../layoutElement";
import { ShapeLayoutConfig } from "./shapeLayoutConfig";

/**
 * Base class for all shape layout configs with a content
 */
export abstract class ContentShapeLayoutConfig extends ShapeLayoutConfig {
    /**
     * Creats a new ContentShapeLayoutconfig
     *
     * @param type the supported type
     * @param additionalAttributes additional non-style attributes
     * @param additionalStyleAttributes the supported additional style attributes
     */
    constructor(type: string, additionalAttributes: AttributeConfig[], additionalStyleAttributes: AttributeConfig[]) {
        super(
            type,
            [
                {
                    name: "content",
                    description: "the inner element",
                    type: optional(
                        objectType(
                            new Map([[SemanticFieldNames.PROTO, objectType(new Map([["_type", literal("element")]]))]])
                        )
                    )
                },
                ...additionalAttributes
            ],
            additionalStyleAttributes
        );
    }
}
