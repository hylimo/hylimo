import { MarkerRenderInformation, Point } from "@hylimo/diagram-common";
import { injectable } from "inversify";
import { VNode } from "snabbdom";
import { IView, IViewArgs, RenderingContext, svg } from "sprotty";
import { SCanvasConnection } from "../../model/canvas/sCanvasConnection";
import { SCanvasConnectionSegment } from "../../model/canvas/sCanvasConnectionSegment";
import { SMarker } from "../../model/canvas/sMarker";

/**
 * IView that represents a CanvasConnection
 */
@injectable()
export class CanvasConnectionView implements IView {
    render(
        model: Readonly<SCanvasConnection>,
        context: RenderingContext,
        _args?: IViewArgs | undefined
    ): VNode | undefined {
        const segments = model.children.filter(
            (child) => child instanceof SCanvasConnectionSegment
        ) as SCanvasConnectionSegment[];
        const { startPos, childMarkers } = this.renderMarkers(model, segments, context);
        const { path, childControlElements } = this.renderPathAndControlElements(model, startPos, segments);
        return svg(
            "g",
            null,
            svg("path", {
                attrs: {
                    d: path,
                    stroke: model.stroke ?? false,
                    "stroke-opacity": model.strokeOpacity ?? false,
                    "stroke-width": model.strokeWidth ?? false,
                    fill: "none"
                }
            }),
            svg("path", {
                attrs: {
                    d: path
                },
                class: {
                    "select-canvas-connection": true
                }
            }),
            ...childMarkers,
            ...childControlElements
        );
    }

    /**
     * Renders the path segment and child control elements if necessary
     *
     * @param model the model of the connection
     * @param startPos the start position ignoring the markers
     * @param segments the segments of the connection
     * @param endPos the end position ignoring the markers
     * @returns the path string and the child control elements
     */
    private renderPathAndControlElements(
        model: Readonly<SCanvasConnection>,
        startPos: Point,
        segments: SCanvasConnectionSegment[]
    ) {
        const childControlElements: VNode[] = [];
        const showControlElements = model.showControlElements;
        const pathSegments: string[] = [`M ${startPos.x} ${startPos.y}`];
        let originalStart = model.startPosition;
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            const originalEnd = segment.endPosition;
            pathSegments.push(segment.generatePathString());
            if (showControlElements) {
                childControlElements.push(...segment.generateControlViewElements(originalStart));
            }
            originalStart = originalEnd;
        }
        return { path: pathSegments.join(" "), childControlElements };
    }

    /**
     * Renders the marker at the start and end of the connection
     *
     * @param model the model of the connection
     * @param segments the segments of the connection
     * @param context rendering context
     * @returns the new start and end pos of the connection (without the markers), and the childMarkers
     */
    private renderMarkers(
        model: Readonly<SCanvasConnection>,
        segments: SCanvasConnectionSegment[],
        context: RenderingContext
    ) {
        const markers = model.children.filter((child) => child instanceof SMarker) as SMarker[];
        const startMarker = markers.find((marker) => marker.pos == "start");
        const endMarker = markers.find((marker) => marker.pos == "end");
        let startPos = model.startPosition;
        const childMarkers: VNode[] = [];
        if (endMarker != undefined) {
            let endStartPosition: Point;
            if (segments.length == 1) {
                endStartPosition = startPos;
            } else {
                endStartPosition = segments.at(-2)!.endPosition;
            }
            const renderInformation = segments.at(-1)!.calculateMarkerRenderInformation(endMarker, endStartPosition);
            childMarkers.push(this.renderMarker(endMarker, renderInformation, segments.at(-1)!.endPosition, context));
        }
        if (startMarker != undefined) {
            const startSegment = segments[0];
            const renderInformation = startSegment.calculateMarkerRenderInformation(startMarker, startPos);
            childMarkers.push(this.renderMarker(startMarker, renderInformation, startPos, context));
            startPos = renderInformation.newPoint;
        }
        return { startPos, childMarkers };
    }

    /**
     * Renders a marker
     *
     * @param marker the marker to render
     * @param renderInformation required information for rendering
     * @param position the position of the marker
     * @param context rendering context
     * @returns the rendered marker
     */
    private renderMarker(
        marker: SMarker,
        renderInformation: MarkerRenderInformation,
        position: Point,
        context: RenderingContext
    ): VNode {
        const translation = `translate(${position.x - marker.width},${position.y - marker.height / 2})`;
        const rotation = `rotate(${renderInformation.rotation},${marker.width},${marker.height / 2})`;
        return svg(
            "g",
            {
                attrs: {
                    transform: translation + rotation
                }
            },
            context.renderElement(marker)
        );
    }
}