import {
    assertFunction,
    assign,
    ExecutableConstExpression,
    generateArgs,
    jsFun,
    native,
    optional,
    type ExecutableListEntry
} from "@hylimo/core";
import { ContentModule } from "../../contentModule.js";
import { participantType } from "./types.js";
import { SCOPE } from "../../../../base/dslModule.js";

export const importedParticipantsModule = ContentModule.create(
    "uml/sequence/importedParticipants",
    ["uml/component", "uml/instance", "uml/actor", "uml/sequence/participant"],
    [],
    [
        assign(
            "_importParticipant",
            jsFun((args, context) => {
                const participantFunction = args.getSelfFieldValue(0, context);
                assertFunction(participantFunction);
                const docs = participantFunction.definition.documentation;
                const createParticipant = context
                    .getField(SCOPE)
                    .getSelfFieldValue("internal", context)
                    .getSelfFieldValue("createSequenceDiagramParticipant", context);
                assertFunction(createParticipant);
                return native(
                    (args, context, _scope, callExpression) => {
                        const argsObject = generateArgs(args, context, undefined, callExpression);
                        const newArgs: ExecutableListEntry[] = [];
                        let i = 0;
                        for (const entry of args) {
                            if (entry.name === "below") {
                                continue;
                            }
                            if (entry.name != undefined) {
                                newArgs.push({
                                    name: entry.name,
                                    value: new ExecutableConstExpression(argsObject.getSelfField(entry.name, context))
                                });
                            } else {
                                newArgs.push({
                                    value: new ExecutableConstExpression(argsObject.getSelfField(i, context))
                                });
                                i++;
                            }
                        }
                        const result = participantFunction.invoke(newArgs, context, undefined, callExpression);
                        return createParticipant.invoke(
                            [
                                { value: new ExecutableConstExpression(result) },
                                {
                                    name: "below",
                                    value: new ExecutableConstExpression(argsObject.getSelfField("below", context))
                                }
                            ],
                            context,
                            undefined,
                            undefined
                        );
                    },
                    {
                        docs: docs?.docs ?? "Missing documentation for imported participant",
                        params: [
                            ...(docs?.params ?? []),
                            [
                                "below",
                                "the optional participant below which the participant should be placed. If set, this participant will have the same x coordinate as the given value and the y coordinate of the current event",
                                optional(participantType)
                            ]
                        ],
                        returns: "the created participant"
                    }
                ).evaluate(context);
            })
        ),
        `
            scope.instance = _importParticipant(scope.instance)
            scope.actor = _importParticipant(scope.actor)
            scope.component = _importParticipant(scope.component)

            scope.styles {
                cls("instance-element") {
                    minWidth = 50
                }

                cls("component-element") {
                    minWidth = 50
                }
            }
        `
    ]
);
