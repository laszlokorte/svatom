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

export function quadToEllipse(W, X, Y, Z) {
  // Reconstruct matrix that transforms the unit square ((-1,-1), (1,1)) into quad (W,X,Y,Z)
  const m00 =
    X.x * Y.x * Z.y -
    W.x * Y.x * Z.y -
    X.x * Y.y * Z.x +
    W.x * Y.y * Z.x -
    W.x * X.y * Z.x +
    W.y * X.x * Z.x +
    W.x * X.y * Y.x -
    W.y * X.x * Y.x;
  const m01 =
    W.x * Y.x * Z.y -
    W.x * X.x * Z.y -
    X.x * Y.y * Z.x +
    X.y * Y.x * Z.x -
    W.y * Y.x * Z.x +
    W.y * X.x * Z.x +
    W.x * X.x * Y.y -
    W.x * X.y * Y.x;
  const m02 =
    X.x * Y.x * Z.y -
    W.x * X.x * Z.y -
    W.x * Y.y * Z.x -
    X.y * Y.x * Z.x +
    W.y * Y.x * Z.x +
    W.x * X.y * Z.x +
    W.x * X.x * Y.y -
    W.y * X.x * Y.x;
  const m10 =
    X.y * Y.x * Z.y -
    W.y * Y.x * Z.y -
    W.x * X.y * Z.y +
    W.y * X.x * Z.y -
    X.y * Y.y * Z.x +
    W.y * Y.y * Z.x +
    W.x * X.y * Y.y -
    W.y * X.x * Y.y;
  const m11 =
    -X.x * Y.y * Z.y +
    W.x * Y.y * Z.y +
    X.y * Y.x * Z.y -
    W.x * X.y * Z.y -
    W.y * Y.y * Z.x +
    W.y * X.y * Z.x +
    W.y * X.x * Y.y -
    W.y * X.y * Y.x;
  const m12 =
    X.x * Y.y * Z.y -
    W.x * Y.y * Z.y +
    W.y * Y.x * Z.y -
    W.y * X.x * Z.y -
    X.y * Y.y * Z.x +
    W.y * X.y * Z.x +
    W.x * X.y * Y.y -
    W.y * X.y * Y.x;
  const m20 =
    X.x * Z.y -
    W.x * Z.y -
    X.y * Z.x +
    W.y * Z.x -
    X.x * Y.y +
    W.x * Y.y +
    X.y * Y.x -
    W.y * Y.x;
  const m21 =
    Y.x * Z.y -
    X.x * Z.y -
    Y.y * Z.x +
    X.y * Z.x +
    W.x * Y.y -
    W.y * Y.x -
    W.x * X.y +
    W.y * X.x;
  const m22 =
    Y.x * Z.y -
    W.x * Z.y -
    Y.y * Z.x +
    W.y * Z.x +
    X.x * Y.y -
    X.y * Y.x +
    W.x * X.y -
    W.y * X.x;

  // invert matrix
  const determinant =
    +m00 * (m11 * m22 - m21 * m12) -
    m01 * (m10 * m22 - m12 * m20) +
    m02 * (m10 * m21 - m11 * m20);

  if (determinant == 0) return null;

  const invdet = 1 / determinant;
  const J = (m11 * m22 - m21 * m12) * invdet;
  const K = -(m01 * m22 - m02 * m21) * invdet;
  const L = (m01 * m12 - m02 * m11) * invdet;
  const M = -(m10 * m22 - m12 * m20) * invdet;
  const N = (m00 * m22 - m02 * m20) * invdet;
  const O = -(m00 * m12 - m10 * m02) * invdet;
  const P = (m10 * m21 - m20 * m11) * invdet;
  const Q = -(m00 * m21 - m20 * m01) * invdet;
  const R = (m00 * m11 - m10 * m01) * invdet;

  // extract ellipse coefficients from matrix
  const a = J * J + M * M - P * P;
  const b = J * K + M * N - P * Q;
  const c = K * K + N * N - Q * Q;
  const d = J * L + M * O - P * R;
  const f = K * L + N * O - Q * R;
  const g = L * L + O * O - R * R;

  // deduce ellipse center from coefficients
  const centerX = (c * d - b * f) / (b * b - a * c);
  const centerY = (a * f - b * d) / (b * b - a * c);

  // deduce ellipse radius from coefficients
  const radiusA = Math.sqrt(
    (2 * (a * f * f + c * d * d + g * b * b - 2 * b * d * f - a * c * g)) /
      ((b * b - a * c) * (Math.sqrt((a - c) * (a - c) + 4 * b * b) - (a + c))),
  );
  const radiusB = Math.sqrt(
    (2 * (a * f * f + c * d * d + g * b * b - 2 * b * d * f - a * c * g)) /
      ((b * b - a * c) * (-Math.sqrt((a - c) * (a - c) + 4 * b * b) - (a + c))),
  );

  // deduce ellipse rotation from coefficients
  let angle = 0;
  if (b == 0 && a <= c) {
    angle = 0;
  } else if (b == 0 && a >= c) {
    angle = Math.PI / 2;
  } else if (b != 0 && a > c) {
    angle = Math.PI / 2 + 0.5 * (Math.PI / 2 - Math.atan2(a - c, 2 * b));
  } else if (b != 0 && a <= c) {
    angle = Math.PI / 2 + 0.5 * (Math.PI / 2 - Math.atan2(a - c, 2 * b));
  }

  return {
    centerX,
    centerY,
    radiusA,
    radiusB,
    angle,
  };
}
