import { Allotment } from "allotment";
import React from "react";
import { useColorMode } from "@docusaurus/theme-common";
import "allotment/dist/style.css";
import Editor from "@monaco-editor/react";
import { customDarkTheme, customLightTheme, languageConfiguration, monarchTokenProvider } from "./language";

/**
 * Name of the language
 */
const language = "syncscript";

/**
 * Editor Component
 * @returns the created editor component
 */
export function HylimoEditor(): JSX.Element {
    const { colorMode } = useColorMode();
    return (
        <Allotment>
            <Allotment.Pane>
                <Editor
                    theme={colorMode === "dark" ? "custom-dark" : "custom-light"}
                    beforeMount={(editor) => {
                        editor.languages.register({ id: language });
                        editor.languages.setLanguageConfiguration(language, languageConfiguration as any);
                        editor.languages.setMonarchTokensProvider("syncscript", monarchTokenProvider as any);
                        editor.editor.defineTheme("custom-dark", customDarkTheme as any);
                        editor.editor.defineTheme("custom-light", customLightTheme as any);
                    }}
                    language="syncscript"
                ></Editor>
            </Allotment.Pane>
            <Allotment.Pane>
                <div>Hello world</div>
            </Allotment.Pane>
        </Allotment>
    );
}
