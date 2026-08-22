import { useState } from "react";
import {
    Control,
    FieldPath,
    FieldValues,
    useController,
} from "react-hook-form";
import { Input, InputProps } from "@fluentui/react-components";

/**
 * Fluent inputs are always controlled (`state.input.value` is set on every
 * render), so react-hook-form's uncontrolled `register()` never gets to show a
 * default value: it writes to the DOM node and Fluent's own state overwrites it.
 * These wrappers make the form state the single source of truth instead.
 */
type ControlledProps<T extends FieldValues> = Omit<
    InputProps,
    "value" | "defaultValue" | "onChange" | "name" | "ref"
> & {
    control: Control<T>;
    name: FieldPath<T>;
};

export function FormInput<T extends FieldValues>(
    { control, name, ...inputProps }: ControlledProps<T>,
) {
    const { field } = useController({ control, name });

    return (
        <Input
            {...inputProps}
            name={field.name}
            ref={field.ref}
            value={field.value == null ? "" : String(field.value)}
            onBlur={field.onBlur}
            onChange={(_, data) => field.onChange(data.value)}
        />
    );
}

function initialText(value: unknown): string {
    return typeof value === "number" && Number.isFinite(value)
        ? String(value)
        : "";
}

/**
 * Keeps the typed text locally so partial input ("1." on the way to "1.5") is
 * not thrown away by the round trip through a number, while the form state gets
 * the parsed value — `NaN` for an empty field, so the schema can call it missing.
 */
export function FormNumberInput<T extends FieldValues>(
    { control, name, ...inputProps }: ControlledProps<T>,
) {
    const { field } = useController({ control, name });
    const [text, setText] = useState(() => initialText(field.value));

    return (
        <Input
            type="number"
            {...inputProps}
            name={field.name}
            ref={field.ref}
            value={text}
            onBlur={field.onBlur}
            onChange={(_, data) => {
                setText(data.value);
                field.onChange(
                    data.value === "" ? Number.NaN : Number(data.value),
                );
            }}
        />
    );
}
