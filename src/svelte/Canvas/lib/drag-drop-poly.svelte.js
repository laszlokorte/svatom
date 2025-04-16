import {enableDragDropTouch} from './drag-drop-poly.js'

export function polyfillDragDrop(node, args) {
  let poly = null
  if(args && args.dropArea) {
    $effect(() => {
      const dropArea = args.dropArea.value
      poly = enableDragDropTouch(node, dropArea, args.options)
      return () => {
        poly.dispose()
        poly = null
      }
    })
  } else {
    poly = enableDragDropTouch(node, document, args?.options)
  }

  return {
        destroy() {
          if(poly) {
              poly.dispose()
          }
        },
    };
}