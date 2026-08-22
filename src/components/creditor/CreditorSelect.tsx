import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { Creditor } from "../../models/creditors";
import {
    Dropdown,
    Option,
    Persona,
    Spinner,
} from "@fluentui/react-components";

export default function CreditorSelect(props: {
    id?: string;
    className?: string;
    value?: number | null;
    disabled?: boolean;
    onChange: (creditorId: number | null) => void;
    onBlur?: () => void;
}) {
    const {
        data: creditorData,
        isPending: creditorIsPending,
        error: creditorError,
    } = useQuery({
        queryKey: ["creditors"],
        queryFn: () => invoke<Creditor[]>("get_all_creditors"),
    });

    const selected = creditorData?.find(
        (creditor) => creditor.id === props.value,
    );

    return (
        <Dropdown
            id={props.id ?? "creditor-dropdown"}
            className={props.className}
            placeholder="Select a creditor"
            expandIcon={creditorIsPending ? <Spinner size="tiny" /> : undefined}
            disabled={props.disabled || creditorIsPending || !!creditorError}
            value={selected?.name ?? ""}
            selectedOptions={selected ? [String(selected.id)] : []}
            onBlur={props.onBlur}
            onOptionSelect={(_, data) =>
                props.onChange(
                    data.optionValue ? Number(data.optionValue) : null,
                )}
        >
            {creditorData?.map((creditor) => (
                <Option
                    key={creditor.id}
                    value={String(creditor.id)}
                    text={creditor.name}
                >
                    <Persona
                        name={creditor.name}
                        secondaryText={`${creditor.street} ${creditor.street_number}, ${creditor.postal_code} ${creditor.city} (${creditor.iban})`}
                    />
                </Option>
            ))}
        </Dropdown>
    );
}
