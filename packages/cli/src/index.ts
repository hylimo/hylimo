#!/usr/bin/env node
/* eslint-disable no-console */
import * as fs from "fs";
import * as path from "path";
import { program } from "commander";
import { PDFRenderer } from "@hylimo/diagram-render-pdf";
import { SVGRenderer } from "@hylimo/diagram-render-svg";
import {
    DiagramEngine,
    LayoutEngine,
    baseDiagramModule,
    classDiagramModule,
    diagramModule,
    dslModule,
    editModule
} from "@hylimo/diagram";
import { Interpreter, Parser, defaultModules } from "@hylimo/core";
import { DiagramConfig } from "@hylimo/diagram-common";

program
    .version("1.0.0")
    .description("HyLiMo CLI - Render a HyLiMo diagram as SVG or PDF")
    .requiredOption("-f, --input <file>", "Input file path")
    .requiredOption(
        "-o, --output <file>",
        "Output file path. Should end with .svg or .pdf to automatically select the output format"
    )
    .option("--dark", "Enable dark mode", false)
    .option("--max-execution-steps", "Maximum number of execution steps", parseInt, 1000000)
    .parse(process.argv);

const options = program.opts();

const inputFile = options.input;
const outputFile = options.output;
const darkMode = options.dark;
const maxExecutionSteps = options.maxExecutionSteps;

const validExtensions = [".svg", ".pdf"];
const outputExtension = path.extname(outputFile);

if (!validExtensions.includes(outputExtension)) {
    console.error("Error: Output file must end with .svg or .pdf");
    process.exit(1);
}

let inputFileContent: string;
try {
    inputFileContent = fs.readFileSync(inputFile, "utf-8");
} catch (error) {
    console.error(`Error reading input file: ${error}`);
    process.exit(1);
}

const layoutEngine = new LayoutEngine();
const diagramEngine = new DiagramEngine(
    new Parser(false),
    new Interpreter(
        [diagramModule, dslModule, editModule, baseDiagramModule, classDiagramModule],
        defaultModules,
        maxExecutionSteps
    ),
    layoutEngine
);

const config: DiagramConfig = {
    theme: darkMode ? "dark" : "light"
};

(async () => {
    const diagram = await diagramEngine.render(inputFileContent, config);
    const rootElement = diagram.layoutedDiagram?.rootElement;

    if (!rootElement) {
        console.error("Error: No root element found");
        process.exit(1);
    }

    if (outputExtension === ".pdf") {
        const renderer = new PDFRenderer();
        const renderedPdf = await renderer.render(rootElement, darkMode ? "black" : "white");
        fs.writeFileSync(outputFile, Buffer.from(renderedPdf.flatMap((part) => [...part])));
    } else if (outputExtension === ".svg") {
        const renderer = new SVGRenderer();
        const svg = renderer.render(rootElement);
        fs.writeFileSync(outputFile, svg);
    }
})();
