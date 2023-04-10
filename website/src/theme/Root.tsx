import { Root as DiagramRoot } from "@hylimo/diagram-common";
import React, { Dispatch, createContext } from "react";

/**
 * Context which provides the global state
 */
export const GlobalStateContext = createContext<{
    diagram: DiagramRoot | null;
    diagramCode: string | null;
    setDiagram: Dispatch<DiagramRoot | null>;
    setDiagramCode: Dispatch<string | null>;
}>({
    diagram: null,
    diagramCode: null,
    setDiagram: () => {
        // do nothing
    },
    setDiagramCode: () => {
        // do nothing
    }
});

/**
 * Root component
 */
export default function Root({ children }: any) {
    const [diagram, setDiagram] = React.useState<DiagramRoot | null>(null);
    const [diagramCode, setDiagramCode] = React.useState<string | null>(null);
    return (
        <GlobalStateContext.Provider value={{ diagram, setDiagram, diagramCode, setDiagramCode }}>
            {children}
        </GlobalStateContext.Provider>
    );
}
