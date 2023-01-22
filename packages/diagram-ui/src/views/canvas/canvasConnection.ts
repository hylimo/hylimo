import { MarkerRenderInformation, Point } from "@hylimo/diagram-common";
import { injectable } from "inversify";
import { VNode } from "snabbdom";
import { IView, RenderingContext, svg } from "sprotty";
import { SCanvasConnection } from "../../model/canvas/canvasConnection";
import { SCanvasConnectionSegment } from "../../model/canvas/canvasConnectionSegment";
import { SMarker } from "../../model/canvas/marker";

/**
 * IView that represents a CanvasConnection
 */
@injectable()
export class CanvasConnectionView implements IView {
    render(model: Readonly<SCanvasConnection>, context: RenderingContext, args?: {} | undefined): VNode | undefined {
        const segments = model.children.filter(
            (child) => child instanceof SCanvasConnectionSegment
        ) as SCanvasConnectionSegment[];
        const markers = model.children.filter((child) => child instanceof SMarker) as SMarker[];
        const startMarker = markers.find((marker) => marker.pos == "start");
        const endMarker = markers.find((marker) => marker.pos == "end");
        let startPos = model.startPosition;
        let endPos = segments.at(-1)!.endPosition;
        const children: VNode[] = [];
        const childMarkers: VNode[] = [];
        if (endMarker != undefined) {
            let endStartPosition: Point;
            if (segments.length == 1) {
                endStartPosition = startPos;
            } else {
                endStartPosition = segments.at(-2)!.endPosition;
            }
            const renderInformation = segments
                .at(-1)!
                .calculateMarkerRenderInformation(endMarker, endStartPosition, endPos);
            childMarkers.push(this.renderMarker(endMarker, renderInformation, endPos, context));
            endPos = renderInformation.newPoint;
        }
        if (startMarker != undefined) {
            const startSegment = segments[0];
            const renderInformation = startSegment.calculateMarkerRenderInformation(
                startMarker,
                startPos,
                startSegment.endPosition
            );
            childMarkers.push(this.renderMarker(startMarker, renderInformation, startPos, context));
            startPos = renderInformation.newPoint;
        }

        const pathSegments: string[] = [`M ${startPos.x} ${startPos.y}`];
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            let newEnd: Point;
            if (i == segments.length - 1) {
                newEnd = endPos;
            } else {
                newEnd = segment.endPosition;
            }
            pathSegments.push(segment.generatePathString(newEnd));
        }

        return svg(
            "g",
            null,
            svg("path", {
                attrs: {
                    d: pathSegments.join(" "),
                    stroke: model.stroke ?? false,
                    "stroke-opacity": model.strokeOpacity ?? false,
                    "stroke-width": model.strokeWidth ?? false,
                    fill: "none"
                }
            }),
            ...childMarkers
        );
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
        return svg(
            "g",
            {
                attrs: {
                    transform: `translate(${-marker.width / 2},0) rotate(${renderInformation.rotation}) translate(${
                        position.x
                    },${position.y})`
                }
            },
            context.renderElement(marker)
        );
    }
}
