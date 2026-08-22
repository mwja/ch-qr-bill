import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import {
    Badge,
    Menu,
    MenuButton,
    MenuItemRadio,
    MenuList,
    MenuPopover,
    MenuTrigger,
    Spinner,
    Tooltip,
} from "@fluentui/react-components";
import {
    Bill,
    BILL_STATUS_COLORS,
    BILL_STATUS_LABELS,
    BillStatus,
} from "../../models/bills";
import { errorMessage } from "../../utils/errors";

/** The status badge, editable in place from the bill listing. */
export default function BillStatusCell(props: { bill: Bill }) {
    const queryClient = useQueryClient();

    const { mutate, isPending, error } = useMutation({
        mutationKey: ["setBillStatus", props.bill.id],
        mutationFn: (status: BillStatus) =>
            invoke<Bill>("set_bill_status", {
                billId: props.bill.id,
                status,
            }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bills"] }),
    });

    const failure = errorMessage(error);

    const trigger = (
        <MenuButton
            appearance="transparent"
            size="small"
            disabled={isPending}
            icon={isPending ? <Spinner size="tiny" /> : undefined}
        >
            <Badge
                appearance="filled"
                color={failure ? "danger" : BILL_STATUS_COLORS[props.bill.status]}
            >
                {BILL_STATUS_LABELS[props.bill.status]}
            </Badge>
        </MenuButton>
    );

    return (
        <Menu
            checkedValues={{ status: [props.bill.status] }}
            onCheckedValueChange={(_, data) => {
                const next = data.checkedItems[0] as BillStatus | undefined;

                if (next && next !== props.bill.status) {
                    mutate(next);
                }
            }}
        >
            <MenuTrigger disableButtonEnhancement>
                {failure
                    ? (
                        <Tooltip
                            content={`Could not change the status: ${failure}`}
                            relationship="description"
                        >
                            {trigger}
                        </Tooltip>
                    )
                    : trigger}
            </MenuTrigger>
            <MenuPopover>
                <MenuList>
                    {Object.values(BillStatus).map((status) => (
                        <MenuItemRadio key={status} name="status" value={status}>
                            {BILL_STATUS_LABELS[status]}
                        </MenuItemRadio>
                    ))}
                </MenuList>
            </MenuPopover>
        </Menu>
    );
}
