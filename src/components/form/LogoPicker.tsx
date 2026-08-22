import { useRef, useState } from "react";
import {
    Button,
    Caption1,
    Image,
    makeStyles,
    Text,
    tokens,
} from "@fluentui/react-components";
import { DeleteRegular, ImageAddRegular } from "@fluentui/react-icons";

/** Keeps the stored data URL small enough to sit comfortably in SQLite. */
const MAX_BYTES = 1024 * 1024;

const useStyles = makeStyles({
    root: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        columnGap: tokens.spacingHorizontalM,
    },
    previewBox: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "8rem",
        height: "4.5rem",
        padding: tokens.spacingHorizontalXS,
        borderRadius: tokens.borderRadiusMedium,
        border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
        backgroundColor: tokens.colorNeutralBackground3,
        overflow: "hidden",
    },
    preview: {
        maxWidth: "100%",
        maxHeight: "100%",
    },
    buttons: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        rowGap: tokens.spacingVerticalXS,
    },
    hiddenInput: {
        display: "none",
    },
});

function readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
    });
}

/**
 * Reads an image into the data URL the bill template embeds as `logo_base64`.
 * Fluent has no file-picker component, so a Fluent Button drives a hidden
 * native input.
 */
export default function LogoPicker(props: {
    value: string | null;
    disabled?: boolean;
    onChange: (dataUrl: string | null) => void;
}) {
    const styles = useStyles();
    const inputRef = useRef<HTMLInputElement>(null);
    const [problem, setProblem] = useState<string | null>(null);

    const pick = async (file: File | undefined) => {
        setProblem(null);

        if (!file) {
            return;
        }

        if (!file.type.startsWith("image/")) {
            setProblem("That file is not an image.");
            return;
        }

        if (file.size > MAX_BYTES) {
            setProblem("Pick an image smaller than 1 MB.");
            return;
        }

        try {
            props.onChange(await readAsDataUrl(file));
        } catch {
            setProblem("That image could not be read.");
        }
    };

    return (
        <div className={styles.buttons}>
            <div className={styles.root}>
                <div className={styles.previewBox}>
                    {props.value
                        ? (
                            <Image
                                className={styles.preview}
                                src={props.value}
                                alt="Creditor logo"
                                fit="contain"
                            />
                        )
                        : <Caption1>No logo</Caption1>}
                </div>
                <div className={styles.buttons}>
                    <Button
                        icon={<ImageAddRegular />}
                        disabled={props.disabled}
                        onClick={() => inputRef.current?.click()}
                    >
                        {props.value ? "Replace image" : "Choose image"}
                    </Button>
                    {props.value && (
                        <Button
                            appearance="subtle"
                            icon={<DeleteRegular />}
                            disabled={props.disabled}
                            onClick={() => {
                                setProblem(null);
                                props.onChange(null);
                            }}
                        >
                            Remove
                        </Button>
                    )}
                </div>
            </div>
            {problem && <Text>{problem}</Text>}
            <input
                className={styles.hiddenInput}
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={(event) => {
                    void pick(event.target.files?.[0]);
                    // Allow picking the same file again after a removal.
                    event.target.value = "";
                }}
            />
        </div>
    );
}
