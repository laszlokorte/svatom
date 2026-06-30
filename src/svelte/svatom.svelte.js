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
  return (node) => _bindScrollMax(node, arg);
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
export function animateWith(someAtom, fn) {
  let raf = null;

  $effect(() => {
    const currentVal = someAtom.value;
    const restore = (event) => {
      fn(currentVal);
    };
    if (currentVal) {
      currentVal.el.addEventListener("contextrestored", restore);
      function tick() {
        if (raf === null) {
          return;
        }
        const currentVal = someAtom.value;
        if (currentVal) {
          fn(currentVal);
          raf = requestAnimationFrame(tick);
        }
      }

      tick();

      return () => {
        currentVal.el.removeEventListener("contextrestored", restore);
      };
    } else if (raf) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  });
}

export function _bindScrollMax(node, someAtom) {
  // TODO specialize code for different kind of elements
  const resizeObserver = new ResizeObserver(() => {
    someAtom.value = {
      x: node.scrollWidth - node.clientWidth,
      y: node.scrollHeight - node.clientHeight,
    };
  });

  const mutObserver = new MutationObserver(() => {
    someAtom.value = {
      x: node.scrollWidth - node.clientWidth,
      y: node.scrollHeight - node.clientHeight,
    };
  });

  const onInput = (evt) => {
    if (evt.currentTarget !== node) {
      return;
    }
    someAtom.value = {
      x: node.scrollWidth - node.clientWidth,
      y: node.scrollHeight - node.clientHeight,
    };
  };

  resizeObserver.observe(node);
  mutObserver.observe(node, {
    attributes: true,
    childList: false,
    subtree: true,
    characterData: true,
  });
  node.addEventListener("input", onInput);

  return () => {
    node.removeEventListener("input", onInput);
    mutObserver.disconnect(node);
    resizeObserver.disconnect(node);
  };
}
