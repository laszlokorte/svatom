import { createActor } from "xstate";

function restoreSelection(target, cb) {
  if (target.selectionStart !== null) {
    const s0 = target.selectionStart;
    const s1 = target.selectionEnd;
    const l0 = target.value.slice(0, s0).split("\n").length;
    const l1 = target.value.slice(0, s1).split("\n").length;

    const lines0 = target.value.slice(0, s0).split("\n");
    const lines1 = target.value.slice(0, s1).split("\n");
    const column0 = lines0[lines0.length - 1].length;
    const column1 = lines1[lines1.length - 1].length;

    cb();

    const newLines = target.value.split("\n");
    const newStart = newLines
      .slice(0, l0 - 1)
      .reduce((a, c) => a + c.length + 1, column0);
    const newEnd = newLines
      .slice(0, l1 - 1)
      .reduce((a, c) => a + c.length + 1, column1);
    target.selectionStart = newStart;
    target.selectionEnd = newEnd;
  } else {
    cb();
  }
}
export * from "@svatom/basic/svatom.svelte.js";
export function bindValue(node, someAtom) {
  function oninput(e) {
    const target = e.currentTarget;

    restoreSelection(target, () => {
      someAtom.value = target.value;
      target.value = someAtom.value;
      const newVal = someAtom.value;
      if (target.value != newVal) {
        target.value = newVal;
      }
    });
  }

  node.value = someAtom.value;

  $effect.pre(() => {
    const newVal = someAtom.value;
    if (node.value != newVal) {
      node.value = newVal;
    }
  });
  node.addEventListener("input", oninput);
  node.addEventListener("change", oninput);

  return {
    destroy: () => {
      node.removeEventListener("input", oninput);
      node.removeEventListener("change", oninput);
    },
  };
}

import { fsm as fsmInternal } from "@svatom/basic/fsm.svelte.js";

export const fsm = (machineDef) => fsmInternal(machineDef, createActor);
