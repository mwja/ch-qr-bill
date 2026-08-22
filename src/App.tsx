import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import ThemeProvider from "./components/ThemeProvider";
import "./App.css";
import { createHashRouter, Route, RouterProvider, Routes } from "react-router";
import Layout from "./components/layout";
import DebitorCreate from "./views/debitors/DebitorCreate";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DebitorView from "./views/debitors/DebitorView";
import CreditorCreate from "./views/creditors/CreditorCreate";
import CreditorView from "./views/creditors/CreditorView";
import DebitorOverview from "./views/debitors/DebitorOverview";
import CreditorOverview from "./views/creditors/CreditorOverview";
import BillCreate from "./views/bills/BillCreate";

const queryClient = new QueryClient();
const router = createHashRouter([
    {
        element: <Layout />,
        children: [
            {
                index: true,
                element: <p>hi</p>,
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
                        handle: { breadcrumb: "View" },
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
                        handle: { breadcrumb: "View" },
                    },
                ],
            },
            {
                path: "bills",
                handle: { breadcrumb: "Bills" },
                children: [
                    {
                        index: true,
                        element: <p>hi</p>,
                    },
                    {
                        path: "new",
                        element: <BillCreate />,
                    },
                ],
            },
        ],
    },
]);
function App() {
    const [greetMsg, setGreetMsg] = useState("");
    const [name, setName] = useState("");

    async function greet() {
        // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
        setGreetMsg(await invoke("greet", { name }));
    }

    const [isOpen, setIsOpen] = useState(true);

    return (
        <ThemeProvider>
            <QueryClientProvider client={queryClient}>
                <RouterProvider router={router} />
            </QueryClientProvider>

            {/*<main className="container">
        <h1>Welcome to Tauri + React</h1>

        <div className="row">
            <a href="https://vite.dev" target="_blank">
                <img
                    src="/vite.svg"
                    className="logo vite"
                    alt="Vite logo"
                />
            </a>
            <a href="https://tauri.app" target="_blank">
                <img
                    src="/tauri.svg"
                    className="logo tauri"
                    alt="Tauri logo"
                />
            </a>
            <a href="https://react.dev" target="_blank">
                <img
                    src={reactLogo}
                    className="logo react"
                    alt="React logo"
                />
            </a>
        </div>
        <p>Click on the Tauri, Vite, and React logos to learn more.</p>

        <form
            className="row"
            onSubmit={(e) => {
                e.preventDefault();
                greet();
            }}
        >
            <input
                id="greet-input"
                onChange={(e) => setName(e.currentTarget.value)}
                placeholder="Enter a name..."
            />
            <button type="submit">Greet</button>
        </form>
        <p>{greetMsg}</p>
    </main>*/}
        </ThemeProvider>
    );
}

export default App;
