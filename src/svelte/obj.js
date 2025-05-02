import * as R from 'ramda'

export const parse = (str) => {
	return R.pipe(
		R.split("\n"),
		R.map(R.trim),
		R.reject(R.anyPass([R.isEmpty, R.test(/^\s*#/)])),
		R.map(R.pipe(R.match(/(?<cmd>mtllib|usemtl|s|o|v|vt|vn|g|s|f) (?<args>.*)/), R.prop("groups"))),
		R.map(R.cond([
			[R.propEq('v', 'cmd'), R.pipe(R.prop('args'), R.split(" "), R.map(parseFloat), R.zipObj(['x','y','z']), R.objOf("pos"), R.assoc('type', 'vertex'))],
			[R.propEq('vn', 'cmd'), R.pipe(R.prop('args'), R.split(" "), R.map(parseFloat), R.zipObj(['x','y','z']), R.objOf("dir"), R.assoc('type', 'normal'))],
			[R.propEq('vt', 'cmd'), R.pipe(R.prop('args'), R.split(" "), R.map(parseFloat), R.zipObj(['u','v']), R.objOf("pos"), R.assoc('type', 'texture'))],
			[R.propEq('f', 'cmd'), R.pipe(R.prop('args'), R.split(" "), R.map(R.pipe(R.split("/"), R.map(R.ifElse(R.isEmpty, R.always(null), parseFloat)), R.zipObj(['v','t','n']))), R.objOf("vertices"), R.assoc('type', 'face'))],
			[R.T, R.identity]

		]))
		)(str)
}

const cyclicAperture = R.curry((n, xs) => {
  const len = xs.length;
  if (n > len) return [];
  return R.times(i =>
    R.times(j => xs[(i + j) % len], n),
    len
  );
});

export const toGeo = (obj, scale = 1, reverse = true) => {

	const clockwise = reverse ? R.reverse : R.identity

	const center = R.pipe(R.filter(R.propEq('vertex', 'type')), R.map(R.pipe(R.prop('pos'))), R.addIndex(R.reduce)(
		({x:ax,y:ay,z:az} , {x,y,z}, i) => ({
			x:(ax*i+x)/(i+1),
			y:(ay*i+y)/(i+1),
			z:(az*i+z)/(i+1)
		}), {x:0,y:0,z:0}))(obj)



	const geo =  {
		vertices: 
		R.pipe(R.filter(R.propEq('vertex', 'type')), R.map(R.pipe(R.prop('pos'), R.modify('x', R.subtract(R.__, center.x)), R.modify('y', R.subtract(R.__, center.y)), R.modify('z', R.subtract(R.__, center.z)), R.map(R.multiply(scale)), R.assoc('w', 1))))(obj),
		edges: R.pipe(R.filter(R.propEq('face', 'type')), R.addIndex(R.map)(R.pipe(R.prop('vertices'), clockwise, cyclicAperture(2), R.filter(([{v:v1},{v:v2}]) => v2>v1), R.map(R.pipe(R.map(R.pipe(R.prop('v'), R.add(-1))), R.objOf('vertices'), R.assoc('attrs', {class: "obj-edge"}), (e) => R.assoc('faces', R.pipe(R.filter(R.propEq('face', 'type')), R.addIndex(R.map)((f,i) => ({i,f})), R.filter(({f}) => (R.intersection(e.vertices, R.map(R.pipe(R.prop("v"), R.add(-1)), f.vertices))).length == 2), R.map(R.prop("i")))(obj), e))))), R.flatten())(obj),
		faces: 
		R.pipe(R.filter(R.propEq('face', 'type')), R.map(R.pipe(R.prop('vertices'), clockwise, R.map(R.pipe(R.prop('v'), R.add(-1))), R.objOf('vertices'), R.assoc('attrs', {class: "obj-face"}))))(obj),
		masks: [
		],
		labels: [
		],
	}

	return geo
}