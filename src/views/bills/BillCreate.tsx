import {
    useQueryClient,
    useMutation,
    DefaultError,
} from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import BillForm from "../../components/bills/BillForm";
import Header from "../../components/Header";
import LargeLayout from "../../components/layout/layouts/LargeLayout";
import { Bill, CreateBillInput } from "../../models/bills";
import { useNavigate } from "react-router";
import { Body1 } from "@fluentui/react-components";

export default function BillCreate() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const {
        mutateAsync: createBillAsync,
        isPending: createBillPending,
        error,
    } = useMutation<Bill, DefaultError, CreateBillInput>({
        mutationKey: ["createBill"],
        mutationFn: (data: CreateBillInput) => {
            return invoke("create_bill", { input: data });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["bills"] });
            return navigate("#/bills");
        },
    });

    const isPending = createBillPending;
    return (
        <LargeLayout>
            <div className="mb-4">
                <Header
                    title="Create a Bill"
                    subtitle="You will be able to preview the PDF and edit more details later."
                />
            </div>
            <BillForm
                error={error}
                isPending={isPending}
                onSubmit={async (billData, itemsData) => {
                    const bill = await createBillAsync(billData);
                }}
            />
        </LargeLayout>
    );
}
