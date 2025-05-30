import type { ExecutableAbstractFunctionExpression, FullObject, Type } from "@hylimo/core";
import { fun, listType, optional, stringType } from "@hylimo/core";
import type { LayoutElement, LayoutConfig, AttributeConfig } from "../layoutElement.js";
import { ContentCardinality } from "../layoutElement.js";
import type { Matrix } from "transformation-matrix";
import { BaseLayoutConfig } from "./baseLayoutConfig.js";

/**
 * Base class for all layout element configs
 */
export abstract class ElementLayoutConfig extends BaseLayoutConfig implements LayoutConfig {
    /**
     * Supported non-style attributes
     */
    readonly attributes: AttributeConfig[] = [
        {
            name: "class",
            description: "classes, can be used for styling",
            type: optional(listType(stringType))
        }
    ];

    /**
     * Supported style attributes
     */
    readonly styleAttributes: AttributeConfig[];

    /**
     * The content or contents attribute if present, otherwise an empty array
     */
    readonly contentAttributes: AttributeConfig[];

    /**
     * What type of element is supported
     */
    abstract readonly type: string;

    /**
     * A string prefix which uses a specific group of ids for the element
     * To keep short ids, should be short / a single character
     */
    readonly idGroup: string = "";

    /**
     * Assigns type and styleAttributes
     *
     * @param additionalAttributes additional non-style attributes
     * @param styleAttributes the supported style attributes
     * @param contentType the type of the contents attribute
     * @param contentCardinality the cardinality of the contents attribute
     */
    constructor(
        additionalAttributes: AttributeConfig[],
        styleAttributes: AttributeConfig[],
        readonly contentType: Type,
        readonly contentCardinality: ContentCardinality
    ) {
        super();
        this.attributes.push(...additionalAttributes);
        this.styleAttributes = styleAttributes.map((attribute) => ({
            name: attribute.name,
            description: attribute.description,
            type: optional(attribute.type)
        }));
        this.contentAttributes = this.computeContentAttributes();
    }

    /**
     * Computes the attribute configs for the content or contents attribute
     *
     * @returns an array of the content or contents attribute config or an empty array
     */
    private computeContentAttributes(): AttributeConfig[] {
        const isManyContent =
            this.contentCardinality === ContentCardinality.Many ||
            this.contentCardinality === ContentCardinality.AtLeastOne;
        const contentAttributes: AttributeConfig[] = [];
        if (isManyContent) {
            contentAttributes.push({
                name: "contents",
                description: "the contents of the element",
                type: optional(listType(this.contentType))
            });
        }
        return contentAttributes;
    }

    /**
     * Returns the children of the element
     *
     * @param element the element to get the children of
     * @returns the children of the element
     */
    abstract getChildren(element: LayoutElement): FullObject[];

    /**
     * Called to provide a function which evaluates to the prototype of the element.
     * The function will be called with the general element prototype as first argument.
     *
     * @returns the prototype generation function
     */
    createPrototype(): ExecutableAbstractFunctionExpression {
        return fun("[proto = it]");
    }

    /**
     * Creates a matrix which transforms from the local to the parent coordinate system
     * Can return undefined if the element does not have a parent or if the transformation is the identity matrix
     *
     * @param _element the element to transform
     * @returns the transformation matrix
     */
    localToParent(_element: LayoutElement): Matrix | undefined {
        return undefined;
    }
}
