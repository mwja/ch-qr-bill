import { useEffect, useState } from "react";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import {
    Button,
    Caption1,
    makeStyles,
    MessageBar,
    MessageBarActions,
    MessageBarBody,
    MessageBarTitle,
    ProgressBar,
    tokens,
} from "@fluentui/react-components";
import { DismissRegular } from "@fluentui/react-icons";
import { errorMessage } from "../utils/errors";

const useStyles = makeStyles({
    root: {
        display: "flex",
        flexDirection: "column",
        rowGap: tokens.spacingVerticalXS,
        paddingLeft: tokens.spacingHorizontalM,
        paddingRight: tokens.spacingHorizontalM,
    },
    notes: {
        display: "block",
        maxHeight: "5rem",
        overflowY: "auto",
        whiteSpace: "pre-wrap",
    },
});

type Progress = { downloaded: number; total: number | null };

/**
 * Checks for a new version once at startup and offers to install it.
 *
 * A failed *check* stays quiet: it usually means there is no network, and the
 * user never asked a question. A failed *download or install* is shown, because
 * by then they pressed a button and are waiting for something to happen.
 */
export default function UpdateNotice() {
    const styles = useStyles();
    const [update, setUpdate] = useState<Update | null>(null);
    const [dismissed, setDismissed] = useState(false);
    const [progress, setProgress] = useState<Progress | null>(null);
    const [restarting, setRestarting] = useState(false);
    const [failure, setFailure] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const found = await check();

                if (!cancelled) {
                    setUpdate(found);
                }
            } catch (error) {
                // Offline, no release published yet, or a dev build.
                console.warn("Update check failed:", error);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const install = async () => {
        if (!update) {
            return;
        }

        setFailure(null);
        setProgress({ downloaded: 0, total: null });

        try {
            await update.downloadAndInstall((event) => {
                if (event.event === "Started") {
                    setProgress({
                        downloaded: 0,
                        total: event.data.contentLength ?? null,
                    });
                } else if (event.event === "Progress") {
                    setProgress((current) => ({
                        downloaded: (current?.downloaded ?? 0) +
                            event.data.chunkLength,
                        total: current?.total ?? null,
                    }));
                }
            });

            setRestarting(true);
            await relaunch();
        } catch (error) {
            setProgress(null);
            setFailure(
                errorMessage(error) ?? "The update could not be installed.",
            );
        }
    };

    if (!update || dismissed) {
        return null;
    }

    const busy = progress !== null && !failure;
    // Indeterminate until the server tells us how big the download is.
    const ratio = progress?.total
        ? Math.min(progress.downloaded / progress.total, 1)
        : undefined;

    return (
        <div className={styles.root}>
            <MessageBar intent={failure ? "error" : "info"}>
                <MessageBarBody>
                    <MessageBarTitle>
                        {failure
                            ? "Update failed"
                            : `Version ${update.version} is available`}
                    </MessageBarTitle>
                    {failure ?? (restarting
                        ? "Restarting..."
                        : busy
                        ? "Downloading..."
                        : `You are on ${update.currentVersion}.`)}
                    {!busy && !failure && update.body && (
                        <Caption1 className={styles.notes}>
                            {update.body}
                        </Caption1>
                    )}
                </MessageBarBody>
                <MessageBarActions
                    containerAction={
                        <Button
                            appearance="transparent"
                            aria-label="Dismiss"
                            icon={<DismissRegular />}
                            disabled={busy}
                            onClick={() => setDismissed(true)}
                        />
                    }
                >
                    <Button
                        appearance="primary"
                        disabled={busy || restarting}
                        onClick={install}
                    >
                        {failure ? "Try again" : "Install and restart"}
                    </Button>
                </MessageBarActions>
            </MessageBar>
            {busy && <ProgressBar value={ratio} />}
        </div>
    );
}
