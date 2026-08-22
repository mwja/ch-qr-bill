import { Fragment, useState } from "react";
import { useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { openPath } from "@tauri-apps/plugin-opener";
import {
    Badge,
    Body1,
    Button,
    Caption1,
    DrawerBody,
    DrawerHeader,
    DrawerHeaderTitle,
    InlineDrawer,
    Link,
    makeStyles,
    MessageBar,
    MessageBarBody,
    MessageBarTitle,
    Spinner,
    Title3,
    tokens,
    Tooltip,
} from "@fluentui/react-components";
import {
    ArrowSyncRegular,
    DismissRegular,
    EditRegular,
    OpenRegular,
} from "@fluentui/react-icons";
import BillForm from "../../components/bills/BillForm";
import CopyBillButton from "../../components/bills/CopyBillButton";
import {
    Bill,
    BILL_STATUS_COLORS,
    BILL_STATUS_LABELS,
    BillInput,
    BillItem,
    BillLinks,
    formatAmount,
} from "../../models/bills";
import { errorMessage } from "../../utils/errors";

const useStyles = makeStyles({
    page: {
        display: "flex",
        flexDirection: "row",
        height: "100%",
        overflow: "hidden",
    },
    main: {
        display: "flex",
        flexDirection: "column",
        flexGrow: 1,
        minWidth: 0,
        rowGap: tokens.spacingVerticalM,
        padding: tokens.spacingHorizontalXXL,
        overflow: "hidden",
    },
    toolbar: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        columnGap: tokens.spacingHorizontalM,
        rowGap: tokens.spacingVerticalS,
    },
    titleGroup: {
        display: "flex",
        flexDirection: "column",
        rowGap: tokens.spacingVerticalXXS,
        minWidth: 0,
    },
    titleRow: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        columnGap: tokens.spacingHorizontalS,
    },
    toolbarActions: {
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        columnGap: tokens.spacingHorizontalS,
        rowGap: tokens.spacingVerticalS,
    },
    previewFrame: {
        flexGrow: 1,
        minHeight: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: tokens.borderRadiusLarge,
        border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
        backgroundColor: tokens.colorNeutralBackground3,
        overflow: "hidden",
    },
    preview: {
        width: "100%",
        height: "100%",
        border: "none",
    },
    drawerContent: {
        display: "flex",
        flexDirection: "column",
        rowGap: tokens.spacingVerticalM,
        paddingBottom: tokens.spacingVerticalXXL,
    },
});

