import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router";
import CreditorForm from "../../components/creditor/CreditorForm";
import Header from "../../components/Header";
import LargeLayout from "../../components/layout/layouts/LargeLayout";
import { Creditor, CreditorInput } from "../../models/creditors";

export default function CreditorCreate() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { mutateAsync, isPending, error } = useMutation({
        mutationKey: ["createCreditor"],
        mutationFn: (input: CreditorInput) =>
            invoke<Creditor>("create_creditor", { input }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["creditors"] });
            return navigate("/creditors");
        },
    });

    return (
        <LargeLayout>
            <Header title="Create a Creditor" />
            <CreditorForm
                error={error}
                isPending={isPending}
                submitLabel="Create"
                onSubmit={(input) => mutateAsync(input)}
            />
        </LargeLayout>
    );
}
