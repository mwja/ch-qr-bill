import { Title2 } from "@fluentui/react-components";

export default function Header(
    props: React.PropsWithChildren<{ title: string }>,
) {
    return (
        <div className="mb-6 flex flex-row justify-between items-center">
            <Title2>{props.title}</Title2>
            <div>{props.children}</div>
        </div>
    );
}
