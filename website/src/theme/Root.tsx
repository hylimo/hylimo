import { Root as DiagramRoot } from "@hylimo/diagram-common";
import React, { Dispatch, createContext } from "react";

/**
 * Context which provides the global state
 */
export const GlobalStateContext = createContext<{
    diagram: DiagramRoot | null;
    setDiagram: Dispatch<DiagramRoot | null>;
}>({
    diagram: null,
    setDiagram: () => {
        // do nothing
    }
});

/**
 * Root component
 */
export default function Root({ children }: any) {
    const [diagram, setDiagram] = React.useState<DiagramRoot | null>(null);
    return <GlobalStateContext.Provider value={{ diagram, setDiagram }}>{children}</GlobalStateContext.Provider>;
}
