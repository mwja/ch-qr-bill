import { SearchBox } from "@fluentui/react-components";

export default function GlobalHeader() {
    return (
        <div className="shrink-0 flex flex-row justify-center items-center bg-(--colorNeutralBackground4) w-full h-10">
            <SearchBox
                className="min-w-[30%]"
                placeholder="Search for a bill, a debitor..."
            />
        </div>
    );
}
