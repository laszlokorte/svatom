import * as R from "ramda";

export function clamp(min, max) {
  return (v) => Math.max(min, Math.min(max, v));
}

export function isPlainObject(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return (
    (prototype === null ||
      prototype === Object.prototype ||
      Object.getPrototypeOf(prototype) === null) &&
    !(Symbol.toStringTag in value) &&
    !(Symbol.iterator in value)
  );
}

export const capitalize = R.compose(
  R.join(""),
  R.juxt([R.compose(R.toUpper, R.head), R.tail]),
);

export function scaleViewBox(
  { alignmentX, alignmentY, width, height, minX, minY, scaling },
  targetWidth,
  targetHeight,
  padding = 0,
) {
  if (!scaling) {
    const hPad = padding * targetWidth ? width / targetWidth : 1;
    const vPad = padding * targetHeight ? height / targetHeight : 1;

    return {
      minX: minX + hPad,
      minY: minY + vPad,
      width: Math.max(width - 2 * hPad, 0),
      height: Math.max(height - 2 * vPad, 0),
    };
  } else {
    const factor = {
      meet: Math.max,
      slice: Math.min,
    }[scaling].call(
      Math,
      targetWidth ? width / targetWidth : 1,
      targetHeight ? height / targetHeight : 1,
    );

    const actualWidth = targetWidth * factor;
    const actualHeight = targetHeight * factor;
    const extraWidth = actualWidth - width;
    const extraHeight = actualHeight - height;

    const alignmentWeights = {
      Min: 0,
      Mid: 0.5,
      Max: 1,
    };

    const extraWeightingX = alignmentWeights[alignmentX];
    const extraWeightingY = alignmentWeights[alignmentY];

    const actualPadding = factor * padding;

    return {
      minX: minX - extraWeightingX * extraWidth + actualPadding,
      minY: minY - extraWeightingY * extraHeight + actualPadding,
      width: Math.max(actualWidth - 2 * actualPadding, 0),
      height: Math.max(actualHeight - 2 * actualPadding, 0),
    };
  }
}

export function isLeftButton(event, allowModifiers = false) {
  if (
    !allowModifiers &&
    (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey)
  ) {
    return false;
  } else if ("buttons" in event) {
    return event.buttons === 1;
  } else if ("which" in event) {
    return event.which === 1;
  } else {
    return event.button == 1 || event.type == "click";
  }
}

function screenToElementViewboxHelper(
  clientX,
  clientY,
  elementX,
  elementY,
  elementWidth,
  elementHeight,
  localWidth,
  localHeight,
  viewBox,
) {
  const scaledVB = scaleViewBox(viewBox, localWidth, localHeight);

  return {
    x: scaledVB.minX + scaledVB.width * ((clientX - elementX) / elementWidth),
    y: scaledVB.minY + scaledVB.height * ((clientY - elementY) / elementHeight),
  };
}

export function screenToElementViewbox(clientX, clientY, element, viewBox) {
  if (!element) {
    return { x: 0, y: 0 };
  }

  const boundingRect = element.getBoundingClientRect();

  return screenToElementViewboxHelper(
    clientX,
    clientY,
    boundingRect.left,
    boundingRect.top,
    boundingRect.width,
    boundingRect.height,
    element.clientWidth,
    element.clientHeight,
    viewBox,
  );
}

function elementViewboxToScreenHelper(
  viewboxX,
  viewboxY,
  elementX,
  elementY,
  elementWidth,
  elementHeight,
  localWidth,
  localHeight,
  viewBox,
) {
  const scaledVB = scaleViewBox(viewBox, localWidth, localHeight);

  return {
    x: elementX + elementWidth * ((viewboxX - scaledVB.minX) / scaledVB.width),
    y:
      elementY + elementHeight * ((viewboxY - scaledVB.minY) / scaledVB.height),
  };
}

export function elementViewboxToScreen(viewportX, viewportY, element, viewBox) {
  if (!element) {
    return { x: 0, y: 0 };
  }
  const boundingRect = element.getBoundingClientRect();

  return elementViewboxToScreenHelper(
    viewportX,
    viewportY,
    boundingRect.left,
    boundingRect.top,
    boundingRect.width,
    boundingRect.height,
    element.clientWidth,
    element.clientHeight,
    viewBox,
  );
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

const numberSvgFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 5,
  maximumFractionDigits: 5,
  useGrouping: false,
});

export function formattedNumbers(parts, ...args) {
  let accum = "";

  for (let p = 0; p < args.length; p++) {
    const formatted =
      typeof args[p] === "Number" ? numberSvgFormat.format(args[p]) : args[p];

    accum += parts[p] + formatted;
  }

  accum += parts[parts.length - 1];

  return accum;

  // return (
  //     R.join(
  //         "",
  //         R.zipWith(
  //             R.concat,
  //             parts,
  //             R.map(
  //                 R.ifElse(
  //                     R.is(Number),
  //                     numberSvgFormat.format,
  //                     R.identity,
  //                 ),
  //                 args,
  //             ),
  //         ),
  //     ) + R.last(parts)
  // );
}
