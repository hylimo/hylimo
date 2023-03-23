import React, { useContext } from "react";
import { GlobalStateContext } from "../../theme/Root";
import { SVGRenderer } from "@hylimo/diagram-render";
import { saveAs } from "file-saver";
import styles from "./index.module.css";
import clsx from "clsx";

/**
 * Used to render svg
 */
const svgRenderer = new SVGRenderer();

export default function ExportNavbarItem(): JSX.Element {
    const { diagram } = useContext(GlobalStateContext);
    const downloadSvg = () => {
        const svgBlob = new Blob([svgRenderer.render(diagram!)], { type: "image/svg+xml;charset=utf-8" });
        saveAs(svgBlob, "diagram.svg");
    };
    return (
        <a onClick={downloadSvg} className={clsx("dropdown__link", styles.downloadLink)}>
            SVG
        </a>
    );
}
