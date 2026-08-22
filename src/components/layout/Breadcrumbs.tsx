import {
    Breadcrumb,
    BreadcrumbButton,
    BreadcrumbItem,
    BreadcrumbDivider,
} from "@fluentui/react-components";
import React from "react";
import { useMatches } from "react-router";

type BreadcrumbHandle = {
    breadcrumb: string;
};

export default function AppBreadcrumbs() {
    const matches = useMatches();

    const breadcrumbs = matches
        .map((match) => {
            const handle = match.handle as BreadcrumbHandle | undefined;

            if (!handle?.breadcrumb) {
                return null;
            }

            return {
                label: handle.breadcrumb,
                pathname: match.pathname,
            };
        })
        .filter((breadcrumb) => breadcrumb !== null);

    return (
        <Breadcrumb>
            {breadcrumbs.map((breadcrumb, index) => (
                <React.Fragment key={breadcrumb.pathname}>
                    {index > 0 && <BreadcrumbDivider />}

                    <BreadcrumbItem>
                        <BreadcrumbButton
                            as="a"
                            href={"#" + breadcrumb.pathname}
                        >
                            {breadcrumb.label}
                        </BreadcrumbButton>
                    </BreadcrumbItem>
                </React.Fragment>
            ))}
        </Breadcrumb>
    );
}
