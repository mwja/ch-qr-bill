import z from "zod";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Body1Strong,
    Button,
    Caption1,
    Divider,
    Dropdown,
    Field,
    makeStyles,
    MessageBar,
    MessageBarBody,
    MessageBarTitle,
    Option,
    Spinner,
    Subtitle2,
    Text,
    tokens,
} from "@fluentui/react-components";
import { AddRegular, DeleteRegular } from "@fluentui/react-icons";
import {
    Bill,
    BILL_STATUS_LABELS,
    BillInput,
    BillItem,
    BillStatus,
    BillTotals,
    CURRENCIES,
    formatAmount,
} from "../../models/bills";
import { errorMessage } from "../../utils/errors";
import { FormInput, FormNumberInput, FormTextarea } from "../form/inputs";
import CreditorSelect from "../creditor/CreditorSelect";
import DebitorSelect from "../debitor/DebitorSelect";

const schema = z.object({
    creditor_id: z
        .number({ message: "Creditor is required" })
        .int()
        .min(1, { message: "Creditor is required" }),
    debitor_id: z
        .number({ message: "Debitor is required" })
        .int()
        .min(1, { message: "Debitor is required" }),
    vat_percentage: z
        .number({ message: "VAT percentage is required" })
        .min(0, { message: "VAT percentage cannot be negative" })
        .max(100, { message: "VAT percentage cannot exceed 100" }),
    currency: z.string().min(1, { message: "Currency is required" }),
    due_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Due date is required" }),
    status: z.enum(BillStatus),
    comment: z.string(),
    items: z
        .array(
            z.object({
                description: z
                    .string()
                    .min(1, { message: "Description is required" }),
                quantity: z
                    .number({ message: "Quantity is required" })
                    .gt(0, { message: "Quantity must be greater than 0" }),
                unit_price: z
                    .number({ message: "Unit price is required" })
                    .min(0, { message: "Unit price cannot be negative" }),
            }),
        )
        .min(1, { message: "Add at least one line item" }),
});

type BillFormValues = z.infer<typeof schema>;

const useStyles = makeStyles({
    form: {
        display: "flex",
        flexDirection: "column",
        rowGap: tokens.spacingVerticalL,
    },
    fields: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(11rem, 1fr))",
        columnGap: tokens.spacingHorizontalL,
        rowGap: tokens.spacingVerticalM,
    },
    /* Fluent dropdowns ship a 250px min-width: let them fit their column. */
    dropdown: {
        minWidth: 0,
        width: "100%",
    },
    section: {
        display: "flex",
        flexDirection: "column",
        rowGap: tokens.spacingVerticalS,
    },
    sectionHeader: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        columnGap: tokens.spacingHorizontalM,
    },
    items: {
        display: "flex",
        flexDirection: "column",
        rowGap: tokens.spacingVerticalM,
    },
    item: {
        display: "flex",
        flexDirection: "column",
        rowGap: tokens.spacingVerticalS,
        padding: tokens.spacingHorizontalM,
        borderRadius: tokens.borderRadiusMedium,
        border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
        backgroundColor: tokens.colorNeutralBackground2,
    },
    /* Wraps instead of squeezing the inputs when the drawer is narrow. */
    itemRow: {
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "flex-end",
        columnGap: tokens.spacingHorizontalM,
        rowGap: tokens.spacingVerticalS,
    },
    lineTotal: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        marginLeft: "auto",
        paddingBottom: tokens.spacingVerticalXXS,
    },
    numeric: {
        width: "7rem",
        justifyContent: "flex-end",
    },
    /* Wider: the currency suffix eats into the input itself. */
    numericPrice: {
        width: "10rem",
        justifyContent: "flex-end",
    },
    totals: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        rowGap: tokens.spacingVerticalXS,
    },
    totalsRow: {
        display: "flex",
        flexDirection: "row",
        columnGap: tokens.spacingHorizontalXXL,
    },
    totalsLabel: {
        minWidth: "8rem",
    },
    totalsValue: {
        minWidth: "8rem",
        textAlign: "right",
    },
    actions: {
        display: "flex",
        flexDirection: "row",
        columnGap: tokens.spacingHorizontalM,
        justifyContent: "flex-end",
    },
});

