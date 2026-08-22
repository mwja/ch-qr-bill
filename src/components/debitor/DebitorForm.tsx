import z from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Button,
    Dropdown,
    Field,
    makeStyles,
    MessageBar,
    MessageBarBody,
    MessageBarTitle,
    Option,
    Spinner,
    tokens,
} from "@fluentui/react-components";
import { Debitor, DebitorInput } from "../../models/debitors";
import { COUNTRIES } from "../../models/countries";
import { errorMessage } from "../../utils/errors";
import { FormInput } from "../form/inputs";

const schema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    street: z.string().min(1, { message: "Street is required" }),
    street_number: z.string().min(1, { message: "Street number is required" }),
    city: z.string().min(1, { message: "City is required" }),
    postal_code: z.string().min(1, { message: "Postal code is required" }),
    country: z.string().min(1, { message: "Country is required" }),
});

const useStyles = makeStyles({
    form: {
        display: "flex",
        flexDirection: "column",
        rowGap: tokens.spacingVerticalM,
        maxWidth: "28rem",
    },
    actions: {
        display: "flex",
        flexDirection: "row",
        columnGap: tokens.spacingHorizontalM,
        marginTop: tokens.spacingVerticalS,
    },
});

/**
 * Mount this with a `key` tied to the debitor being edited so freshly loaded
 * data becomes the form's defaults.
 */
export default function DebitorForm(props: {
    defaultDebitor?: Debitor;
    error?: unknown;
    isPending?: boolean;
    submitLabel?: string;
    onSubmit: (input: DebitorInput) => void | Promise<unknown>;
}) {
    const styles = useStyles();
    const { control, formState, handleSubmit } = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            name: props.defaultDebitor?.name ?? "",
            street: props.defaultDebitor?.street ?? "",
            street_number: props.defaultDebitor?.street_number ?? "",
            city: props.defaultDebitor?.city ?? "",
            postal_code: props.defaultDebitor?.postal_code ?? "",
            country: props.defaultDebitor?.country ?? COUNTRIES[0],
        },
    });

    const error = errorMessage(props.error);

    return (
        <form
            className={styles.form}
            onSubmit={handleSubmit((values) => props.onSubmit(values))}
        >
            {error && (
                <MessageBar intent="error">
                    <MessageBarBody>
                        <MessageBarTitle>An error occured.</MessageBarTitle>
                        {error}
                    </MessageBarBody>
                </MessageBar>
            )}
            <Field
                label="Name"
                required
                validationMessage={formState.errors.name?.message}
                validationState={formState.errors.name ? "error" : "none"}
            >
                <FormInput
                    control={control}
                    name="name"
                    placeholder="Name"
                />
            </Field>
            <Field
                label="Street"
                required
                validationMessage={formState.errors.street?.message}
                validationState={formState.errors.street ? "error" : "none"}
            >
                <FormInput
                    control={control}
                    name="street"
                    placeholder="Street"
                />
            </Field>
            <Field
                label="Street number"
                required
                validationMessage={formState.errors.street_number?.message}
                validationState={formState.errors.street_number
                    ? "error"
                    : "none"}
            >
                <FormInput
                    control={control}
                    name="street_number"
                    placeholder="Street number"
                />
            </Field>
            <Field
                label="City"
                required
                validationMessage={formState.errors.city?.message}
                validationState={formState.errors.city ? "error" : "none"}
            >
                <FormInput
                    control={control}
                    name="city"
                    placeholder="City"
                />
            </Field>
            <Field
                label="Postal code"
                required
                validationMessage={formState.errors.postal_code?.message}
                validationState={formState.errors.postal_code
                    ? "error"
                    : "none"}
            >
                <FormInput
                    control={control}
                    name="postal_code"
                    placeholder="Postal code"
                />
            </Field>
            <Field
                label="Country"
                required
                validationMessage={formState.errors.country?.message}
                validationState={formState.errors.country ? "error" : "none"}
            >
                <Controller
                    control={control}
                    name="country"
                    render={({ field }) => (
                        <Dropdown
                            id="country"
                            value={field.value ?? ""}
                            selectedOptions={field.value ? [field.value] : []}
                            onBlur={field.onBlur}
                            onOptionSelect={(_, data) =>
                                field.onChange(data.optionValue)}
                        >
                            {COUNTRIES.map((country) => (
                                <Option key={country} value={country}>
                                    {country}
                                </Option>
                            ))}
                        </Dropdown>
                    )}
                />
            </Field>
            <div className={styles.actions}>
                <Button
                    type="submit"
                    appearance="primary"
                    icon={props.isPending ? <Spinner size="tiny" /> : null}
                    disabled={props.isPending}
                >
                    {props.submitLabel ?? "Save"}
                </Button>
            </div>
        </form>
    );
}
