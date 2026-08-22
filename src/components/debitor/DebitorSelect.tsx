import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { Debitor } from "../../models/debitors";
import {
    Dropdown,
    DropdownProps,
    Option,
    Persona,
    Spinner,
} from "@fluentui/react-components";

export default function DebitorDropdown(props: DropdownProps) {
    const {
        data: debitorData,
        isPending: debitorIsPending,
        error: debitorError,
    } = useQuery({
        queryKey: ["debitors"],
        queryFn: () => invoke<Debitor[]>("get_all_debitors"),
    });

    return (
        <Dropdown
            id="debitor-dropdown"
            {...props}
            expandIcon={debitorIsPending ? <Spinner size="tiny" /> : undefined}
            disabled={debitorIsPending || !!debitorError}
        >
            {debitorData?.map((debitor) => (
                <Option text={debitor.name}>
                    <Persona
                        name={debitor.name}
                        secondaryText={`${debitor.street} ${debitor.street_number}, ${debitor.postal_code} ${debitor.city}`}
                    />
                </Option>
            ))}
        </Dropdown>
    );
}
