import { createActor } from "xstate";

export * from "@svatom/basic/svatom.svelte.js";

import { fsm as fsmInternal } from "@svatom/basic/fsm.svelte.js";

export const fsm = (machineDef) => fsmInternal(machineDef, createActor);
