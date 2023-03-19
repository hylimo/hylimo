import { MarkerLayoutInformation, Point } from "@hylimo/diagram-common";
import { injectable } from "inversify";
import { VNode } from "snabbdom";
import { IView, IViewArgs, RenderingContext, svg } from "sprotty";
import { SCanvasConnection } from "../../model/canvas/sCanvasConnection";
import { SCanvasConnectionSegment } from "../../model/canvas/sCanvasConnectionSegment";
import { SMarker } from "../../model/canvas/sMarker";
import { extractStrokeAttriabutes } from "../attributeHelpers";

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
        const childMarkers = this.renderMarkers(model, segments, context);
        const { path, childControlElements } = this.renderPathAndControlElements(model, segments);
        return svg(
            "g",
            null,
            svg("path", {
                attrs: {
                    d: path,
                    ...extractStrokeAttriabutes(model),
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
     * @param endPos the end position ignoring the markers
     * @returns the path string and the child control elements
     */
    private renderPathAndControlElements(model: Readonly<SCanvasConnection>, segments: SCanvasConnectionSegment[]) {
        const layout = model.layout;
        const childControlElements: VNode[] = [];
        const showControlElements = model.showControlElements;
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            if (showControlElements) {
                childControlElements.push(...segment.generateControlViewElements(layout.segments[i]));
            }
        }
        return { path: layout.path, childControlElements };
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
    ): VNode[] {
        const startMarker = model.startMarker;
        const endMarker = model.endMarker;
        const childMarkers: VNode[] = [];
        if (endMarker != undefined) {
            const renderInformation = model.layout.endMarker!;
            childMarkers.push(this.renderMarker(endMarker, renderInformation, segments.at(-1)!.endPosition, context));
        }
        if (startMarker != undefined) {
            const renderInformation = model.layout.startMarker!;
            childMarkers.push(this.renderMarker(startMarker, renderInformation, model.startPosition, context));
        }
        return childMarkers;
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
        renderInformation: MarkerLayoutInformation,
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
