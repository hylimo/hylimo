import { injectable } from "inversify";
import { VNode } from "snabbdom";
import { IViewArgs, RenderingContext, IView, svg } from "sprotty";
import { SText } from "../model/text";
import { extractLayoutAttributes } from "./attributeHelpers";

/**
 * IView that represents an svg text
 */
@injectable()
export class TextView implements IView {
    render(model: Readonly<SText>, context: RenderingContext, args?: IViewArgs | undefined): VNode | undefined {
        return svg(
            "text",
            {
                attrs: {
                    ...extractLayoutAttributes(model),
                    fill: model.fill,
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
