import activity from "../examples/activity.hyl?raw";
import automotive from "../examples/automotive.hyl?raw";
import classDiagram from "../examples/class.hyl?raw";
import component from "../examples/component.hyl?raw";
import deployment from "../examples/deployment.hyl?raw";
import languageServer from "../examples/language-server.hyl?raw";
import packages from "../examples/packages.hyl?raw";
import sequence from "../examples/sequence.hyl?raw";
import uml from "../examples/uml.hyl?raw";
import usecase from "../examples/usecase.hyl?raw";

/**
 * An example diagram, shown in the gallery and on the page of its diagram type
 */
export interface DiagramExample {
    /**
     * Identifier used to reference the example from markdown
     */
    id: string;
    /**
     * Title shown in the gallery
     */
    title: string;
    /**
     * One line description shown in the gallery
     */
    description: string;
    /**
     * The group the example belongs to in the gallery
     */
    group: string;
    /**
     * The source code of the diagram
     */
    source: string;
    /**
     * The page documenting the diagram type, if any
     */
    docs?: {
        text: string;
        link: string;
    };
}

/**
 * All example diagrams.
 * The sources are stored as separate `.hyl` files in `website/examples`, so that each example exists
 * exactly once, no matter how many pages show it.
 */
export const diagramExamples: DiagramExample[] = [
    {
        id: "class",
        title: "Class diagram",
        description: "The domain model of a small shop",
        group: "Diagram types",
        source: classDiagram,
        docs: { text: "UML Class Diagram", link: "/docs/class" }
    },
    {
        id: "component",
        title: "Component diagram",
        description: "The parts of the shop and the interfaces between them",
        group: "Diagram types",
        source: component,
        docs: { text: "UML Component Diagram", link: "/docs/component" }
    },
    {
        id: "sequence",
        title: "Sequence diagram",
        description: "An order, from the first click to the confirmation",
        group: "Diagram types",
        source: sequence,
        docs: { text: "UML Sequence Diagram", link: "/docs/sequence" }
    },
    {
        id: "activity",
        title: "Activity diagram",
        description: "Order handling, with decisions and parallel flows",
        group: "Diagram types",
        source: activity,
        docs: { text: "UML Activity Diagram", link: "/docs/activity" }
    },
    {
        id: "deployment",
        title: "Deployment diagram",
        description: "Where the shop runs and what is deployed onto it",
        group: "Diagram types",
        source: deployment,
        docs: { text: "UML Deployment Diagram", link: "/docs/deployment" }
    },
    {
        id: "usecase",
        title: "Use case diagram",
        description: "Who uses the shop, and what for",
        group: "Diagram types",
        source: usecase,
        docs: { text: "UML Use Case Diagram", link: "/docs/usecase" }
    },
    {
        id: "uml",
        title: "Mixed UML diagram",
        description: "A use case, the component realizing it, and what it does",
        group: "Diagram types",
        source: uml,
        docs: { text: "UML Diagram", link: "/docs/uml" }
    },
    {
        id: "automotive",
        title: "Classes in a package",
        description: "Class, interface, package and comment in one diagram",
        group: "More examples",
        source: automotive,
        docs: { text: "UML Class Diagram", link: "/docs/class" }
    },
    {
        id: "language-server",
        title: "The HyLiMo language server",
        description: "The class structure behind the editor",
        group: "More examples",
        source: languageServer,
        docs: { text: "UML Class Diagram", link: "/docs/class" }
    },
    {
        id: "packages",
        title: "The HyLiMo packages",
        description: "A package diagram built from custom elements",
        group: "More examples",
        source: packages,
        docs: { text: "Diagram DSL", link: "/docs/diagram" }
    }
];

/**
 * Looks up an example by its id
 *
 * @param id the id of the example
 * @returns the example with the given id
 */
export function getDiagramExample(id: string): DiagramExample {
    const example = diagramExamples.find((entry) => entry.id === id);
    if (example == undefined) {
        throw new Error(`Unknown diagram example: ${id}`);
    }
    return example;
}
