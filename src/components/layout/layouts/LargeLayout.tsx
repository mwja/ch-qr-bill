export default function LargeLayout(
    props: React.PropsWithChildren<{
        className?: string;
    }>,
) {
    return (
        <div className={`mx-12 mt-8 ${props.className}`}>{props.children}</div>
    );
}
