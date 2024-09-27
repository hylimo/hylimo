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
                        this.scope = args.scope
                        scope.sections = list()
                        scope.section = listWrapper {
                            sectionIndex = args.section
                            newSection = it
                            if(sectionIndex == null) {
                                scope.sections += newSection
                            } {
                                while { scope.sections.length <= sectionIndex } {
                                    scope.sections += null
                                }
                                if(scope.sections.get(sectionIndex) == null) {
                                    scope.sections.set(sectionIndex, list())
                                }
                                scope.sections.get(sectionIndex).addAll(newSection)
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
