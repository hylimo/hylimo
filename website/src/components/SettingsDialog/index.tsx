import React from "react";
import clsx from "clsx";
import styles from "./index.module.css";

/**
 * Component for a absolute positioned dialog for editing hylimo related settings
 * @returns the crated component
 */
export default function SettingsDialog(): JSX.Element {
    return (
        <div className={clsx(styles.popup__background)}>
            <div className={clsx(styles.popup__card)}>
                <div className={clsx(styles.popup__title)}>Settings</div>
                <div>
                    <div className={styles.setting__entry}>
                        <div className={clsx(styles.setting__name)}>Absolute/relative point translation precision</div>
                        <input className={clsx(styles.setting__input)} />
                    </div>
                    <div className={styles.setting__entry}>
                        <div className={clsx(styles.setting__name)}>Line point pos precision</div>
                        <input className={clsx(styles.setting__input)} />
                    </div>
                    <div className={styles.setting__entry}>
                        <div className={clsx(styles.setting__name)}>Line point distance precision</div>
                        <input className={clsx(styles.setting__input)} />
                    </div>
                    <div className={styles.setting__entry}>
                        <div className={clsx(styles.setting__name)}>Axis aligned point precision</div>
                        <input className={clsx(styles.setting__input)} />
                    </div>
                    <div className={styles.setting__entry}>
                        <div className={clsx(styles.setting__name)}>Rotation precision</div>
                        <input className={clsx(styles.setting__input)} />
                    </div>
                </div>
            </div>
        </div>
    );
}
