import { DefaultError, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router";
import BillForm from "../../components/bills/BillForm";
import Header from "../../components/Header";
import LargeLayout from "../../components/layout/layouts/LargeLayout";
import { Bill, BillInput } from "../../models/bills";

export default function BillCreate() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { mutateAsync, isPending, error } = useMutation<
        Bill,
        DefaultError,
        BillInput
    >({
        mutationKey: ["createBill"],
        mutationFn: (input) => invoke<Bill>("create_bill", { input }),
        onSuccess: async (bill) => {
            await queryClient.invalidateQueries({ queryKey: ["bills"] });
            return navigate(`/bills/${bill.id}`);
        },
    });

    return (
        <LargeLayout>
            <Header
                title="Create a Bill"
                subtitle="You will be able to preview the PDF and edit more details right after."
            />
            <BillForm
                error={error}
                isPending={isPending}
                submitLabel="Create bill"
                onSubmit={(input) => mutateAsync(input)}
            />
        </LargeLayout>
    );
}
