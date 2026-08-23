import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Button,
    Dialog,
    DialogActions,
    DialogBody,
    DialogContent,
    DialogSurface,
    DialogTitle,
    Spinner,
    Tooltip,
} from "@fluentui/react-components";
import { DeleteRegular } from "@fluentui/react-icons";
import { errorMessage } from "../utils/errors";

/**
 * Deletes something after asking, then refreshes whatever listed it. Failures
 * stay on the button as a tooltip rather than being thrown: the backend refuses
 * deletes that would leave dangling references, and that reason is worth reading.
 */
export default function DeleteButton(props: {
    /** Tooltip and accessible name, e.g. `Delete bill BILL-2026-08-22-0042`. */
    label: string;
    title: string;
    body: string;
    /** Query key to invalidate once the delete lands. */
    invalidateKey: readonly unknown[];
    onDelete: () => Promise<unknown>;
    children?: React.ReactNode;
}) {
    const queryClient = useQueryClient();
    const [confirming, setConfirming] = useState(false);

    const { mutate, isPending, error } = useMutation({
        mutationFn: props.onDelete,
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: props.invalidateKey }),
    });

    const failure = errorMessage(error);
    const label = failure ? `${props.label}: ${failure}` : props.label;

    return (
        <>
            <Tooltip content={label} relationship="label">
                <Button
                    appearance="subtle"
                    aria-label={label}
                    icon={isPending ? <Spinner size="tiny" /> : <DeleteRegular />}
                    disabled={isPending}
                    onClick={() => setConfirming(true)}
                >
                    {props.children}
                </Button>
            </Tooltip>

            <Dialog
                open={confirming}
                onOpenChange={(_, data) => setConfirming(data.open)}
            >
                <DialogSurface>
                    <DialogBody>
                        <DialogTitle>{props.title}</DialogTitle>
                        <DialogContent>{props.body}</DialogContent>
                        <DialogActions>
                            <Button
                                appearance="secondary"
                                onClick={() => setConfirming(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                appearance="primary"
                                onClick={() => {
                                    setConfirming(false);
                                    mutate();
                                }}
                            >
                                Delete
                            </Button>
                        </DialogActions>
                    </DialogBody>
                </DialogSurface>
            </Dialog>
        </>
    );
}
