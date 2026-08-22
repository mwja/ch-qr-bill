import { Body1, Title2 } from "@fluentui/react-components";

export default function Header(
    props: React.PropsWithChildren<{ title: string; subtitle?: string }>,
) {
    return (
        <div className="mb-6 flex flex-row justify-between items-center">
            <div className="flex flex-col gap-y-2">
                <Title2>{props.title}</Title2>
                {props.subtitle && <Body1>{props.subtitle}</Body1>}
            </div>
            <div>{props.children}</div>
        </div>
    );
}
