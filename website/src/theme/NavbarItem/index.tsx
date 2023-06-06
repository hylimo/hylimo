import React, { useContext } from "react";
import NavbarItem from "@theme-original/NavbarItem";
import { GlobalStateContext } from "../Root";
import useRouteContext from "@docusaurus/useRouteContext";

/**
 * Wraps the navbar item to hide items which should only be rendered if a diagram is present.
 *
 * @param props probs to pass to the navbar item
 * @returns the navbar item or null
 */
export default function NavbarItemWrapper(props: any) {
    const { diagram, diagramCode } = useContext(GlobalStateContext);
    const routeContext = useRouteContext();
    if (props.ifdiagramexists && diagram == null) {
        return null;
    }
    if (props.ifdiagramcodeexists && diagramCode == null) {
        return null;
    }
    if (
        props.ifeditor &&
        (routeContext.plugin.name !== "docusaurus-plugin-content-pages" || routeContext.plugin.id !== "default")
    ) {
        return null;
    }
    const newProps = {
        ...props,
        ifdiagramexists: undefined,
        ifdiagramcodeexists: undefined,
        ifeditor: undefined
    };
    return (
        <>
            <NavbarItem {...newProps} />
        </>
    );
}
