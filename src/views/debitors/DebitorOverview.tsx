import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { Debitor } from "../../models/debitors";
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

const columns: TableColumnDefinition<Debitor>[] = [
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
        columnId: "actions",
        renderHeaderCell: () => {
            return "Actions";
        },
        compare: () => 0, // No sorting for actions column
        renderCell: (item) => {
            return (
                <>
                    <Tooltip content="Edit this debitor" relationship="label">
                        <Button
                            appearance="subtle"
                            aria-label="Edit this debitor"
                            icon={<EditRegular />}
                            as="a"
                            href={`#/debitors/${item.id}`}
                        />
                    </Tooltip>
                    <DeleteButton
                        label={`Delete debitor ${item.name}`}
                        title="Delete this debitor?"
                        body={`${item.name} will be removed. A debitor still used by a bill cannot be deleted.`}
                        invalidateKey={["debitors"]}
                        onDelete={() =>
                            invoke("delete_debitor", { debitorId: item.id })}
                    />
                </>
            );
        },
    },
];

const Add = bundleIcon(AddFilled, AddRegular);
export default function DebitorOverview() {
    const { data: debitorData, error: debitorError } = useQuery({
        queryKey: ["debitors"],
        queryFn: () => invoke<Debitor[]>("get_all_debitors"),
    });

    return (
        <LargeLayout>
            <Header title="Debitors">
                <Button
                    appearance="primary"
                    as="a"
                    href="#/debitors/new"
                    icon={<Add />}
                >
                    Create Debitor
                </Button>
            </Header>

            {debitorError && (
                <MessageBar intent="error">
                    <MessageBarBody>
                        <MessageBarTitle>
                            Error loading debitors
                        </MessageBarTitle>
                        {errorMessage(debitorError)}
                    </MessageBarBody>
                </MessageBar>
            )}
            <DataGrid
                items={debitorData || []}
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
                <DataGridBody<Debitor>>
                    {({ item, rowId }) => (
                        <DataGridRow<Debitor> key={rowId}>
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
