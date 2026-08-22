import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router";
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
import { ArrowSwapRegular, CopyRegular } from "@fluentui/react-icons";
import { Bill } from "../../models/bills";
import { errorMessage } from "../../utils/errors";

export type CopyBillAction = "duplicate" | "replace";

/**
 * Both actions copy a bill the same way — same parties, VAT, currency and items,
 * with the due date allowing the same number of days as the original. They
 * differ in what happens to the original: `duplicate` leaves it untouched and
 * the two bills stay independent, `replace` cancels it and links it to the copy.
 */
const ACTIONS = {
    duplicate: {
        command: "duplicate_bill",
        label: "Duplicate this bill",
        icon: <CopyRegular />,
        confirm: null,
    },
    replace: {
        command: "replace_bill",
        label: "Replace this bill",
        icon: <ArrowSwapRegular />,
        confirm: {
            title: "Replace this bill?",
            body:
                "A new draft will be created with the same terms and a fresh due date. This bill will be cancelled and linked to its replacement.",
            action: "Replace bill",
        },
    },
} as const;

export default function CopyBillButton(props: {
    billId: number;
    action: CopyBillAction;
    appearance?: "secondary" | "subtle" | "primary" | "transparent";
    children?: React.ReactNode;
}) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [confirming, setConfirming] = useState(false);
    const action = ACTIONS[props.action];

    const { mutate, isPending, error } = useMutation({
        mutationKey: [props.action, props.billId],
        mutationFn: () =>
            invoke<Bill>(action.command, { billId: props.billId }),
        onSuccess: async (copy) => {
            await queryClient.invalidateQueries({ queryKey: ["bills"] });
            return navigate(`/bills/${copy.id}`);
        },
    });

    const failure = errorMessage(error);
    const label = failure ? `${action.label}: ${failure}` : action.label;

    return (
        <>
            <Tooltip content={label} relationship="label">
                <Button
                    appearance={props.appearance ?? "subtle"}
                    aria-label={label}
                    icon={isPending ? <Spinner size="tiny" /> : action.icon}
                    disabled={isPending}
                    onClick={() =>
                        action.confirm ? setConfirming(true) : mutate()}
                >
                    {props.children}
                </Button>
            </Tooltip>

            {action.confirm && (
                <Dialog
                    open={confirming}
                    onOpenChange={(_, data) => setConfirming(data.open)}
                >
                    <DialogSurface>
                        <DialogBody>
                            <DialogTitle>{action.confirm.title}</DialogTitle>
                            <DialogContent>{action.confirm.body}</DialogContent>
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
                                    {action.confirm.action}
                                </Button>
                            </DialogActions>
                        </DialogBody>
                    </DialogSurface>
                </Dialog>
            )}
        </>
    );
}
