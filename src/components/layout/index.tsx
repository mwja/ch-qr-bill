import { Outlet } from "react-router";
import Navigation from "./Navigation";
import GlobalHeader from "./GlobalHeader";
import AppBreadcrumbs from "./Breadcrumbs";

export default function Layout() {
    return (
        <div className="flex flex-row h-dvh w-dvw bg-(--colorNeutralBackground4)">
            <Navigation />
            <div className="flex flex-col h-dvh grow ">
                <GlobalHeader />
                <div className="mb-2">
                    <AppBreadcrumbs />
                </div>
                <div className="grow overflow-auto rounded-tl-(--borderRadiusXLarge) bg-(--colorNeutralBackground1)">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
