import {
    assertFunction,
    assertString,
    ExecutableConstExpression,
    generateArgs,
    id,
    jsFun,
    native,
    optional,
    type ExecutableListEntry
} from "@hylimo/core";
import { SCOPE } from "../../../../base/dslModule.js";
import { ContentModule } from "../../contentModule.js";
import { participantType } from "./types.js";
import { registerClassifierToolboxEdits } from "../classifier/classifier.js";

/**
 * Module overwriting the registerClassifier function
 */
export const registerClassifierModule = ContentModule.create(
    "uml/sequence/registerClassifier",
    ["uml/classifier/classifier", "uml/sequence/participant"],
    [],
    [
        id(SCOPE)
            .field("internal")
            .assignField(
                "registerClassifier",
                jsFun((args, context) => {
                    const name = args.getLocalFieldOrUndefined(0)?.value;
                    const participantFunction = args.getLocalFieldOrUndefined(1)?.value;
                    const toolboxEdits = args.getLocalFieldOrUndefined(2)?.value;
                    assertFunction(participantFunction!);
                    const docs = participantFunction.definition.documentation;
                    const createParticipant = context
                        .getField(SCOPE)
                        .getFieldValue("internal", context)
                        .getFieldValue("createSequenceDiagramParticipant", context);
                    assertFunction(createParticipant);
                    const wrappedParticipantFunction = native(
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
                                        value: new ExecutableConstExpression(
                                            argsObject.getField(entry.name, context)
                                        )
                                    });
                                } else {
                                    newArgs.push({
                                        value: new ExecutableConstExpression(argsObject.getField(i, context))
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
                                        value: new ExecutableConstExpression(argsObject.getField("below", context))
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
                    const scope = context.getField(SCOPE);
                    scope.setLocalField(assertString(name!), wrappedParticipantFunction, context);
                    registerClassifierToolboxEdits(scope, toolboxEdits!, false, context);
                    return context.null;
                })
            )
    ]
);
