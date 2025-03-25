/* eslint @typescript-eslint/no-unused-vars: 0 */
import { inject, injectable, multiInject, optional } from "inversify";
import type { VNode } from "snabbdom";
import { on, SModelRootImpl, type IActionDispatcher, type IVNodePostprocessor, type SModelElementImpl } from "sprotty";
import { TYPES } from "../types.js";
import type { DOMHelper } from "sprotty/lib/base/views/dom-helper.js";
import { isAction, type Action } from "sprotty-protocol";

@injectable()
export class PointerTool implements IVNodePostprocessor {
    @inject(TYPES.IActionDispatcher) protected actionDispatcher!: IActionDispatcher;
    @inject(TYPES.DOMHelper) protected domHelper!: DOMHelper;

    constructor(@multiInject(TYPES.IPointerListener) @optional() protected pointerListeners: IPointerListener[] = []) {}

    register(pointerListener: IPointerListener) {
        this.pointerListeners.push(pointerListener);
    }

    deregister(pointerListener: IPointerListener) {
        const index = this.pointerListeners.indexOf(pointerListener);
        if (index >= 0) this.pointerListeners.splice(index, 1);
    }

    protected getTargetElement(model: SModelRootImpl, event: PointerEvent): SModelElementImpl | undefined {
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

    protected handleEvent(methodName: PointerEventKind, model: SModelRootImpl, event: PointerEvent) {
        const element = this.getTargetElement(model, event);
        if (!element) return;
        const actions = this.pointerListeners
            .map((listener) => listener[methodName](element, event))
            .reduce((a, b) => a.concat(b), []);
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

    decorate(vnode: VNode, element: SModelElementImpl): VNode {
        if (element instanceof SModelRootImpl) {
            on(vnode, "pointerover", this.handleEvent.bind(this, "pointerover", element) as (e: Event) => void);
            on(vnode, "pointerenter", this.handleEvent.bind(this, "pointerenter", element) as (e: Event) => void);
            on(vnode, "pointerdown", this.handleEvent.bind(this, "pointerdown", element) as (e: Event) => void);
            on(vnode, "pointermove", this.handleEvent.bind(this, "pointermove", element) as (e: Event) => void);
            on(vnode, "pointerup", this.handleEvent.bind(this, "pointerup", element) as (e: Event) => void);
            on(vnode, "pointercancel", this.handleEvent.bind(this, "pointercancel", element) as (e: Event) => void);
            on(vnode, "pointerout", this.handleEvent.bind(this, "pointerout", element) as (e: Event) => void);
            on(vnode, "pointerleave", this.handleEvent.bind(this, "pointerleave", element) as (e: Event) => void);
            on(
                vnode,
                "gotpointercapture",
                this.handleEvent.bind(this, "gotpointercapture", element) as (e: Event) => void
            );
            on(
                vnode,
                "lostpointercapture",
                this.handleEvent.bind(this, "lostpointercapture", element) as (e: Event) => void
            );
        }
        return vnode;
    }

    postUpdate() {}
}

export type PointerEventKind =
    | "pointerover"
    | "pointerenter"
    | "pointerdown"
    | "pointermove"
    | "pointerup"
    | "pointercancel"
    | "pointerout"
    | "pointerleave"
    | "gotpointercapture"
    | "lostpointercapture";

export interface IPointerListener {
    pointerover(target: SModelElementImpl, event: PointerEvent): (Action | Promise<Action>)[];
    pointerenter(target: SModelElementImpl, event: PointerEvent): (Action | Promise<Action>)[];
    pointerdown(target: SModelElementImpl, event: PointerEvent): (Action | Promise<Action>)[];
    pointermove(target: SModelElementImpl, event: PointerEvent): (Action | Promise<Action>)[];
    pointerup(target: SModelElementImpl, event: PointerEvent): (Action | Promise<Action>)[];
    pointercancel(target: SModelElementImpl, event: PointerEvent): (Action | Promise<Action>)[];
    pointerout(target: SModelElementImpl, event: PointerEvent): (Action | Promise<Action>)[];
    pointerleave(target: SModelElementImpl, event: PointerEvent): (Action | Promise<Action>)[];
    gotpointercapture(target: SModelElementImpl, event: PointerEvent): (Action | Promise<Action>)[];
    lostpointercapture(target: SModelElementImpl, event: PointerEvent): (Action | Promise<Action>)[];
}

@injectable()
export class PointerListener implements IPointerListener {
    pointerover(target: SModelElementImpl, event: PointerEvent): (Action | Promise<Action>)[] {
        return [];
    }
    pointerenter(target: SModelElementImpl, event: PointerEvent): (Action | Promise<Action>)[] {
        return [];
    }
    pointerdown(target: SModelElementImpl, event: PointerEvent): (Action | Promise<Action>)[] {
        return [];
    }
    pointermove(target: SModelElementImpl, event: PointerEvent): (Action | Promise<Action>)[] {
        return [];
    }
    pointerup(target: SModelElementImpl, event: PointerEvent): (Action | Promise<Action>)[] {
        return [];
    }
    pointercancel(target: SModelElementImpl, event: PointerEvent): (Action | Promise<Action>)[] {
        return [];
    }
    pointerout(target: SModelElementImpl, event: PointerEvent): (Action | Promise<Action>)[] {
        return [];
    }
    pointerleave(target: SModelElementImpl, event: PointerEvent): (Action | Promise<Action>)[] {
        return [];
    }
    gotpointercapture(target: SModelElementImpl, event: PointerEvent): (Action | Promise<Action>)[] {
        return [];
    }
    lostpointercapture(target: SModelElementImpl, event: PointerEvent): (Action | Promise<Action>)[] {
        return [];
    }
}
