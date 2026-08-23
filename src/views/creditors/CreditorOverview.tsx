import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { Creditor } from "../../models/creditors";
import LargeLayout from "../../components/layout/layouts/LargeLayout";
import DeleteButton from "../../components/DeleteButton";
import Header from "../../components/Header";
import { errorMessage } from "../../utils/errors";
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

const columns: TableColumnDefinition<Creditor>[] = [
    {
        columnId: "name",
        compare: (a, b) => a.name.localeCompare(b.name),
        renderHeaderCell: () => <span>Name</span>,
        renderCell: (item) => <span>{item.name}</span>,
    },
    {
        columnId: "street",
        compare: (a, b) => a.street.localeCompare(b.street),
        renderHeaderCell: () => <span>Street</span>,
        renderCell: (item) => (
            <span>
                {item.street} {item.street_number}
            </span>
        ),
    },
    {
        columnId: "city",
        compare: (a, b) => a.city.localeCompare(b.city),
        renderHeaderCell: () => <span>City</span>,
        renderCell: (item) => (
            <span>
                {item.postal_code} {item.city}
            </span>
        ),
    },
    {
        columnId: "country",
        compare: (a, b) => a.country.localeCompare(b.country),
        renderHeaderCell: () => <span>Country</span>,
        renderCell: (item) => <span>{item.country}</span>,
    },
    {
        columnId: "vat_number",
        compare: (a, b) =>
            (a.vat_number ?? "").localeCompare(b.vat_number ?? ""),
        renderHeaderCell: () => <span>VAT Number</span>,
        renderCell: (item) => <span>{item.vat_number ?? "—"}</span>,
    },
    {
        columnId: "iban",
        compare: (a, b) => a.iban.localeCompare(b.iban),
        renderHeaderCell: () => <span>IBAN</span>,
        renderCell: (item) => <span>{item.iban}</span>,
    },
    {
        columnId: "actions",
        renderHeaderCell: () => "Actions",
        compare: () => 0,
        renderCell: (item) => (
            <>
                <Tooltip content="Edit this creditor" relationship="label">
                    <Button
                        appearance="subtle"
                        aria-label="Edit this creditor"
                        icon={<EditRegular />}
                        as="a"
                        href={`#/creditors/${item.id}`}
                    />
                </Tooltip>
                <DeleteButton
                    label={`Delete creditor ${item.name}`}
                    title="Delete this creditor?"
                    body={`${item.name} will be removed. A creditor still used by a bill cannot be deleted.`}
                    invalidateKey={["creditors"]}
                    onDelete={() =>
                        invoke("delete_creditor", { creditorId: item.id })}
                />
            </>
        ),
    },
];

const Add = bundleIcon(AddFilled, AddRegular);
export default function CreditorOverview() {
    const { data: creditorData, error: creditorError } = useQuery({
        queryKey: ["creditors"],
        queryFn: () => invoke<Creditor[]>("get_all_creditors"),
    });

    return (
        <LargeLayout>
            <Header title="Creditors">
                <Button
                    appearance="primary"
                    as="a"
                    href="#/creditors/new"
                    icon={<Add />}
                >
                    Create Creditor
                </Button>
            </Header>

            {creditorError && (
                <MessageBar intent="error">
                    <MessageBarBody>
                        <MessageBarTitle>
                            Error loading debitors
                        </MessageBarTitle>
                        {errorMessage(creditorError)}
                    </MessageBarBody>
                </MessageBar>
            )}
            <DataGrid
                items={creditorData || []}
                columns={columns}
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

                <DataGridBody<Creditor>>
                    {({ item, rowId }) => (
                        <DataGridRow<Creditor> key={rowId}>
                            {({ renderCell, columnId }) => (
                                <DataGridCell
                                    focusMode={columnId === "actions"
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
