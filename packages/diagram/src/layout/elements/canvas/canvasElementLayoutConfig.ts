import {
    objectType,
    SemanticFieldNames,
    literal,
    FullObject,
    numberType,
    optional,
    FunctionExpression
} from "@hylimo/core";
import { Size, Point, Element, CanvasElement, ModificationSpecification } from "@hylimo/diagram-common";
import { canvasPointType } from "../../../module/types";
import { HorizontalAlignment, LayoutElement, SizeConstraints, VerticalAlignment } from "../../layoutElement";
import { Layout } from "../../layoutEngine";
import { alignStyleAttributes } from "../attributes";
import { EditableCanvasContentLayoutConfig } from "./editableCanvasContentLayoutConfig";

/**
 * Layout config for canvas element
 */
export class CanvasElementLayoutConfig extends EditableCanvasContentLayoutConfig {
    override isLayoutContent = false;

    constructor() {
        super(
            CanvasElement.TYPE,
            [
                {
                    name: "content",
                    description: "the inner element",
                    type: objectType(
                        new Map([[SemanticFieldNames.PROTO, objectType(new Map([["_type", literal("element")]]))]])
                    )
                },
                {
                    name: "pos",
                    description: "the position of the canvasElement",
                    type: optional(canvasPointType)
                }
            ],
            [
                ...alignStyleAttributes,
                {
                    name: "rotation",
                    description: "the rotation in degrees",
                    type: numberType
                }
            ]
        );
    }

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        const content = element.element.getLocalFieldOrUndefined("content")?.value as FullObject;
        const contentElement = layout.measure(content, element, constraints);
        element.content = contentElement;
        return contentElement.measuredSize!;
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const content = element.content as LayoutElement;
        let x = 0;
        const hAlign = element.styles.hAlign;
        if (hAlign === HorizontalAlignment.RIGHT) {
            x = -size.width;
        } else if (hAlign === HorizontalAlignment.CENTER) {
            x = -size.width / 2;
        }
        let y = 0;
        const vAlign = element.styles.vAlign;
        if (vAlign === VerticalAlignment.BOTTOM) {
            y = -size.height;
        } else if (vAlign === VerticalAlignment.CENTER) {
            y = -size.height / 2;
        }
        const posCanvasPoint = element.element.getLocalFieldOrUndefined("pos")?.value as FullObject | undefined;
        const result: CanvasElement = {
            id,
            type: CanvasElement.TYPE,
            ...size,
            x,
            y,
            rotation: element.styles.rotation ?? 0,
            children: layout.layout(content, Point.ORIGIN, size, `${id}_0`),
            pos: posCanvasPoint != undefined ? this.getContentId(element, posCanvasPoint) : undefined,
            resizable: null, //TODO fix
            rotateable: this.generateModificationSpecification({
                rotation: element.styleSources.get("rotation")?.source
            }),
            moveable:
                posCanvasPoint == undefined
                    ? this.generateModificationSpecificationForScopeField("layout", element)
                    : null,
            outline: content.layoutConfig.outline(
                layout,
                content,
                content.layoutBounds!.position,
                content.layoutBounds!.size
            )
        };
        return [result];
    }

    /**
     * Generates a modification specification for adding a field by adding it to an already existing scope or creating a new scope
     *
     * @param scopeName the name of the scope where the field should be added
     * @param element the element to which the field should be added
     * @returns the generated modification specification
     */
    private generateModificationSpecificationForScopeField(
        scopeName: string,
        element: LayoutElement
    ): ModificationSpecification {
        const scopes = element.element.getLocalFieldOrUndefined("scopes")!.value as FullObject;
        const scope = scopes.getLocalFieldOrUndefined(scopeName)?.source;
        if (scope != undefined) {
            if (!(scope instanceof FunctionExpression)) {
                return null;
            }
            return this.generateModificationSpecification({ scope: scope });
        } else {
            const source = element.element.getLocalFieldOrUndefined("source")?.source;
            if (source != undefined) {
                return this.generateModificationSpecification({ source: source });
            } else {
                return null;
            }
        }
    }
}
