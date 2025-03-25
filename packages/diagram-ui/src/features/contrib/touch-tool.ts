/* eslint @typescript-eslint/no-unused-vars: 0 */
import { inject, injectable, multiInject, optional } from "inversify";
import type { VNode } from "snabbdom";
import { on, SModelRootImpl, type IActionDispatcher, type IVNodePostprocessor, type SModelElementImpl } from "sprotty";
import { TYPES } from "../types.js";
import type { DOMHelper } from "sprotty/lib/base/views/dom-helper.js";
import { isAction, type Action } from "sprotty-protocol";

@injectable()
export class TouchTool implements IVNodePostprocessor {
    @inject(TYPES.IActionDispatcher) protected actionDispatcher!: IActionDispatcher;
    @inject(TYPES.DOMHelper) protected domHelper!: DOMHelper;

    constructor(@multiInject(TYPES.ITouchListener) @optional() protected touchListeners: ITouchListener[] = []) {}

    register(mouseListener: ITouchListener) {
        this.touchListeners.push(mouseListener);
    }

    deregister(mouseListener: ITouchListener) {
        const index = this.touchListeners.indexOf(mouseListener);
        if (index >= 0) this.touchListeners.splice(index, 1);
    }

    protected getTargetElement(model: SModelRootImpl, event: TouchEvent): SModelElementImpl | undefined {
        let target = event.target as Element;
        const index = model.index;
        while (target) {
            if (target.id) {
                const element = index.getById(this.domHelper.findSModelIdByDOMElement(target));
                if (element !== undefined) return element;
            }
            target = target.parentNode as Element;
        }
        return undefined;
    }

    protected handleEvent(methodName: TouchEventKind, model: SModelRootImpl, event: TouchEvent) {
        const element = this.getTargetElement(model, event);
        if (!element) return;
        const actions = this.touchListeners
            .map((listener) => listener[methodName](element, event))
            .reduce((a, b) => a.concat(b));
        if (actions.length > 0) {
            event.preventDefault();
            for (const actionOrPromise of actions) {
                if (isAction(actionOrPromise)) {
                    this.actionDispatcher.dispatch(actionOrPromise);
                } else {
                    actionOrPromise.then((action: Action) => {
                        this.actionDispatcher.dispatch(action);
                    });
                }
            }
        }
    }

    touchStart(model: SModelRootImpl, event: TouchEvent) {
        this.handleEvent("touchStart", model, event);
    }

    touchMove(model: SModelRootImpl, event: TouchEvent) {
        this.handleEvent("touchMove", model, event);
    }

    touchEnd(model: SModelRootImpl, event: TouchEvent) {
        this.handleEvent("touchEnd", model, event);
    }

    decorate(vnode: VNode, element: SModelElementImpl): VNode {
        if (element instanceof SModelRootImpl) {
            on(vnode, "touchstart", this.touchStart.bind(this, element) as (e: Event) => void);
            on(vnode, "touchmove", this.touchMove.bind(this, element) as (e: Event) => void);
            on(vnode, "touchend", this.touchEnd.bind(this, element) as (e: Event) => void);
        }
        return vnode;
    }

    postUpdate() {}
}

export type TouchEventKind = "touchStart" | "touchMove" | "touchEnd";

export interface ITouchListener {
    touchStart(target: SModelElementImpl, event: TouchEvent): (Action | Promise<Action>)[];

    touchMove(target: SModelElementImpl, event: TouchEvent): (Action | Promise<Action>)[];

    touchEnd(target: SModelElementImpl, event: TouchEvent): (Action | Promise<Action>)[];
}

@injectable()
export class TouchListener implements TouchListener {
    touchStart(target: SModelElementImpl, event: TouchEvent): (Action | Promise<Action>)[] {
        return [];
    }

    touchMove(target: SModelElementImpl, event: TouchEvent): (Action | Promise<Action>)[] {
        return [];
    }

    touchEnd(target: SModelElementImpl, event: TouchEvent): (Action | Promise<Action>)[] {
        return [];
    }
}
