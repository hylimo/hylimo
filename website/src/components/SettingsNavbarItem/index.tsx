import React, { useContext } from "react";
import { GlobalStateContext } from "../../theme/Root";
import styles from "./index.module.css";
import clsx from "clsx";

/**
 * Navbar item to edit diagram settings
 *
 * @returns the created navbar item
 */
export default function SettingsNavbarItem(): JSX.Element {
    const { showSettings, setShowSettings } = useContext(GlobalStateContext);
    const toggleSettings = async () => {
        setShowSettings(!showSettings);
    };

    return <a onClick={toggleSettings} className={clsx(styles.settingsLink, "navbar__item")}></a>;
}