function round2(value: number): number {
    return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function defaultDueDate(): string {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    return dueDate.toISOString().slice(0, 10);
}

function toFormValues(
    bill?: Bill,
    items?: BillItem[],
): BillFormValues {
    return {
        creditor_id: bill?.creditor_id ?? 0,
        debitor_id: bill?.debitor_id ?? 0,
        vat_percentage: bill?.vat_percentage ?? 8.1,
        currency: bill?.currency ?? CURRENCIES[0],
        due_date: bill?.due_date?.slice(0, 10) ?? defaultDueDate(),
        status: bill?.status ?? BillStatus.DRAFT,
        comment: bill?.comment ?? "",
        items: items?.length
            ? items.map((item) => ({
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
            }))
            : [{ description: "", quantity: 1, unit_price: 0 }],
    };
}

/**
 * Mount this with a `key` tied to the bill being edited: the defaults are read
 * once, so remounting is what picks up freshly loaded data.
 */
export default function BillForm(props: {
    defaultBill?: Bill;
    defaultItems?: BillItem[];
    /** Totals as stored by the database; a preview is shown when absent. */
    totals?: BillTotals;
    error?: unknown;
    isPending?: boolean;
    submitLabel?: string;
    onSubmit: (input: BillInput) => void | Promise<unknown>;
}) {
    const styles = useStyles();
    const { control, formState, handleSubmit } = useForm({
        resolver: zodResolver(schema),
        defaultValues: toFormValues(props.defaultBill, props.defaultItems),
    });
    const { fields, append, remove } = useFieldArray({ control, name: "items" });

    const watchedItems = useWatch({ control, name: "items" });
    const watchedVat = useWatch({ control, name: "vat_percentage" });
    const currency = useWatch({ control, name: "currency" });

    const lineTotals = (watchedItems ?? []).map((item) =>
        round2((Number(item?.quantity) || 0) * (Number(item?.unit_price) || 0))
    );
    const previewNet = round2(lineTotals.reduce((sum, line) => sum + line, 0));
    const previewVat = round2((previewNet * (Number(watchedVat) || 0)) / 100);
    const totals = props.totals ?? {
        net_total: previewNet,
        vat_total: previewVat,
        gross_total: round2(previewNet + previewVat),
    };

    const error = errorMessage(props.error);
    // A `min(1)` failure on the array itself lands on the root of the field array.
    const itemsError = formState.errors.items?.message ??
        formState.errors.items?.root?.message;

    return (
        <form
            className={styles.form}
            onSubmit={handleSubmit((values) =>
                props.onSubmit(values as BillInput)
            )}
        >
            {error && (
                <MessageBar intent="error">
                    <MessageBarBody>
                        <MessageBarTitle>An error occured.</MessageBarTitle>
                        {error}
                    </MessageBarBody>
                </MessageBar>
            )}

            <div className={styles.fields}>
                <Field
                    label="Creditor"
                    required
                    validationMessage={formState.errors.creditor_id?.message}
                    validationState={
                        formState.errors.creditor_id ? "error" : "none"
                    }
                >
                    <Controller
                        control={control}
                        name="creditor_id"
                        render={({ field }) => (
                            <CreditorSelect
                                className={styles.dropdown}
                                id="creditor_id"
                                value={field.value}
                                onBlur={field.onBlur}
                                onChange={(creditorId) =>
                                    field.onChange(creditorId ?? 0)}
                            />
                        )}
                    />
                </Field>
                <Field
                    label="Debitor"
                    required
                    validationMessage={formState.errors.debitor_id?.message}
                    validationState={
                        formState.errors.debitor_id ? "error" : "none"
                    }
                >
                    <Controller
                        control={control}
                        name="debitor_id"
                        render={({ field }) => (
                            <DebitorSelect
                                className={styles.dropdown}
                                id="debitor_id"
                                value={field.value}
                                onBlur={field.onBlur}
                                onChange={(debitorId) =>
                                    field.onChange(debitorId ?? 0)}
                            />
                        )}
                    />
                </Field>
                <Field
                    label="Due date"
                    required
                    validationMessage={formState.errors.due_date?.message}
                    validationState={
                        formState.errors.due_date ? "error" : "none"
                    }
                >
                    <FormInput
                        control={control}
                        name="due_date"
                        type="date"
                    />
                </Field>
                <Field
                    label="VAT"
                    hint="Applied to the net total by the database."
                    validationMessage={formState.errors.vat_percentage?.message}
                    validationState={
                        formState.errors.vat_percentage ? "error" : "none"
                    }
                >
                    <FormNumberInput
                        control={control}
                        name="vat_percentage"
                        step="0.1"
                        min={0}
                        max={100}
                        contentAfter={<Text>%</Text>}
                    />
                </Field>
                <Field
                    label="Currency"
                    required
                    validationMessage={formState.errors.currency?.message}
                    validationState={
                        formState.errors.currency ? "error" : "none"
                    }
                >
                    <Controller
                        control={control}
                        name="currency"
                        render={({ field }) => (
                            <Dropdown
                                className={styles.dropdown}
                                id="currency"
                                value={field.value ?? ""}
                                selectedOptions={
                                    field.value ? [field.value] : []
                                }
                                onBlur={field.onBlur}
                                onOptionSelect={(_, data) =>
                                    field.onChange(data.optionValue)}
                            >
                                {CURRENCIES.map((option) => (
                                    <Option key={option} value={option}>
                                        {option}
                                    </Option>
                                ))}
                            </Dropdown>
                        )}
                    />
                </Field>
                <Field
                    label="Status"
                    validationMessage={formState.errors.status?.message}
                    validationState={formState.errors.status ? "error" : "none"}
                >
                    <Controller
                        control={control}
                        name="status"
                        render={({ field }) => (
                            <Dropdown
                                className={styles.dropdown}
                                id="status"
                                value={
                                    BILL_STATUS_LABELS[
                                        field.value as BillStatus
                                    ] ?? ""
                                }
                                selectedOptions={
                                    field.value ? [field.value] : []
                                }
                                onBlur={field.onBlur}
                                onOptionSelect={(_, data) =>
                                    field.onChange(data.optionValue)}
                            >
                                {Object.values(BillStatus).map((status) => (
                                    <Option
                                        key={status}
                                        value={status}
                                        text={BILL_STATUS_LABELS[status]}
                                    >
                                        {BILL_STATUS_LABELS[status]}
                                    </Option>
                                ))}
                            </Dropdown>
                        )}
                    />
                </Field>
            </div>

            <Divider />

            <Field
                label="Comment"
                hint="Printed on the document, before the line items."
                validationMessage={formState.errors.comment?.message}
                validationState={formState.errors.comment ? "error" : "none"}
            >
                <FormTextarea
                    control={control}
                    name="comment"
                    placeholder="e.g. Thank you for your business."
                    resize="vertical"
                />
            </Field>

            <Divider />

            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <Subtitle2>Line items</Subtitle2>
                    <Button
                        appearance="secondary"
                        icon={<AddRegular />}
                        onClick={() =>
                            append({
                                description: "",
                                quantity: 1,
                                unit_price: 0,
                            })}
                    >
                        Add item
                    </Button>
                </div>

                <div className={styles.items}>
                    {fields.map((field, index) => (
                        <div className={styles.item} key={field.id}>
                            <Field
                                label={`Item ${index + 1}`}
                                required
                                validationMessage={formState.errors.items
                                    ?.[index]?.description?.message}
                                validationState={formState.errors.items?.[index]
                                    ?.description
                                    ? "error"
                                    : "none"}
                            >
                                <FormInput
                                    control={control}
                                    name={`items.${index}.description`}
                                    placeholder="Description"
                                />
                            </Field>
                            <div className={styles.itemRow}>
                                <Field
                                    label="Quantity"
                                    validationMessage={formState.errors.items
                                        ?.[index]?.quantity?.message}
                                    validationState={formState.errors.items
                                        ?.[index]?.quantity
                                        ? "error"
                                        : "none"}
                                >
                                    <FormNumberInput
                                        control={control}
                                        name={`items.${index}.quantity`}
                                        className={styles.numeric}
                                        step="0.01"
                                        min={0}
                                    />
                                </Field>
                                <Field
                                    label="Unit price"
                                    validationMessage={formState.errors.items
                                        ?.[index]?.unit_price?.message}
                                    validationState={formState.errors.items
                                        ?.[index]?.unit_price
                                        ? "error"
                                        : "none"}
                                >
                                    <FormNumberInput
                                        control={control}
                                        name={`items.${index}.unit_price`}
                                        className={styles.numericPrice}
                                        step="0.01"
                                        min={0}
                                        contentAfter={<Text>{currency}</Text>}
                                    />
                                </Field>
                                <div className={styles.lineTotal}>
                                    <Caption1>Line total</Caption1>
                                    <Body1Strong>
                                        {formatAmount(
                                            lineTotals[index] ?? 0,
                                            currency,
                                        )}
                                    </Body1Strong>
                                </div>
                                <Button
                                    appearance="subtle"
                                    aria-label={`Remove item ${index + 1}`}
                                    icon={<DeleteRegular />}
                                    disabled={fields.length <= 1}
                                    onClick={() => remove(index)}
                                />
                            </div>
                        </div>
                    ))}
                </div>
                <Button
                    appearance="secondary"
                    icon={<AddRegular />}
                    onClick={() =>
                        append({
                            description: "",
                            quantity: 1,
                            unit_price: 0,
                        })}
                >
                    Add item
                </Button>

                {itemsError && (
                    <MessageBar intent="warning">
                        <MessageBarBody>{itemsError}</MessageBarBody>
                    </MessageBar>
                )}
            </div>

            <Divider />

            <div className={styles.totals}>
                <div className={styles.totalsRow}>
                    <Text className={styles.totalsLabel}>Net total</Text>
                    <Text className={styles.totalsValue}>
                        {formatAmount(totals.net_total, currency)}
                    </Text>
                </div>
                <div className={styles.totalsRow}>
                    <Text className={styles.totalsLabel}>
                        VAT ({Number(watchedVat) || 0}%)
                    </Text>
                    <Text className={styles.totalsValue}>
                        {formatAmount(totals.vat_total, currency)}
                    </Text>
                </div>
                <div className={styles.totalsRow}>
                    <Body1Strong className={styles.totalsLabel}>
                        Gross total
                    </Body1Strong>
                    <Body1Strong className={styles.totalsValue}>
                        {formatAmount(totals.gross_total, currency)}
                    </Body1Strong>
                </div>
                <Caption1>
                    {props.totals
                        ? "Amounts as computed by the database."
                        : "Preview only — the database computes the stored amounts on save."}
                </Caption1>
            </div>

            <div className={styles.actions}>
                <Button
                    type="submit"
                    appearance="primary"
                    disabled={props.isPending}
                    icon={props.isPending ? <Spinner size="tiny" /> : null}
                >
                    {props.submitLabel ?? "Create bill"}
                </Button>
            </div>
        </form>
    );
}
