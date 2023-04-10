import React, { useContext } from "react";
import NavbarItem from "@theme-original/NavbarItem";
import { GlobalStateContext } from "../Root";

/**
 * Wraps the navbar item to hide items which should only be rendered if a diagram is present.
 *
 * @param props probs to pass to the navbar item
 * @returns the navbar item or null
 */
export default function NavbarItemWrapper(props: any) {
    const { diagram, diagramCode } = useContext(GlobalStateContext);
    if (props.ifdiagramexists && diagram == null) {
        return null;
    }
    if (props.ifdiagramcodeexists && diagramCode == null) {
        return null;
    }
    const newProps = {
        ...props,
        ifdiagramexists: undefined,
        ifdiagramcodeexists: undefined
    };
    return (
        <>
            <NavbarItem {...newProps} />
        </>
    );
}
