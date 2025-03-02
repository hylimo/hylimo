import { injectable } from "inversify";
import type { VNode, Attrs } from "snabbdom";
import type { IViewArgs, RenderingContext, IView } from "sprotty";
import { svg } from "sprotty";
import type { SPath } from "../model/sPath.js";
import { extractShapeStyleAttributes } from "@hylimo/diagram-render-svg";

/**
 * IView that represents an svg path
 */
@injectable()
export class PathView implements IView {
    render(model: Readonly<SPath>, _context: RenderingContext, _args?: IViewArgs | undefined): VNode | undefined {
        const attrs: Attrs = {
            ...extractShapeStyleAttributes(model),
            d: model.path,
            transform: `translate(${model.x}, ${model.y})`
        };
        return svg("path", {
            attrs
        });
    }
}
