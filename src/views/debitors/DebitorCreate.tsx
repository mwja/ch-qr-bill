import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router";
import DebitorForm from "../../components/debitor/DebitorForm";
import Header from "../../components/Header";
import LargeLayout from "../../components/layout/layouts/LargeLayout";
import { Debitor, DebitorInput } from "../../models/debitors";

export default function DebitorCreate() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { mutateAsync, isPending, error } = useMutation({
        mutationKey: ["createDebitor"],
        mutationFn: (input: DebitorInput) =>
            invoke<Debitor>("create_debitor", { input }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["debitors"] });
            return navigate("/debitors");
        },
    });

    return (
        <LargeLayout>
            <Header title="Create a Debitor" />
            <DebitorForm
                error={error}
                isPending={isPending}
                submitLabel="Create"
                onSubmit={(input) => mutateAsync(input)}
            />
        </LargeLayout>
    );
}
