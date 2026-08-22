import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate, useParams } from "react-router";
import {
    MessageBar,
    MessageBarBody,
    MessageBarTitle,
    Spinner,
} from "@fluentui/react-components";
import DebitorForm from "../../components/debitor/DebitorForm";
import Header from "../../components/Header";
import LargeLayout from "../../components/layout/layouts/LargeLayout";
import { Debitor, DebitorInput } from "../../models/debitors";
import { errorMessage } from "../../utils/errors";

export default function DebitorView() {
    const { id } = useParams();
    const debitorId = Number(id);
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const enabled = Number.isInteger(debitorId) && debitorId > 0;

    const { data: debitor, error: loadError } = useQuery({
        queryKey: ["debitors", debitorId],
        queryFn: () => invoke<Debitor>("get_debitor_by_id", { debitorId }),
        enabled,
    });

    const { mutateAsync, isPending, error } = useMutation({
        mutationKey: ["updateDebitor", debitorId],
        mutationFn: (input: DebitorInput) =>
            invoke<Debitor>("update_debitor", { debitorId, input }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["debitors"] });
            return navigate("/debitors");
        },
    });

    const message = errorMessage(loadError);

    return (
        <LargeLayout>
            <Header title="Edit Debitor" subtitle={debitor?.name} />
            {message && (
                <MessageBar intent="error">
                    <MessageBarBody>
                        <MessageBarTitle>
                            Could not load this debitor
                        </MessageBarTitle>
                        {message}
                    </MessageBarBody>
                </MessageBar>
            )}
            {debitor
                ? (
                    <DebitorForm
                        // Remount once the persisted debitor is loaded.
                        key={debitor.id}
                        defaultDebitor={debitor}
                        error={error}
                        isPending={isPending}
                        submitLabel="Save changes"
                        onSubmit={(input) => mutateAsync(input)}
                    />
                )
                : !message && <Spinner label="Loading the debitor..." />}
        </LargeLayout>
    );
}
