import { ContentModule } from "../../contentModule.js";

/**
 * Module providing the sections content handler
 */
export const sectionsModule = ContentModule.create(
    "uml/classifier/sections",
    [],
    [],
    `
        scope.internal.sectionsContentHandler = [
            {
                this.callScope = args.callScope
                callScope.sections = list()
                callScope.section = listWrapper {
                    sectionIndex = args.section
                    newSection = it
                    if(sectionIndex == null) {
                        callScope.sections += newSection
                    } {
                        while { callScope.sections.length <= sectionIndex } {
                            callScope.sections += null
                        }
                        if(callScope.sections.get(sectionIndex) == null) {
                            callScope.sections.set(sectionIndex, list())
                        }
                        callScope.sections.get(sectionIndex).addAll(newSection)
                    }
                }
            },
            {
                this.contents = args.contents

                args.callScope.sections.forEach {
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
);
