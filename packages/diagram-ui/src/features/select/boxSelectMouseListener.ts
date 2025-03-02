import { injectable } from "inversify";
import type { SModelElementImpl } from "sprotty";
import { isSelected } from "sprotty";
import type { Action } from "sprotty-protocol";
import { SelectAction } from "sprotty-protocol";
import { ToolboxToolType } from "../toolbox/toolType.js";
import type { BoxSelectProvider } from "./boxSelectProvider.js";
import type { Bounds, Point } from "@hylimo/diagram-common";
import { SetToolAction } from "../toolbox/setToolAction.js";
import type { SRoot } from "../../model/sRoot.js";
import { isBoxSelectable } from "./boxSelectFeature.js";
import { MouseListener } from "../../base/mouseListener.js";

/**
 * MouseListener handling box selection
 */
@injectable()
export class BoxSelectMouseListener extends MouseListener implements BoxSelectProvider {
    /**
     * The start position of the box selection
     */
    private start?: Point;

    /**
     * The current position of the box selection
     */
    private current?: Point;

    /**
     * The ids of the initially selected elements
     */
    private initialSelected: Set<string> = new Set();

    /**
     * The current selection box
     */
    get box(): Bounds | undefined {
        if (
            this.start == undefined ||
            this.current == undefined ||
            this.toolTypeProvider.toolType !== ToolboxToolType.BOX_SELECT
        ) {
            return undefined;
        }
        return {
            position: {
                x: Math.min(this.start.x, this.current.x),
                y: Math.min(this.start.y, this.current.y)
            },
            size: {
                width: Math.abs(this.start.x - this.current.x),
                height: Math.abs(this.start.y - this.current.y)
            }
        };
    }

    override mouseDown(target: SModelElementImpl, event: MouseEvent): Action[] {
        if (this.toolTypeProvider.toolType !== ToolboxToolType.BOX_SELECT || this.isForcedScroll(event)) {
            return [];
        }
        this.start = (target.root as SRoot).getPosition(event);
        if (event.shiftKey) {
            for (const element of target.root.index.all()) {
                if (isSelected(element)) {
                    this.initialSelected.add(element.id);
                }
            }
        }
        return [];
    }

    override mouseMove(target: SModelElementImpl, event: MouseEvent): Action[] {
        if (this.toolTypeProvider.toolType !== ToolboxToolType.BOX_SELECT || this.start == undefined) {
            return [];
        }
        if (event.buttons === 0) {
            return this.mouseUp();
        }
        this.current = (target.root as SRoot).getPosition(event);
        const selectedElements: string[] = [];
        const deselectedElements: string[] = [];
        const bounds = this.box!;
        for (const element of target.root.index.all()) {
            if (isSelected(element)) {
                if (
                    !this.initialSelected.has(element.id) &&
                    !(isBoxSelectable(element) && element.isIncluded(bounds))
                ) {
                    deselectedElements.push(element.id);
                }
            } else {
                if (isBoxSelectable(element) && element.isIncluded(bounds)) {
                    selectedElements.push(element.id);
                }
            }
        }

        const action: SelectAction = SelectAction.create({
            selectedElementsIDs: selectedElements,
            deselectedElementsIDs: deselectedElements
        });
        return [action];
    }

    override mouseUp(): Action[] {
        if (this.toolTypeProvider.toolType !== ToolboxToolType.BOX_SELECT || this.start == undefined) {
            return [];
        }
        this.start = undefined;
        this.current = undefined;
        const action: SetToolAction = {
            kind: SetToolAction.KIND,
            tool: ToolboxToolType.CURSOR
        };
        return [action];
    }

    override mouseEnter(target: SModelElementImpl, event: MouseEvent): Action[] {
        if (event.buttons === 0) {
            return this.mouseUp();
        }
        return [];
    }
}
