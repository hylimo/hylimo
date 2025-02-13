import { ScrollMouseListener as SprottyScrollMouseListener } from "sprotty";
import { injectable } from "inversify";

/**
 * Extends the Sprotty ScrollMouseListener to handle drag move correctly when in drag mode
 */
@injectable()
export class ScrollMouseListener extends SprottyScrollMouseListener {}
