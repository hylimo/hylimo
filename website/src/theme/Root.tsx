import { Root as DiagramRoot } from "@hylimo/diagram-common";
import { LanguageServerSettings } from "@hylimo/diagram-protocol";
import useLocalStorage from "@rehooks/local-storage";
import React, { Dispatch, createContext } from "react";

/**
 * Context which provides the global state
 */
export const GlobalStateContext = createContext<{
    diagram: DiagramRoot | null;
    diagramCode: string | null;
    setDiagram: Dispatch<DiagramRoot | null>;
    setDiagramCode: Dispatch<string | null>;
    showSettings: boolean;
    setShowSettings: Dispatch<boolean>;
    settings: LanguageServerSettings;
    setSettings: Dispatch<LanguageServerSettings>;
}>({
    diagram: null,
    diagramCode: null,
    showSettings: false,
    settings: {},
    setDiagram: () => {
        // do nothing
    },
    setDiagramCode: () => {
        // do nothing
    },
    setShowSettings: () => {
        // do nothing
    },
    setSettings: () => {
        // do nothing
    }
});

/**
 * Root component
 */
export default function Root({ children }: any) {
    const [diagram, setDiagram] = React.useState<DiagramRoot | null>(null);
    const [diagramCode, setDiagramCode] = React.useState<string | null>(null);
    const [showSettings, setShowSettings] = React.useState<boolean>(false);
    const [settings, setSettings] = useLocalStorage<LanguageServerSettings>("settings", {});
    return (
        <GlobalStateContext.Provider
            value={{
                diagram,
                setDiagram,
                diagramCode,
                setDiagramCode,
                showSettings,
                setShowSettings,
                settings,
                setSettings
            }}
        >
            {children}
        </GlobalStateContext.Provider>
    );
}
