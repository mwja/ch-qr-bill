import {
    FluentProvider,
    webDarkTheme,
    webLightTheme,
} from "@fluentui/react-components";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";

const currentTheme = await getCurrentWindow().theme();

export default function ThemeProvider(props: React.PropsWithChildren) {
    const [theme, setTheme] = useState(
        currentTheme === "dark" ? webDarkTheme : webLightTheme,
    );

    useEffect(() => {
        let unlisten: CallableFunction;
        (async () => {
            // Récupérer la fenêtre actuelle
            const appWindow = getCurrentWindow();

            // Écouter le changement de thème
            unlisten = await appWindow.onThemeChanged((theme) => {
                console.log("Nouveau thème détecté :", theme); // 'dark' ou 'light'

                if (theme.payload === "dark") {
                    setTheme(webDarkTheme);
                } else {
                    setTheme(webLightTheme);
                }
            });
        })();

        return () => {
            if (unlisten) {
                unlisten();
            }
        };
    }, []);

    return <FluentProvider theme={theme}>{props.children}</FluentProvider>;
}
