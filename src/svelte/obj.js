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

export const toGeo = (obj) => {
	return {
		vertices: R.pipe(R.filter(R.propEq('vertex', 'type')), R.map(R.pipe(R.prop('pos'), R.assoc('w', 1))))(obj),
		edges: [
		],
		faces: 
		R.pipe(R.filter(R.propEq('face', 'type')), R.map(R.pipe(R.prop('vertices'), R.map(R.pipe(R.prop('v'), R.add(-1))), R.objOf('vertices'), R.assoc('attrs', {oapcity:1, "fill-opacity": 1, color: "red"}))))(obj),
		masks: [
		],
		labels: [
		],
	}
}