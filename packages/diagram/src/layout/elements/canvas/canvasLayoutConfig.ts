import type { FullObject } from "@hylimo/core";
import { objectToList } from "@hylimo/core";
import type { Size, Element, Bounds, MarkerLayoutInformation } from "@hylimo/diagram-common";
import {
    Point,
    Canvas,
    CanvasElement,
    CanvasConnection,
    AbsolutePoint,
    RelativePoint,
    LinePoint,
    Math2D,
    svgPathBbox
} from "@hylimo/diagram-common";
import type { LayoutElement } from "../../layoutElement.js";
import { ContentCardinality } from "../../layoutElement.js";
import type { Layout } from "../../engine/layout.js";
import { StyledElementLayoutConfig } from "../styledElementLayoutConfig.js";
import { elementType } from "../../../module/base/types.js";
import { booleanType, objectType, optional } from "@hylimo/core";
import type { CanvasContentLayoutConfig } from "./canvasContentLayoutConfig.js";

/**
 * Layout config for the canvas
 */
export class CanvasLayoutConfig extends StyledElementLayoutConfig {
    override type = Canvas.TYPE;

    constructor() {
        super(
            [
                {
                    name: "syncWith",
                    description:
                        "if set, this canvas joins the group anchored at the given canvas, which must be one of " +
                        "its ancestors, and shares a coordinate space with the group's other members along the " +
                        "axes set to true",
                    type: optional(
                        objectType(
                            new Map([
                                ["canvas", elementType(Canvas.TYPE)],
                                ["x", optional(booleanType)],
                                ["y", optional(booleanType)]
                            ])
                        )
                    )
                }
            ],
            [],
            elementType(
                CanvasElement.TYPE,
                CanvasConnection.TYPE,
                AbsolutePoint.TYPE,
                RelativePoint.TYPE,
                LinePoint.TYPE
            ),
            ContentCardinality.Many
        );
    }

    override measure(layout: Layout, element: LayoutElement): Size {
        const contents = element.children;
        layout.clearCanvasGroup(element.id);
        this.measureContents(layout, contents);
        if (layout.hasCanvasGroup(element.id)) {
            layout.resolveCanvasGroup(element.id);
            this.measureContents(layout, contents);
        }

        const children: Element[] = [];
        const layoutChildren: Element[] = [];
        for (const content of contents) {
            const newChildren = layout.layout(content, Point.ORIGIN, content.measuredSize!);
            if ((content.layoutConfig as CanvasContentLayoutConfig).isLayoutContent || content.isHidden) {
                layoutChildren.push(...newChildren);
            } else {
                children.push(...newChildren);
            }
        }
        const childBounds: Bounds[] = [];
        for (const child of children) {
            if (child.type == CanvasElement.TYPE) {
                childBounds.push(this.calculateCanvasElementBounds(child as CanvasElement, layout));
            } else if (child.type == CanvasConnection.TYPE) {
                childBounds.push(...this.calculateConnectionBounds(child as CanvasConnection, layout));
            }
        }
        const ownBounds = Math2D.mergeBounds(childBounds);
        const sync = this.extractSync(layout, element);
        const bounds = sync != undefined ? layout.applyCanvasGroup(sync.anchor, ownBounds, sync) : ownBounds;
        element.childElements = [...children, ...layoutChildren];
        element.canvasBounds = bounds;

        return bounds.size;
    }

    /**
     * Measures all contents of the canvas, without any size constraints.
     *
     * Re-measuring is safe: the layout element tree, and with it every id, is built once by `Layout.create`, which
     * is what lets the box layouts re-measure a child whose final length differs too.
     *
     * @param layout performs the layout
     * @param contents the contents to measure
     */
    private measureContents(layout: Layout, contents: LayoutElement[]): void {
        for (const content of contents) {
            layout.measure(content, {
                min: { width: 0, height: 0 },
                max: { width: Number.POSITIVE_INFINITY, height: Number.POSITIVE_INFINITY }
            });
        }
    }

    /**
     * Reads the group this canvas joins, if it joins one.
     *
     * Membership is stated by the member naming its anchor, rather than inferred from sitting below a canvas that
     * declared a group: nesting alone says nothing about intent, and a package drawn inside a swimlane would
     * otherwise be stretched to the lane's flow extent merely for being there.
     *
     * The anchor has to be an ancestor. That is not a convention but what makes the group resolvable: a canvas
     * measures all of its contents before laying any of them out, which is the barrier the two resolution passes
     * rely on, and only an ancestor is guaranteed to provide it.
     *
     * @param layout performs the layout
     * @param element the canvas to read
     * @returns the group this canvas joins, or undefined if it joins none
     */
    private extractSync(layout: Layout, element: LayoutElement): CanvasSync | undefined {
        const syncWith = element.element.getLocalFieldOrUndefined("syncWith")?.value as FullObject | undefined;
        if (syncWith == undefined) {
            return undefined;
        }
        const anchorElement = syncWith.getLocalFieldOrUndefined("canvas")?.value as FullObject;
        const anchor = layout.getElementId(anchorElement);
        if (!layout.isChildElement(layout.layoutElementLookup.get(anchor)!, element)) {
            throw new Error("The canvas a canvas syncs with must be one of its ancestors");
        }
        return {
            anchor,
            x: syncWith.getLocalFieldOrUndefined("x")?.value?.toNative() === true,
            y: syncWith.getLocalFieldOrUndefined("y")?.value?.toNative() === true
        };
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const bounds = element.canvasBounds as Bounds;
        const children = element.childElements as Element[];
        const result: Canvas = {
            type: Canvas.TYPE,
            id,
            ...position,
            ...size,
            dx: position.x - bounds.position.x,
            dy: position.y - bounds.position.y,
            children: children,
            edits: element.edits
        };
        return [result];
    }

