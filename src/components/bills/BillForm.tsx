import z from "zod";
import {
    Bill,
    BillItem,
    BillStatus,
    CreateBillInput,
    CreateBillItemInput,
} from "../../models/bills";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
    Field,
    MessageBar,
    MessageBarBody,
    MessageBarTitle,
} from "@fluentui/react-components";
import DebitorDropdown from "../debitor/DebitorSelect";
import CreditorDropdown from "../creditor/CreditorSelect";

const schema = z.object({
    debitor_id: z.number().min(1, { message: "Debitor is required" }),
    creditor_id: z.number().min(1, { message: "Creditor is required" }),
    vat_percentage: z
        .number()
        .min(0, { message: "VAT percentage is required" }),
    currency: z.string().min(1, { message: "Currency is required" }),
    due_date: z.number().min(1, { message: "Due date is required" }),
    status: z.enum(BillStatus),
    items: z.array(
        z.object({
            description: z
                .string()
                .min(1, { message: "Description is required" }),
            quantity: z.number().min(1, { message: "Quantity is required" }),
            unit_price: z
                .number()
                .min(0, { message: "Unit price is required" }),
        }),
    ),
});

export default function BillForm(props: {
    defaultBill?: Bill;
    defaultItems?: BillItem[];
    error?: Error | string | null;
    isPending?: boolean;
    onSubmit: (bill: CreateBillInput, items: CreateBillItemInput[]) => void;
}) {
    const { register, formState, handleSubmit } = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            vat_percentage: 8.1,
        },
    });

    return (
        <form
            className="flex flex-col *:flex *:flex-col *:gap-y-2 gap-y-4 max-w-md"
            onSubmit={handleSubmit((data) => mutate(data))}
        >
            {props.error && (
                <MessageBar intent="error">
                    <MessageBarBody>
                        <MessageBarTitle>An error occured.</MessageBarTitle>
                        {props.error}
                    </MessageBarBody>
                </MessageBar>
            )}
            <Field
                label="Creditor"
                validationMessage={formState.errors.creditor_id?.message}
                validationState={
                    formState.errors.creditor_id ? "error" : "none"
                }
            >
                <CreditorDropdown {...register("creditor_id")} />
            </Field>
            <Field
                label="Debitor"
                validationMessage={formState.errors.debitor_id?.message}
                validationState={formState.errors.debitor_id ? "error" : "none"}
            >
                <DebitorDropdown {...register("debitor_id")} />
            </Field>
        </form>
    );
}
