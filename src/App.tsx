import ThemeProvider from "./components/ThemeProvider";
import "./App.css";
import { createHashRouter, RouterProvider } from "react-router";
import Layout from "./components/layout";
import DebitorCreate from "./views/debitors/DebitorCreate";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DebitorView from "./views/debitors/DebitorView";
import CreditorCreate from "./views/creditors/CreditorCreate";
import CreditorView from "./views/creditors/CreditorView";
import DebitorOverview from "./views/debitors/DebitorOverview";
import CreditorOverview from "./views/creditors/CreditorOverview";
import BillCreate from "./views/bills/BillCreate";
import BillEdit from "./views/bills/BillEdit";
import BillOverview from "./views/bills/BillOverview";

const queryClient = new QueryClient();
const router = createHashRouter([
    {
        element: <Layout />,
        children: [
            {
                index: true,
                element: <BillOverview />,
            },
            {
                path: "debitors",
                handle: { breadcrumb: "Debitors" },
                children: [
                    {
                        index: true,
                        element: <DebitorOverview />,
                    },
                    {
                        path: "new",
                        element: <DebitorCreate />,
                        handle: { breadcrumb: "New" },
                    },
                    {
                        path: ":id",
                        element: <DebitorView />,
                        handle: { breadcrumb: "Edit" },
                    },
                ],
            },
            {
                path: "creditors",
                handle: { breadcrumb: "Creditors" },
                children: [
                    {
                        index: true,
                        element: <CreditorOverview />,
                    },
                    {
                        path: "new",
                        element: <CreditorCreate />,
                        handle: { breadcrumb: "New" },
                    },
                    {
                        path: ":id",
                        element: <CreditorView />,
                        handle: { breadcrumb: "Edit" },
                    },
                ],
            },
            {
                path: "bills",
                handle: { breadcrumb: "Bills" },
                children: [
                    {
                        index: true,
                        element: <BillOverview />,
                    },
                    {
                        path: "new",
                        element: <BillCreate />,
                        handle: { breadcrumb: "New" },
                    },
                    {
                        path: ":id",
                        element: <BillEdit />,
                        handle: { breadcrumb: "Edit" },
                    },
                ],
            },
        ],
    },
]);

function App() {
    return (
        <ThemeProvider>
            <QueryClientProvider client={queryClient}>
                <RouterProvider router={router} />
            </QueryClientProvider>
        </ThemeProvider>
    );
}

export default App;
