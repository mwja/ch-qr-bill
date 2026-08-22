import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { Debitor } from "../../models/debitors";
import LargeLayout from "../layout/layouts/LargeLayout";
import Header from "../Header";
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
} from "@fluentui/react-components";
import { EditRegular, DeleteRegular } from "@fluentui/react-icons";

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
                    <Button
                        aria-label="Edit"
                        icon={<EditRegular />}
                        as="a"
                        href={`#/debitors/${item.id}`}
                    />
                    <Button aria-label="Delete" icon={<DeleteRegular />} />
                </>
            );
        },
    },
];

export default function DebitorOverview() {
    const {
        data: debitorData,
        isPending: debitorIsPending,
        error: debitorError,
    } = useQuery({
        queryKey: ["debitors"],
        queryFn: () => invoke<Debitor[]>("get_all_debitors"),
    });

    return (
        <LargeLayout>
            <Header title="Debitors">
                <Button appearance="primary" as="a" href="#/debitors/new">
                    Create Debitor
                </Button>
            </Header>

            {debitorError && (
                <MessageBar intent="error">
                    <MessageBarBody>
                        <MessageBarTitle>
                            Error loading debitors
                        </MessageBarTitle>
                        {debitorError}
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
                            {({ renderCell }) => (
                                <DataGridCell>{renderCell(item)}</DataGridCell>
                            )}
                        </DataGridRow>
                    )}
                </DataGridBody>
            </DataGrid>
        </LargeLayout>
    );
}
