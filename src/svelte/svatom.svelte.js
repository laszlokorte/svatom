import { createActor } from "xstate";

export * from "@svatom/basic/svatom.svelte.js";
import * as svt from "@svatom/basic/svatom.svelte.js";

import { fsm as fsmInternal } from "@svatom/basic/fsm.svelte.js";

export const fsm = (machineDef) => fsmInternal(machineDef, createActor);

export function bindSize(listener) {
  return (node) => svt.bindSize(node, listener);
}
export function activeTouchMove(listener) {
  return (node) => svt.activeTouchMove(node, listener);
}

export function adjustSize(listener) {
  return (node) => svt.adjustSize(node, listener);
}

export function bindScroll(atom) {
  return (node) => svt.bindScroll(node, atom);
}

export function autofocusIf(yes) {
  return (node) => {
    if (yes && document.activeElement !== node) {
      $effect(() => {
        node.focus({
          preventScroll: true,
        });
      });
    } else if (!yes && document.activeElement === node) {
      $effect(() => {
        node.blur();
      });
    }
  };
}
