import React, { useContext } from "react";
import clsx from "clsx";
import styles from "./index.module.css";
import { GlobalStateContext } from "../../theme/Root";
import { LanguageServerSettings } from "@hylimo/diagram-protocol";
import { mapObject } from "../../util/mapObject";

type MappedSettings<T> = { [K in keyof LanguageServerSettings]: T };

/**
 * Component for a absolute positioned dialog for editing hylimo related settings
 * @returns the crated component
 */
export default function SettingsDialog(): JSX.Element {
    const { setShowSettings, settings, setSettings } = useContext(GlobalStateContext);
    const names: MappedSettings<string> = {
        translationPrecision: "Absolute/relative point translation precision",
        linePointPosPrecision: "Line point pos precision",
        linePointDistancePrecision: "Line point distance precision",
        axisAlignedPosPrecision: "Axis aligned pos precision",
        rotationPrecision: "Rotation precision"
    };
    const [validState, setValidState] = React.useState<MappedSettings<boolean>>(mapObject(names, () => true));
    const [cachedStringifiedSettings, setCachedStringifiedSettings] = React.useState<MappedSettings<string>>(
        mapObject(names, (key) => settings[key]?.toString() ?? "")
    );

    function updateAndValidate<K extends keyof LanguageServerSettings>(key: K, e: React.ChangeEvent<HTMLInputElement>) {
        const currentValue = settings[key];
        const newValue = e.target.value.replaceAll(/[^0-9.]/g, "");
        setCachedStringifiedSettings({
            ...cachedStringifiedSettings,
            [key]: newValue
        });
        if (newValue === "") {
            setValidState({
                ...validState,
                [key]: true
            });
            setSettings({
                ...settings,
                [key]: undefined
            });
        } else {
            const parsedNewValue = Number(newValue);
            const isValid = !Number.isNaN(parsedNewValue);
            setValidState({
                ...validState,
                [key]: isValid
            });
            if (isValid && currentValue !== parsedNewValue) {
                setSettings({
                    ...settings,
                    [key]: parsedNewValue
                });
            }
        }
    }

    return (
        <div className={clsx(styles.popup__background)} onMouseDown={() => setShowSettings(false)}>
            <div className={clsx(styles.popup__card)} onMouseDown={(e) => e.stopPropagation()}>
                <div className={clsx(styles.popup__title)}>Settings</div>
                <div>
                    {Object.entries(names).map(([key, name]) => (
                        <div className={styles.setting__entry} key={key}>
                            <div className={clsx(styles.setting__name)}>{name}</div>
                            <input
                                className={clsx(
                                    styles.setting__input,
                                    validState[key as keyof LanguageServerSettings]
                                        ? ""
                                        : styles.setting__input__invalid
                                )}
                                value={cachedStringifiedSettings[key as keyof LanguageServerSettings]}
                                onChange={(e) => updateAndValidate(key as keyof LanguageServerSettings, e)}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
