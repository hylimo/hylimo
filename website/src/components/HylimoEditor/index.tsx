import { Allotment } from "allotment";
import React, { lazy, Suspense, useEffect } from "react";
import { useColorMode } from "@docusaurus/theme-common";
import "allotment/dist/style.css";
import { customDarkTheme, customLightTheme, languageConfiguration, monarchTokenProvider } from "./language";
import * as monaco from "monaco-editor";
import BrowserOnly from "@docusaurus/BrowserOnly";
import Loading from "@theme/Loading";
import { defaultProps } from "prism-react-renderer";

/**
 * Monaco editor
 */
const MonacoEditor = lazy(() => import("react-monaco-editor"));

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
        <BrowserOnly fallback={<div>Loading...</div>}>
            {() => {
                return (
                    <Allotment>
                        <Allotment.Pane>
                            <Suspense fallback={"Loading..."}>
                                <MonacoEditor
                                    options={{
                                        automaticLayout: true
                                    }}
                                    theme={colorMode === "dark" ? "custom-dark" : "custom-light"}
                                    editorWillMount={(editor) => {
                                        console.log("this shit again")
                                        editor.languages.register({ id: language });
                                        editor.languages.setLanguageConfiguration(
                                            language,
                                            languageConfiguration as any
                                        );
                                        editor.languages.setMonarchTokensProvider(
                                            "syncscript",
                                            monarchTokenProvider as any
                                        );
                                        editor.editor.defineTheme("custom-dark", customDarkTheme as any);
                                        editor.editor.defineTheme("custom-light", customLightTheme as any);
                                    }}
                                    editorWillUnmount={(editor) => {
                                        
                                    }}
                                    language="syncscript"
                                ></MonacoEditor>
                            </Suspense>
                        </Allotment.Pane>
                        <Allotment.Pane>
                            <div>Hello world</div>
                        </Allotment.Pane>
                    </Allotment>
                );
            }}
        </BrowserOnly>
    );
}
