import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate, useParams } from "react-router";
import {
    MessageBar,
    MessageBarBody,
    MessageBarTitle,
    Spinner,
} from "@fluentui/react-components";
import CreditorForm from "../../components/creditor/CreditorForm";
import Header from "../../components/Header";
import LargeLayout from "../../components/layout/layouts/LargeLayout";
import { Creditor, CreditorInput } from "../../models/creditors";
import { errorMessage } from "../../utils/errors";

export default function CreditorView() {
    const { id } = useParams();
    const creditorId = Number(id);
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const enabled = Number.isInteger(creditorId) && creditorId > 0;

    const { data: creditor, error: loadError } = useQuery({
        queryKey: ["creditors", creditorId],
        queryFn: () => invoke<Creditor>("get_creditor_by_id", { creditorId }),
        enabled,
    });

    const { mutateAsync, isPending, error } = useMutation({
        mutationKey: ["updateCreditor", creditorId],
        mutationFn: (input: CreditorInput) =>
            invoke<Creditor>("update_creditor", { creditorId, input }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["creditors"] });
            return navigate("/creditors");
        },
    });

    const message = errorMessage(loadError);

    return (
        <LargeLayout>
            <Header
                title="Edit Creditor"
                subtitle={creditor?.name}
            />
            {message && (
                <MessageBar intent="error">
                    <MessageBarBody>
                        <MessageBarTitle>
                            Could not load this creditor
                        </MessageBarTitle>
                        {message}
                    </MessageBarBody>
                </MessageBar>
            )}
            {creditor
                ? (
                    <CreditorForm
                        // Remount once the persisted creditor is loaded.
                        key={creditor.id}
                        defaultCreditor={creditor}
                        error={error}
                        isPending={isPending}
                        submitLabel="Save changes"
                        onSubmit={(input) => mutateAsync(input)}
                    />
                )
                : !message && <Spinner label="Loading the creditor..." />}
        </LargeLayout>
    );
}
