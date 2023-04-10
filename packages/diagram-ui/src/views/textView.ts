import { injectable } from "inversify";
import { VNode } from "snabbdom";
import { IViewArgs, RenderingContext, IView, svg } from "sprotty";
import { SText } from "../model/sText";
import { extractFillAttributes, extractLayoutAttributes } from "@hylimo/diagram-render-svg";

/**
 * IView that represents an svg text
 */
@injectable()
export class TextView implements IView {
    render(model: Readonly<SText>, _context: RenderingContext, _args?: IViewArgs | undefined): VNode | undefined {
        return svg(
            "text",
            {
                attrs: {
                    ...extractLayoutAttributes(model),
                    ...extractFillAttributes(model),
                    "font-family": model.fontFamily,
                    "font-size": model.fontSize,
                    "font-style": model.fontStyle,
                    "font-weight": model.fontWeight
                }
            },
            model.text
        );
    }
}
