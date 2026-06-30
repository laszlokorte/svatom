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

export function bindBoundingBox(arg) {
  return (node) => svt.bindBoundingBox(node, arg);
}
export function bindEvents(arg) {
  return (node) => svt.bindEvents(node, arg);
}
export function bindScroll(arg) {
  return (node) => svt.bindScroll(node, arg);
}
export function bindScrollMax(arg) {
  return (node) => svt.bindScrollMax(node, arg);
}
export function bindValue(arg) {
  return (node) => svt.bindValue(node, arg);
}
export function disableEventIf(arg) {
  return (node) => svt.disableEventIf(node, arg);
}
export function onPointerClick(arg) {
  return (node) => svt.onPointerClick(node, arg);
}
export function polyfillDragDrop(arg) {
  return (node) => svt.polyfillDragDrop(node, arg);
}
export function readTextreaScrollSize(arg) {
  return (node) => svt.readTextreaScrollSize(node, arg);
}
