
export function makePerspective(fovDeg, aspect, near, far) {
  const f = 1.0 / Math.tan(deg2rad(fovDeg) / 2)
  const nf = 1 / (far - near)

  return [
    f / aspect, 0.0, 0.0, 0.0,
    0.0, f, 0.0, 0.0,
    0.0, 0.0, near * nf, -1.0,
    0.0, 0.0, far * near * nf, 0.0
  ]
}

export function makeIdentity() {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]
}

export function makeScale(x,y,z) {
  return [
    x, 0, 0, 0,
    0, y, 0, 0,
    0, 0, z, 0,
    0, 0, 0, 1,
  ]
}

export function makeTranslate(x,y,z) {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    x, y, z, 1,
  ]
}

export function makeRotateZ(angle) {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return [
    c, -s, 0, 0,
    s,  c, 0, 0,
    0,  0, 1, 0,
    0,  0, 0, 1,
  ]
}

export function makeRotateX(angle) {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return [
    1, 0,  0, 0,
    0, c, -s, 0,
    0, s,  c, 0,
    0, 0,  0, 1,
  ]
}

export function makeRotateY(angle) {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return [
     c, 0, s,  0,
     0, 1, 0,  0,
    -s, 0, c,  0,
     0, 0, 0,  1,
  ]
}


export function matMulMat([
  _x1,  _x2,  _x3,  _x4,
  _y1,  _y2,  _y3,  _y4,
  _z1,  _z2,  _z3,  _z4,
  _w1,  _w2,  _w3,  _w4,
], [
  x1,  x2,  x3,  x4,
  y1,  y2,  y3,  y4,
  z1,  z2,  z3,  z4,
  w1,  w2,  w3,  w4,
]) {
  return [
    x1 * _x1 + x2 * _y1 + x3 * _z1 + x4 * _w1,
    x1 * _x2 + x2 * _y2 + x3 * _z2 + x4 * _w2,
    x1 * _x3 + x2 * _y3 + x3 * _z3 + x4 * _w3,
    x1 * _x4 + x2 * _y4 + x3 * _z4 + x4 * _w4,

    y1 * _x1 + y2 * _y1 + y3 * _z1 + y4 * _w1,
    y1 * _x2 + y2 * _y2 + y3 * _z2 + y4 * _w2,
    y1 * _x3 + y2 * _y3 + y3 * _z3 + y4 * _w3,
    y1 * _x4 + y2 * _y4 + y3 * _z4 + y4 * _w4,

    z1 * _x1 + z2 * _y1 + z3 * _z1 + z4 * _w1,
    z1 * _x2 + z2 * _y2 + z3 * _z2 + z4 * _w2,
    z1 * _x3 + z2 * _y3 + z3 * _z3 + z4 * _w3,
    z1 * _x4 + z2 * _y4 + z3 * _z4 + z4 * _w4,

    w1 * _x1 + w2 * _y1 + w3 * _z1 + w4 * _w1,
    w1 * _x2 + w2 * _y2 + w3 * _z2 + w4 * _w2,
    w1 * _x3 + w2 * _y3 + w3 * _z3 + w4 * _w3,
    w1 * _x4 + w2 * _y4 + w3 * _z4 + w4 * _w4,
  ]
}

export function deg2rad(deg) {
  return deg/180 * Math.PI
}