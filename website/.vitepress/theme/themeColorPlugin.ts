import { useData } from "vitepress";
import { nextTick, Plugin, watch } from "vue";

/**
 * Plugin which automatically sets the theme color of the website based on the current theme.
 */
export const themeColorPlugin: Plugin = {
    install(app) {
        const isDark = app.runWithContext(() => {
            const data = useData();
            return data.isDark;
        });

        watch(isDark, (value) => {
            updateThemeColor(value);
        });

        nextTick(() => {
            updateThemeColor(isDark.value);
        });
    }
};

/**
 * Sets the theme color of the website.
 *
 * @param isDark whether the theme is dark
 */
function updateThemeColor(isDark: boolean) {
    const themeColor = isDark ? "#1B1B1F" : "#ffffff";
    const metaThemeColor = document.querySelector("meta[name=theme-color]");
    if (metaThemeColor) {
        metaThemeColor.setAttribute("content", themeColor);
    } else {
        const meta = document.createElement("meta");
        meta.name = "theme-color";
        meta.content = themeColor;
        document.head.appendChild(meta);
    }
}
