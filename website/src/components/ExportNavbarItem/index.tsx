import React, { useContext } from "react";
import { GlobalStateContext } from "../../theme/Root";
import { SVGRenderer } from "@hylimo/diagram-render-svg";
import { PDFRenderer } from "@hylimo/diagram-render-pdf";
import { saveAs } from "file-saver";
import styles from "./index.module.css";
import clsx from "clsx";
import { useColorMode } from "@docusaurus/theme-common";

/**
 * Used to render svg
 */
const svgRenderer = new SVGRenderer();

/**
 * Used to render pdf
 */
const pdfRenderer = new PDFRenderer();

/**
 * Navbar item to export the diagram
 *
 * @returns the created navbar item
 */
export default function ExportNavbarItem(): JSX.Element {
    const { diagram } = useContext(GlobalStateContext);
    const { colorMode } = useColorMode();
    const downloadSvg = () => {
        const svgBlob = new Blob([svgRenderer.render(diagram!)], { type: "image/svg+xml;charset=utf-8" });
        saveAs(svgBlob, "diagram.svg");
    };
    const downloadPdf = async () => {
        const pdf = await pdfRenderer.render(diagram!, colorMode === "dark" ? "#1e1e1e" : "#ffffff");
        saveAs(new Blob(pdf, { type: "application/pdf" }), "diagram.pdf");
    };
    return (
        <>
            <a onClick={downloadSvg} className={clsx("dropdown__link", styles.downloadLink)}>
                SVG
            </a>
            <a onClick={downloadPdf} className={clsx("dropdown__link", styles.downloadLink)}>
                PDF
            </a>
        </>
    );
}
