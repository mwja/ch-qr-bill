import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { Creditor } from "../../models/creditors";
import {
    Dropdown,
    DropdownProps,
    Option,
    Persona,
    Spinner,
} from "@fluentui/react-components";

export default function CreditorDropdown(props: DropdownProps) {
    const {
        data: creditorData,
        isPending: creditorIsPending,
        error: creditorError,
    } = useQuery({
        queryKey: ["creditors"],
        queryFn: () => invoke<Creditor[]>("get_all_creditors"),
    });

    return (
        <Dropdown
            id="creditor-dropdown"
            {...props}
            expandIcon={creditorIsPending ? <Spinner size="tiny" /> : undefined}
            disabled={creditorIsPending || !!creditorError}
        >
            {creditorData?.map((creditor) => (
                <Option text={creditor.name}>
                    <Persona
                        name={creditor.name}
                        secondaryText={`${creditor.street} ${creditor.street_number}, ${creditor.postal_code} ${creditor.city} (${creditor.iban})`}
                    />
                </Option>
            ))}
        </Dropdown>
    );
}
