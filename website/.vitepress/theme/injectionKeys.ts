import { InjectionKey, ShallowRef } from "vue";
import type { LanguageClientProxy, LanguageServerConfig } from "./lspPlugin";

/**
 * A key for the language client in the Vue app.
 */

export const languageClientKey = Symbol("languageClient") as InjectionKey<ShallowRef<Promise<LanguageClientProxy>>>;
/**
 * A key for the language server config in the Vue app.
 */

export const languageServerConfigKey = Symbol("languageServerConfig") as InjectionKey<LanguageServerConfig>;
