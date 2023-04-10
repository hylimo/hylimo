import React, { useContext, useEffect } from "react";
import { GlobalStateContext } from "../../theme/Root";
import { saveAs } from "file-saver";
import styles from "./index.module.css";
import clsx from "clsx";

/**
 * Navbar item to save the diagram code as sys file
 *
 * @returns the created navbar item
 */
export default function SaveNavbarItem(): JSX.Element {
    const { diagramCode } = useContext(GlobalStateContext);
    const downloadCode = async () => {
        saveAs(new Blob([diagramCode!]), "diagram.hyl");
    };

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (event.ctrlKey && event.key === "s") {
                event.preventDefault();
                downloadCode();
            }
        }
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    return <a onClick={downloadCode} className={clsx(styles.downloadLink)}></a>;
}
