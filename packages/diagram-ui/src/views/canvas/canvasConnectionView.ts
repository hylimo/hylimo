import { MarkerLayoutInformation } from "@hylimo/diagram-common";
import { injectable } from "inversify";
import { VNode } from "snabbdom";
import { IView, IViewArgs, RenderingContext, svg } from "sprotty";
import { SCanvasConnection } from "../../model/canvas/sCanvasConnection.js";
import { SCanvasConnectionSegment } from "../../model/canvas/sCanvasConnectionSegment.js";
import { SMarker } from "../../model/canvas/sMarker.js";
import { extractStrokeAttriabutes } from "@hylimo/diagram-render-svg";

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
        const childMarkers = this.renderMarkers(model, context);
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
    private renderMarkers(model: Readonly<SCanvasConnection>, context: RenderingContext): VNode[] {
        const startMarker = model.startMarker;
        const endMarker = model.endMarker;
        const childMarkers: VNode[] = [];
        if (endMarker != undefined) {
            const renderInformation = model.layout.endMarker!;
            childMarkers.push(this.renderMarker(endMarker, renderInformation, context));
        }
        if (startMarker != undefined) {
            const renderInformation = model.layout.startMarker!;
            childMarkers.push(this.renderMarker(startMarker, renderInformation, context));
        }
        return childMarkers;
    }

    /**
     * Renders a marker
     *
     * @param marker the marker to render
     * @param markerLayout required information for rendering
     * @param position the position of the marker
     * @param context rendering context
     * @returns the rendered marker
     */
    private renderMarker(marker: SMarker, markerLayout: MarkerLayoutInformation, context: RenderingContext): VNode {
        const rotation = markerLayout.rotation;
        const { x, y } = markerLayout.position;
        return svg(
            "g",
            {
                attrs: {
                    transform: `translate(${x},${y}) rotate(${rotation})`
                }
            },
            context.renderElement(marker)
        );
    }
}
