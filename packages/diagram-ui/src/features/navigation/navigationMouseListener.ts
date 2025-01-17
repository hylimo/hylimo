import { injectable } from "inversify";
import { NavigateToSourceAction } from "@hylimo/diagram-protocol";
import { MouseListener, SModelElementImpl } from "sprotty";
import { Action } from "sprotty-protocol";

/**
 * Listener for navigation features
 */
@injectable()
export class NavigationMouseListener extends MouseListener {
    override mouseDown(target: SModelElementImpl, event: MouseEvent): Action[] {
        if (event.altKey) {
            return this.navigateToElement(target);
        }
        return [];
    }

    override doubleClick(target: SModelElementImpl): Action[] {
        return this.navigateToElement(target);
    }

    /**
     * Createsa an action to navigate to the target
     *
     * @param target the target to navigate to
     * @returns the action to navigate to the target
     */
    private navigateToElement(target: SModelElementImpl): Action[] {
        const navigationAction: NavigateToSourceAction = {
            kind: NavigateToSourceAction.KIND,
            element: target.id
        };
        return [navigationAction];
    }
}