export default function BillEdit() {
    const styles = useStyles();
    const { id } = useParams();
    const billId = Number(id);
    const queryClient = useQueryClient();

    const [drawerOpen, setDrawerOpen] = useState(true);
    /** Bumped after every regeneration so the webview reloads the PDF. */
    const [documentVersion, setDocumentVersion] = useState(() => Date.now());

    const enabled = Number.isInteger(billId) && billId > 0;

    const { data: bill, error: billError } = useQuery({
        queryKey: ["bills", billId],
        queryFn: () => invoke<Bill>("get_bill_by_id", { billId }),
        enabled,
    });

    const { data: items, error: itemsError } = useQuery({
        queryKey: ["bills", billId, "items"],
        queryFn: () => invoke<BillItem[]>("get_bill_items", { billId }),
        enabled,
    });

    const { data: links } = useQuery({
        queryKey: ["bills", billId, "links"],
        queryFn: () => invoke<BillLinks>("get_bill_links", { billId }),
        enabled,
    });

    const {
        data: documentPath,
        error: documentError,
        isFetching: documentIsFetching,
        refetch: refetchDocument,
    } = useQuery({
        queryKey: ["bills", billId, "document"],
        queryFn: () =>
            invoke<string>("generate_bill_document", { billId }),
        enabled,
        // The PDF is a side effect of the bill's data, never served from cache.
        gcTime: 0,
        staleTime: 0,
        refetchOnWindowFocus: false,
    });

    const {
        mutateAsync: saveBill,
        isPending: isSaving,
        error: saveError,
    } = useMutation({
        mutationKey: ["updateBill", billId],
        mutationFn: (input: BillInput) =>
            invoke<Bill>("update_bill", { billId, input }),
        onSuccess: async () => {
            // Invalidating waits for the document query to regenerate the file.
            await queryClient.invalidateQueries({ queryKey: ["bills"] });
            setDocumentVersion(Date.now());
        },
    });

    const regenerate = async () => {
        await refetchDocument();
        setDocumentVersion(Date.now());
    };

    const loadError = errorMessage(billError ?? itemsError);
    const previewError = errorMessage(documentError);

    if (!enabled) {
        return (
            <MessageBar intent="error">
                <MessageBarBody>
                    <MessageBarTitle>Unknown bill</MessageBarTitle>
                    {`"${id}" is not a valid bill id.`}
                </MessageBarBody>
            </MessageBar>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.main}>
                <div className={styles.toolbar}>
                    <div className={styles.titleGroup}>
                        <div className={styles.titleRow}>
                            <Title3>
                                {bill?.user_facing_id ?? "Loading bill..."}
                            </Title3>
                            {bill && (
                                <Badge
                                    appearance="filled"
                                    color={BILL_STATUS_COLORS[bill.status]}
                                >
                                    {BILL_STATUS_LABELS[bill.status]}
                                </Badge>
                            )}
                        </div>
                        {bill && (
                            <Caption1>
                                {`Due ${bill.due_date.slice(0, 10)} · ${
                                    formatAmount(
                                        bill.totals.gross_total,
                                        bill.currency,
                                    )
                                }`}
                            </Caption1>
                        )}
                    </div>
                    <div className={styles.toolbarActions}>
                        <Tooltip
                            content="Regenerate the PDF"
                            relationship="label"
                        >
                            <Button
                                appearance="subtle"
                                icon={documentIsFetching
                                    ? <Spinner size="tiny" />
                                    : <ArrowSyncRegular />}
                                disabled={documentIsFetching}
                                onClick={regenerate}
                            >
                                Refresh
                            </Button>
                        </Tooltip>
                        <Tooltip
                            content="Open the PDF in the system viewer"
                            relationship="label"
                        >
                            <Button
                                appearance="subtle"
                                icon={<OpenRegular />}
                                disabled={!documentPath}
                                onClick={() =>
                                    documentPath && openPath(documentPath)}
                            >
                                Open
                            </Button>
                        </Tooltip>
                        <CopyBillButton billId={billId} action="duplicate">
                            Duplicate
                        </CopyBillButton>
                        {links && !links.replacement && (
                            <CopyBillButton billId={billId} action="replace">
                                Replace
                            </CopyBillButton>
                        )}
                        <Button
                            appearance={drawerOpen ? "subtle" : "primary"}
                            icon={drawerOpen
                                ? <DismissRegular />
                                : <EditRegular />}
                            onClick={() => setDrawerOpen(!drawerOpen)}
                        >
                            {drawerOpen ? "Hide editor" : "Edit bill"}
                        </Button>
                    </div>
                </div>

                {loadError && (
                    <MessageBar intent="error">
                        <MessageBarBody>
                            <MessageBarTitle>
                                Could not load this bill
                            </MessageBarTitle>
                            {loadError}
                        </MessageBarBody>
                    </MessageBar>
                )}

                {links?.replacement && (
                    <MessageBar intent="warning">
                        <MessageBarBody>
                            <MessageBarTitle>Replaced</MessageBarTitle>
                            {" This bill was replaced by "}
                            <Link
                                href={`#/bills/${links.replacement.id}`}
                            >
                                {links.replacement.user_facing_id}
                            </Link>
                            {"."}
                        </MessageBarBody>
                    </MessageBar>
                )}

                {!!links?.replaces.length && (
                    <MessageBar intent="info">
                        <MessageBarBody>
                            <MessageBarTitle>Replacement</MessageBarTitle>
                            {" This bill replaces "}
                            {links.replaces.map((replaced, index) => (
                                <Fragment key={replaced.id}>
                                    {index > 0 && ", "}
                                    <Link href={`#/bills/${replaced.id}`}>
                                        {replaced.user_facing_id}
                                    </Link>
                                </Fragment>
                            ))}
                            {"."}
                        </MessageBarBody>
                    </MessageBar>
                )}

                {previewError && (
                    <MessageBar intent="error">
                        <MessageBarBody>
                            <MessageBarTitle>
                                Could not generate the PDF
                            </MessageBarTitle>
                            {previewError}
                        </MessageBarBody>
                    </MessageBar>
                )}

                <div className={styles.previewFrame}>
                    {documentPath
                        ? (
                            <iframe
                                className={styles.preview}
                                title={`${
                                    bill?.user_facing_id ?? "Bill"
                                } preview`}
                                src={`${
                                    convertFileSrc(documentPath)
                                }?v=${documentVersion}`}
                            />
                        )
                        : <Spinner label="Generating the PDF preview..." />}
                </div>
            </div>

            <InlineDrawer open={drawerOpen} position="end" size="medium">
                <DrawerHeader>
                    <DrawerHeaderTitle
                        action={
                            <Button
                                appearance="subtle"
                                aria-label="Close editor"
                                icon={<DismissRegular />}
                                onClick={() => setDrawerOpen(false)}
                            />
                        }
                    >
                        Edit bill
                    </DrawerHeaderTitle>
                </DrawerHeader>
                <DrawerBody>
                    <div className={styles.drawerContent}>
                        <Body1>
                            Saving rewrites the PDF: the preview reloads with
                            the amounts the database recalculated.
                        </Body1>
                        {bill && items
                            ? (
                                <BillForm
                                    // Remount once the persisted bill is loaded.
                                    key={`${bill.id}-${items.length}`}
                                    defaultBill={bill}
                                    defaultItems={items}
                                    totals={bill.totals}
                                    error={saveError}
                                    isPending={isSaving}
                                    submitLabel="Save and regenerate"
                                    onSubmit={(input) => saveBill(input)}
                                />
                            )
                            : <Spinner label="Loading the bill..." />}
                    </div>
                </DrawerBody>
            </InlineDrawer>
        </div>
    );
}
