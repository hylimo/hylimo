import { inject, injectable } from "inversify";
import { VNode } from "snabbdom";
import { svg } from "sprotty";
import { SCanvasElement } from "../../model/canvas/sCanvasElement.js";
import { LineEngine } from "@hylimo/diagram-common";
import { toSVG } from "transformation-matrix";
import { SCanvasConnection } from "../../model/canvas/sCanvasConnection.js";
import { TYPES } from "../../features/types.js";
import { TransactionStateProvider } from "../../features/transaction/transactionStateProvider.js";
import { LineProviderHoverData } from "../../features/create-connection/createConnectionHoverData.js";
import { renderPoint } from "./canvasPointView.js";
import { SElement } from "../../model/sElement.js";
import { ToolTypeProvider } from "../../features/toolbox/toolState.js";
import { ToolboxToolType } from "../../features/toolbox/toolType.js";

/**
 * Base class for CanvasElementView and CanvasConnectionView
 */
@injectable()
export abstract class EditableCanvasContentView {
    /**
     * The class name for the create connection UI elements
     */
    static readonly CREATE_CONNECTION_CLASS = "create-connection-target";

    /**
     * The transaction state provider
     */
    @inject(TYPES.TransactionStateProvider) protected transactionStateProvider!: TransactionStateProvider;

    /**
     * The tool type provider to determine the current tool type
     */
    @inject(TYPES.ToolTypeProvider) protected readonly toolTypeProvider!: ToolTypeProvider;

    /**
     * Renders the create connection preview
     *
     * @param model the SRoot model
     * @returns the rendered create connection preview
     */
    protected renderCreateConnection(model: Readonly<SCanvasElement | SCanvasConnection>): VNode | undefined {
        if (
            this.toolTypeProvider.toolType !== ToolboxToolType.CONNECT &&
            !this.transactionStateProvider.isInCreateConnectionTransaction
        ) {
            return undefined;
        }
        const hoverData = model.hoverData;
        if (hoverData == undefined || model.editExpression == undefined) {
            return undefined;
        }
        return svg(
            "g",
            null,
            this.renderCreateConnectionOutline(hoverData),
            ...this.renderCreateConnectionStartSymbol(model, hoverData)
        );
    }

    /**
     * Renders the start symbol for the create connection preview
     * Consists of a point on the outline and an arrow pointing in the direction of the connection
     *
     * @param preview the connection creation preview
     * @returns the rendered start symbol
     */
    private renderCreateConnectionStartSymbol(model: Readonly<SElement>, preview: LineProviderHoverData): VNode[] {
        if (this.transactionStateProvider.isInTransaction) {
            return [];
        }
        const position = LineEngine.DEFAULT.getPoint(preview.position, undefined, 0, preview.line);
        return renderPoint(position, 1, true);
    }

    /**
     * Renders the create connection outline
     *
     * @param preview the connection creation preview
     * @returns the rendered create connection outline
     */
    private renderCreateConnectionOutline(preview: LineProviderHoverData): VNode {
        const path = LineEngine.DEFAULT.getSvgPath(preview.line.line);
        return svg("path.create-connection-outline", {
            attrs: {
                d: path,
                transform: toSVG(preview.line.transform)
            },
            class: {
                target: this.transactionStateProvider.isInTransaction
            }
        });
    }
}
