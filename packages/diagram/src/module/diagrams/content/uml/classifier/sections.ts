import { InterpreterModule, parse } from "@hylimo/core";

/**
 * Module providing the sections content handler
 */
export const sectionsModule = InterpreterModule.create(
    "uml/classifier/sections",
    [],
    [],
    [
        ...parse(
            `
                scope.internal.sectionsContentHandler = [
                    {
                        args.scope.sections = list()
                        args.scope.section = listWrapper {
                            sectionIndex = args.section
                            newSection = it
                            if(sectionIndex == null) {
                                result.sections += newSection
                            } {
                                while { result.sections.length <= sectionIndex } {
                                    result.sections += null
                                }
                                if(result.sections.get(sectionIndex) == null) {
                                    result.sections.set(sectionIndex, list())
                                }
                                result.sections.get(sectionIndex).addAll(newSection)
                            }
                        }
                    },
                    {
                        this.contents = args.contents

                        args.scope.sections.forEach {
                            this.section = it
                            if (section != null) {
                                contents += path(path = "M 0 0 L 1 0", class = list("separator"))
                                section.forEach {
                                    contents += text(contents = list(span(text = it)))
                                }
                            }
                        }
                    }
                ]
            `
        )
    ]
);
