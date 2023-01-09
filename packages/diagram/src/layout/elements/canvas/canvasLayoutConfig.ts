import { FullObject, objectToList, RuntimeError } from "@hylimo/core";
import {
    Size,
    Point,
    Element,
    CanvasPoint,
    AbsolutePoint,
    RelativePoint,
    LinePoint,
    Canvas
} from "@hylimo/diagram-common";
import { LayoutElement, SizeConstraints } from "../../layoutElement";
import { Layout } from "../../layoutEngine";
import { StyledElementLayoutConfig } from "../styledElementLayoutConfig";

/**
 * Layout config for the canvas
 */
export class CanvasLayoutConfig extends StyledElementLayoutConfig {
    constructor() {
        super("canvas", [], []);
    }

    override measure(layout: Layout, element: LayoutElement, constraints: SizeConstraints): Size {
        // TODO (maybe) better size calculation
        const contents = this.getContents(element);
        element.contents = contents.map((content) =>
            layout.measure(content, element, { min: { width: 0, height: 0 }, max: constraints.max })
        );
        return constraints.max;
    }

    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        const contents = element.contents as LayoutElement[];
        const contentIdLookup = new Map<FullObject, string>();
        for (let i = 0; i < contents.length; i++) {
            contentIdLookup.set(contents[i].element, `${id}_${i}`);
        }
        const points = this.convertPoints(element, contentIdLookup, id);
        const result: Canvas = {
            type: "canvas",
            id,
            ...position,
            ...size,
            points,
            children: contents.flatMap((content) =>
                layout.layout(content, position, content.measuredSize!, contentIdLookup.get(content.element)!)
            )
        };
        return [result];
    }

    /**
     * Converts the points associated with the provided element to CanvasPoints
     *
     * @param element the element providing all points
     * @param contentIdLookup id lookup for items of the canvas
     * @param id start of the point id string
     * @returns the list of created CanvasPoints
     */
    private convertPoints(element: LayoutElement, contentIdLookup: Map<FullObject, string>, id: string): CanvasPoint[] {
        const rawPointList = element.element.getLocalFieldOrUndefined("points");
        const points = objectToList(rawPointList?.value as FullObject);
        const pointIdLookup = new Map<FullObject, string>();
        const canvasPoints: CanvasPoint[] = [];
        for (let i = 0; i < points.length; i++) {
            const pointId = `${id}_p${i}`;
            const rawPoint = points[i] as FullObject;
            pointIdLookup.set(rawPoint, pointId);
        }
        for (const [rawPoint, pointId] of pointIdLookup.entries()) {
            const type = rawPoint.getLocalFieldOrUndefined("type");
            switch (type?.value.toNative()) {
                case "absolutePoint":
                    canvasPoints.push(this.convertAbsolutePoint(rawPoint, pointId));
                    break;
                case "relativePoint":
                    canvasPoints.push(this.convertRelativePoint(rawPoint, pointId, pointIdLookup));
                    break;
                case "linePoint":
                    canvasPoints.push(this.convertLinePoint(rawPoint, pointId, contentIdLookup));
                    break;
            }
        }
        element.points = pointIdLookup;
        return canvasPoints;
    }

    /**
     * Converts a FullObject to an AbsolutePoint
     *
     * @param point the point to convert
     * @param id the id of the converted point
     * @returns the converted point
     */
    private convertAbsolutePoint(point: FullObject, id: string): AbsolutePoint {
        const xFieldEntry = point.getLocalFieldOrUndefined("x");
        const yFieldEntry = point.getLocalFieldOrUndefined("y");
        return {
            id,
            x: xFieldEntry?.value?.toNative(),
            y: yFieldEntry?.value.toNative(),
            editable: !!xFieldEntry?.source && !!yFieldEntry?.source
        };
    }

    /**
     * Converts a FullObject to an RelativePoint
     *
     * @param point the point to convert
     * @param id the id of the converted point
     * @returns the converted point
     */
    private convertRelativePoint(point: FullObject, id: string, pointIdLookup: Map<FullObject, string>): RelativePoint {
        const xOffsetFieldEntry = point.getLocalFieldOrUndefined("offsetX");
        const yOffsetFieldEntry = point.getLocalFieldOrUndefined("offsetY");
        const target = pointIdLookup.get(point.getLocalFieldOrUndefined("target")!.value as FullObject);
        if (!target) {
            throw new RuntimeError("Cannot resolve dependency of relative point");
        }
        return {
            id,
            offsetX: xOffsetFieldEntry?.value?.toNative(),
            offsetY: yOffsetFieldEntry?.value.toNative(),
            target,
            editable: !!xOffsetFieldEntry?.source && !!yOffsetFieldEntry?.source
        };
    }

    /**
     * Converts a FullObject to an LinePoint
     *
     * @param point the point to convert
     * @param id the id of the converted point
     * @returns the converted point
     */
    private convertLinePoint(point: FullObject, id: string, contentIdLookup: Map<FullObject, string>): LinePoint {
        const positionFieldEntry = point.getLocalFieldOrUndefined("position");
        const lineProvider = contentIdLookup.get(point.getLocalFieldOrUndefined("lineProvider")!.value as FullObject);
        if (!lineProvider) {
            throw new RuntimeError("Cannot resolve dependency of line point");
        }
        return {
            id,
            position: positionFieldEntry?.value?.toNative(),
            lineProvider,
            editable: !!positionFieldEntry?.source
        };
    }

    /**
     * Gets the contents of a panel
     *
     * @param element the element containing the contents
     * @returns the contents
     */
    private getContents(element: LayoutElement): FullObject[] {
        const contents = element.element.getLocalFieldOrUndefined("contents")?.value as FullObject | undefined;
        if (contents) {
            return objectToList(contents) as FullObject[];
        } else {
            return [];
        }
    }
}
