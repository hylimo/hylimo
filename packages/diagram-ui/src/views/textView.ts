import { injectable } from "inversify";
import type { VNode } from "snabbdom";
import type { IViewArgs, RenderingContext, IView } from "sprotty";
import { svg } from "sprotty";
import type { SText } from "../model/sText.js";
import type { StrokeAttributes } from "@hylimo/diagram-render-svg";
import { extractFillAttributes, extractLayoutAttributes } from "@hylimo/diagram-render-svg";
import type { TextLine } from "@hylimo/diagram-common";

/**
 * IView that represents an svg text
 */
@injectable()
export class TextView implements IView {
    render(model: Readonly<SText>, _context: RenderingContext, _args?: IViewArgs | undefined): VNode | undefined {
        const elements: VNode[] = [];
        const fillAttributes = extractFillAttributes(model);
        elements.push(
            svg(
                "text",
                {
                    attrs: {
                        ...extractLayoutAttributes(model),
                        ...fillAttributes,
                        "font-family": model.fontFamily,
                        "font-size": model.fontSize,
                        "font-style": model.fontStyle,
                        "font-weight": model.fontWeight
                    }
                },
                model.text
            )
        );
        if (model.underline != undefined) {
            elements.push(this.drawLine(model, model.underline));
        }
        if (model.strikethrough != undefined) {
            elements.push(this.drawLine(model, model.strikethrough));
        }
        if (elements.length == 1) {
            return elements[0];
        } else {
            return svg("g", {}, ...elements);
        }
    }

    /**
     * Draws a line for the given font line (underline or strikethrough)
     *
     * @param model the text model
     * @param line the line to draw
     * @returns the line as a VNode
     */
    private drawLine(model: Readonly<SText>, line: TextLine): VNode {
        const strokeAttributes: StrokeAttributes = {
            stroke: line.color
        };
        if (line.opacity != 1) {
            strokeAttributes["stroke-opacity"] = line.opacity;
        }
        strokeAttributes["stroke-width"] = line.width;
        if (line.dash != undefined) {
            strokeAttributes["stroke-dasharray"] = `${line.dash} ${line.dashSpace ?? line.dash}`;
        }
        return svg("line", {
            attrs: {
                x1: model.x,
                x2: model.x + model.width,
                y1: model.y + line.y,
                y2: model.y + line.y,
                ...strokeAttributes
            }
        });
    }
}
