import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { Debitor } from "../../models/debitors";
import {
    Dropdown,
    Option,
    Persona,
    Spinner,
} from "@fluentui/react-components";

export default function DebitorSelect(props: {
    id?: string;
    className?: string;
    value?: number | null;
    disabled?: boolean;
    onChange: (debitorId: number | null) => void;
    onBlur?: () => void;
}) {
    const {
        data: debitorData,
        isPending: debitorIsPending,
        error: debitorError,
    } = useQuery({
        queryKey: ["debitors"],
        queryFn: () => invoke<Debitor[]>("get_all_debitors"),
    });

    const selected = debitorData?.find((debitor) => debitor.id === props.value);

    return (
        <Dropdown
            id={props.id ?? "debitor-dropdown"}
            className={props.className}
            placeholder="Select a debitor"
            expandIcon={debitorIsPending ? <Spinner size="tiny" /> : undefined}
            disabled={props.disabled || debitorIsPending || !!debitorError}
            value={selected?.name ?? ""}
            selectedOptions={selected ? [String(selected.id)] : []}
            onBlur={props.onBlur}
            onOptionSelect={(_, data) =>
                props.onChange(
                    data.optionValue ? Number(data.optionValue) : null,
                )}
        >
            {debitorData?.map((debitor) => (
                <Option
                    key={debitor.id}
                    value={String(debitor.id)}
                    text={debitor.name}
                >
                    <Persona
                        name={debitor.name}
                        secondaryText={`${debitor.street} ${debitor.street_number}, ${debitor.postal_code} ${debitor.city}`}
                    />
                </Option>
            ))}
        </Dropdown>
    );
}
