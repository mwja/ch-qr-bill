import {
    NavDrawer,
    NavDrawerHeader,
    Tooltip,
    Hamburger,
    NavSectionHeader,
    NavDrawerBody,
    NavDivider,
    NavItem,
    useRestoreFocusTarget,
    NavCategory,
    NavCategoryItem,
    NavSubItem,
    NavSubItemGroup,
    Title3,
    AppItem,
    MessageBar,
    MessageBarBody,
    MessageBarTitle,
    ProgressBar,
    Spinner,
} from "@fluentui/react-components";
import {
    AddFilled,
    AddRegular,
    bundleIcon,
    FolderFilled,
    FolderRegular,
    OpenFilled,
    OpenRegular,
    SettingsFilled,
    SettingsRegular,
} from "@fluentui/react-icons";
import { useState } from "react";
import { useLocation } from "react-router";
import { useAllDebitors } from "../../hooks";
import { invoke } from "@tauri-apps/api/core";
import { Debitor } from "../../models/debitors";
import { useQuery } from "@tanstack/react-query";
import { appDataDir } from "@tauri-apps/api/path";
import { openPath } from "@tauri-apps/plugin-opener";
import { Creditor } from "../../models/creditors";

const Settings = bundleIcon(SettingsFilled, SettingsRegular);
const DebitorsCategoryIcon = bundleIcon(FolderFilled, FolderRegular);
const Add = bundleIcon(AddFilled, AddRegular);
const OpenExternal = bundleIcon(OpenFilled, OpenRegular);

export default function Navigation() {
    const loc = useLocation();
    const [isOpen, setIsOpen] = useState(true);
    const restoreFocusTargetAttributes = useRestoreFocusTarget();

    return isOpen ? (
        <NavDrawer open={isOpen} type="inline" selectedValue={loc.pathname}>
            <NavDrawerHeader>
                <Tooltip content="Close Navigation" relationship="label">
                    <Hamburger onClick={() => setIsOpen(!isOpen)} />
                </Tooltip>
            </NavDrawerHeader>
            <NavDrawerBody className="scrollbar-none">
                <AppItem>CH-QR-Bill Manager</AppItem>
                <NavItem
                    icon={<DebitorsCategoryIcon />}
                    href="#/debitors"
                    value="/debitors"
                >
                    Debitors
                </NavItem>
                <NavItem
                    icon={<DebitorsCategoryIcon />}
                    href="#/creditors"
                    value="/creditors"
                >
                    Creditors
                </NavItem>

                <NavDivider />
                <NavItem
                    icon={<Settings />}
                    href="#/settings"
                    value="#/settings"
                >
                    Settings
                </NavItem>
                <Tooltip
                    content="Opens the folder where the app stores its data"
                    relationship="description"
                >
                    <NavItem
                        icon={<OpenExternal />}
                        as="button"
                        value="open-data-directory"
                        onClick={async () => {
                            try {
                                // 1. Récupère le chemin du dossier de données de l'application
                                const dataDir = await appDataDir();

                                // 2. Ouvre le dossier dans l'explorateur natif (Finder, Explorateur Windows, etc.)
                                await openPath(dataDir);
                            } catch (error) {
                                console.error(
                                    "Impossible d'ouvrir le dossier de données:",
                                    error,
                                );
                            }
                        }}
                    >
                        Open data directory
                    </NavItem>
                </Tooltip>
            </NavDrawerBody>
        </NavDrawer>
    ) : (
        <div className="absolute top-1 left-1">
            <Hamburger
                onClick={() => setIsOpen(!isOpen)}
                {...restoreFocusTargetAttributes}
                aria-expanded={isOpen}
            />
        </div>
    );
}
