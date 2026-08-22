import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Button,
    Combobox,
    Input,
    Label,
    Option,
    Spinner,
    Title1,
    Field,
    MessageBar,
    MessageBarBody,
    MessageBarTitle,
} from "@fluentui/react-components";
import LargeLayout from "../layout/layouts/LargeLayout";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateCreditorInput } from "../../models/creditors";
import { invoke } from "@tauri-apps/api/core";
import Header from "../Header";

const schema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    street: z.string().min(1, { message: "Street is required" }),
    street_number: z.string().min(1, { message: "Street number is required" }),
    city: z.string().min(1, { message: "City is required" }),
    postal_code: z.string().min(1, { message: "Postal code is required" }),
    country: z.string().min(1, { message: "Country is required" }),
    vat_number: z.string(),
    iban: z.string(),
});

export default function CreditorCreate() {
    const { register, formState, handleSubmit } = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            country: "CH",
        },
    });

    const queryClient = useQueryClient();
    const { mutate, isPending, error } = useMutation({
        mutationKey: ["createCreditor"],
        mutationFn: (data: CreateCreditorInput) => {
            return invoke("create_creditor", { input: data });
        },
        onSuccess: () => {
            return queryClient.invalidateQueries({ queryKey: ["creditors"] });
        },
    });

    return (
        <LargeLayout>
            <Header title="Create a Creditor" />
            <form
                className="flex flex-col *:flex *:flex-col *:gap-y-3 gap-y-4 max-w-md"
                onSubmit={handleSubmit((data) => mutate(data))}
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
                    validationMessage={formState.errors.name?.message}
                    validationState={formState.errors.name ? "error" : "none"}
                >
                    <Input placeholder="Name" {...register("name")} />
                </Field>
                <Field
                    label="Street"
                    validationMessage={formState.errors.street?.message}
                    validationState={formState.errors.street ? "error" : "none"}
                >
                    <Input placeholder="Street" {...register("street")} />
                </Field>
                <Field
                    label="Street number"
                    validationMessage={formState.errors.street_number?.message}
                    validationState={
                        formState.errors.street_number ? "error" : "none"
                    }
                >
                    <Input
                        placeholder="Street number"
                        {...register("street_number")}
                    />
                </Field>
                <Field
                    label="City"
                    validationMessage={formState.errors.city?.message}
                    validationState={formState.errors.city ? "error" : "none"}
                >
                    <Input placeholder="City" {...register("city")} />
                </Field>
                <Field
                    label="Postal code"
                    validationMessage={formState.errors.postal_code?.message}
                    validationState={
                        formState.errors.postal_code ? "error" : "none"
                    }
                >
                    <Input
                        placeholder="Postal code"
                        {...register("postal_code")}
                    />
                </Field>
                <div>
                    <Label htmlFor="country">Country</Label>
                    <Combobox {...register("country")}>
                        {["CH", "LI"].map((country) => (
                            <Option key={country}>{country}</Option>
                        ))}
                    </Combobox>
                </div>
                <Field
                    label="VAT number"
                    validationMessage={formState.errors.vat_number?.message}
                    validationState={
                        formState.errors.vat_number ? "error" : "none"
                    }
                >
                    <Input
                        placeholder="VAT number"
                        {...register("vat_number")}
                    />
                </Field>
                <Field
                    label="IBAN"
                    validationMessage={formState.errors.iban?.message}
                    validationState={formState.errors.iban ? "error" : "none"}
                >
                    <Input placeholder="IBAN" {...register("iban")} />
                </Field>
                <Button
                    type="submit"
                    as="button"
                    icon={isPending ? <Spinner size="tiny" /> : null}
                    disabled={isPending}
                >
                    Create
                </Button>
            </form>
        </LargeLayout>
    );
}