    /**
     * Calculates the bounds of a rotated rectangle
     * Model:
     * A rectangle is located at pos (where pos is the top left corner).
     * The rectangle has the given width and height.
     * The rectangle is then moved by x and y relative to pos, and then rotated by rotation around pos.
     * The model was chosen as it maps relatively well to the bounding box of a canvas element and marker.
     *
     * @param pos the position of the element
     * @param rotation the rotation of the element in degrees
     * @param x the relative x position
     * @param y the relative y position
     * @param width the width of the element
     * @param height the height of the element
     * @returns the bounds of the element
     */
    private calculateRotatedRectangleBounds(
        pos: Point,
        rotation: number,
        x: number,
        y: number,
        width: number,
        height: number
    ): Bounds {
        const bounds = Math2D.rotateBounds(
            { position: { x: x, y: y }, size: { width, height } },
            (rotation * Math.PI) / 180
        );
        return {
            position: {
                x: bounds.position.x + pos.x,
                y: bounds.position.y + pos.y
            },
            size: bounds.size
        };
    }

    /**
     * Calculates the bounds for the given canvas element
     *
     * @param element the element to calculate the bounds for
     * @param layout the layout providing the canvas layout engine
     * @returns the bounds of the element
     */
    private calculateCanvasElementBounds(element: CanvasElement, layout: Layout): Bounds {
        const pos = layout.layoutEngine.layoutElement(element);
        return this.calculateRotatedRectangleBounds(
            pos,
            element.rotation,
            element.dx,
            element.dy,
            element.width,
            element.height
        );
    }

    /**
     * Calculates the bounds for the given canvas connection
     *
     * @param connection the connection to calculate the bounds for
     * @param layout the layout providing the canvas layout engine
     * @returns the bounds of the connection (and if existing, the markers)
     */
    private calculateConnectionBounds(connection: CanvasConnection, layout: Layout): Bounds[] {
        const connectionLayout = layout.layoutEngine.layoutConnection(connection);
        const pathBounds = svgPathBbox(connectionLayout.path, connection.stroke);
        const bounds: Bounds[] = [
            {
                position: {
                    x: pathBounds.x - pathBounds.overflow.left,
                    y: pathBounds.y - pathBounds.overflow.top
                },
                size: {
                    width: pathBounds.width + pathBounds.overflow.left + pathBounds.overflow.right,
                    height: pathBounds.height + pathBounds.overflow.top + pathBounds.overflow.bottom
                }
            }
        ];
        if (connectionLayout.startMarker != undefined) {
            bounds.push(this.calculateMarkerBounds(connectionLayout.startMarker));
        }
        if (connectionLayout.endMarker != undefined) {
            bounds.push(this.calculateMarkerBounds(connectionLayout.endMarker));
        }
        return bounds;
    }

    /**
     * Calculates the bounds for the given marker
     * See {@link Marker} how a marker is aligned relative to the connection start or end
     *
     * @param markerLayout the layout information of the marker
     * @returns the bounds of the marker
     */
    private calculateMarkerBounds(markerLayout: MarkerLayoutInformation): Bounds {
        const marker = markerLayout.marker;
        const x = -marker.width * markerLayout.marker.refX;
        const y = -marker.height * markerLayout.marker.refY;
        return this.calculateRotatedRectangleBounds(
            markerLayout.position,
            markerLayout.rotation,
            x,
            y,
            marker.width,
            marker.height
        );
    }

    override getChildren(element: LayoutElement): FullObject[] {
        const contents = element.element.getLocalFieldOrUndefined("contents")?.value as FullObject | undefined;
        if (contents) {
            return objectToList(contents) as FullObject[];
        } else {
            return [];
        }
    }
}

/**
 * The group a canvas joins, and the axes it shares with the group's other members
 */
export interface CanvasSync {
    /**
     * The id of the canvas the group is anchored at, always an ancestor of the member
     */
    anchor: string;
    /**
     * Whether the x axis is shared, used by swimlanes whose flow runs left to right
     */
    x: boolean;
    /**
     * Whether the y axis is shared, used by swimlanes whose flow runs top to bottom
     */
    y: boolean;
}
