import { useParams } from "react-router";

export default function DebitorView() {
    const { id } = useParams();

    return id;
}
