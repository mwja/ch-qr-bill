import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import {
    Button,
    DataGrid,
    DataGridBody,
    DataGridCell,
    DataGridHeader,
    DataGridHeaderCell,
    DataGridRow,
    MessageBar,
    MessageBarBody,
    MessageBarTitle,
    TableColumnDefinition,
    Tooltip,
} from "@fluentui/react-components";
import {
    AddFilled,
    AddRegular,
    bundleIcon,
    EditRegular,
} from "@fluentui/react-icons";
import BillStatusCell from "../../components/bills/BillStatusCell";
import CopyBillButton from "../../components/bills/CopyBillButton";
import DeleteButton from "../../components/DeleteButton";
import Header from "../../components/Header";
import LargeLayout from "../../components/layout/layouts/LargeLayout";
import { Bill, formatAmount } from "../../models/bills";
import { Debitor } from "../../models/debitors";
import { errorMessage } from "../../utils/errors";

function buildColumns(
    debitors: Debitor[],
): TableColumnDefinition<Bill>[] {
    const debitorName = (bill: Bill) =>
        debitors.find((debitor) => debitor.id === bill.debitor_id)?.name ?? "—";

    return [
        {
            columnId: "user_facing_id",
            compare: (a, b) => a.user_facing_id.localeCompare(b.user_facing_id),
            renderHeaderCell: () => <span>Bill</span>,
            renderCell: (item) => <span>{item.user_facing_id}</span>,
        },
        {
            columnId: "debitor",
            compare: (a, b) => debitorName(a).localeCompare(debitorName(b)),
            renderHeaderCell: () => <span>Debitor</span>,
            renderCell: (item) => <span>{debitorName(item)}</span>,
        },
        {
            columnId: "due_date",
            compare: (a, b) => a.due_date.localeCompare(b.due_date),
            renderHeaderCell: () => <span>Due date</span>,
            renderCell: (item) => <span>{item.due_date.slice(0, 10)}</span>,
        },
        {
            columnId: "status",
            compare: (a, b) => a.status.localeCompare(b.status),
            renderHeaderCell: () => <span>Status</span>,
            renderCell: (item) => <BillStatusCell bill={item} />,
        },
        {
            columnId: "gross_total",
            compare: (a, b) => a.totals.gross_total - b.totals.gross_total,
            renderHeaderCell: () => <span>Total</span>,
            renderCell: (item) => (
                <span>
                    {formatAmount(item.totals.gross_total, item.currency)}
                </span>
            ),
        },
        {
            columnId: "actions",
            compare: () => 0,
            renderHeaderCell: () => "Actions",
            renderCell: (item) => (
                <>
                    <Tooltip content="Edit this bill" relationship="label">
                        <Button
                            appearance="subtle"
                            aria-label="Edit this bill"
                            icon={<EditRegular />}
                            as="a"
                            href={`#/bills/${item.id}`}
                        />
                    </Tooltip>
                    <CopyBillButton billId={item.id} action="duplicate" />
                    {!item.replaced_by && (
                        <CopyBillButton billId={item.id} action="replace" />
                    )}
                    <DeleteButton
                        label={`Delete bill ${item.user_facing_id}`}
                        title="Delete this bill?"
                        body={`${item.user_facing_id} and its line items will be removed. This cannot be undone.`}
                        invalidateKey={["bills"]}
                        onDelete={() =>
                            invoke("delete_bill", { billId: item.id })}
                    />
                </>
            ),
        },
    ];
}

/** Cells holding controls, so arrow keys step through them. */
const INTERACTIVE_COLUMNS = new Set(["status", "actions"]);

const Add = bundleIcon(AddFilled, AddRegular);

export default function BillOverview() {
    const { data: billData, error: billError } = useQuery({
        queryKey: ["bills", "all"],
        queryFn: () => invoke<Bill[]>("get_all_bills"),
    });

    const { data: debitorData } = useQuery({
        queryKey: ["debitors"],
        queryFn: () => invoke<Debitor[]>("get_all_debitors"),
    });

    const error = errorMessage(billError);

    return (
        <LargeLayout>
            <Header title="Bills">
                <Button
                    appearance="primary"
                    as="a"
                    href="#/bills/new"
                    icon={<Add />}
                >
                    Create Bill
                </Button>
            </Header>

            {error && (
                <MessageBar intent="error">
                    <MessageBarBody>
                        <MessageBarTitle>Error loading bills</MessageBarTitle>
                        {error}
                    </MessageBarBody>
                </MessageBar>
            )}

            <DataGrid
                items={billData || []}
                columns={buildColumns(debitorData || [])}
                sortable
                getRowId={(row) => row.id}
            >
                <DataGridHeader>
                    <DataGridRow>
                        {({ renderHeaderCell }) => (
                            <DataGridHeaderCell>
                                {renderHeaderCell()}
                            </DataGridHeaderCell>
                        )}
                    </DataGridRow>
                </DataGridHeader>
                <DataGridBody<Bill>>
                    {({ item, rowId }) => (
                        <DataGridRow<Bill> key={rowId}>
                            {({ renderCell, columnId }) => (
                                <DataGridCell
                                    focusMode={INTERACTIVE_COLUMNS.has(
                                        String(columnId),
                                    )
                                        ? "group"
                                        : "cell"}
                                >
                                    {renderCell(item)}
                                </DataGridCell>
                            )}
                        </DataGridRow>
                    )}
                </DataGridBody>
            </DataGrid>
        </LargeLayout>
    );
}
