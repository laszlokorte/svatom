import * as R from 'ramda'
import * as L from 'partial.lenses'
import {
		hierarchyV11,
		tryDeref as tryDerefInternal,
		kindKey,
		selfKey,
		refKey,
	} from "../renew/index.js";


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

export const toGeo = (obj, scale = 1, reverse = true, scaleX= 1, scaleY= 1, scaleZ= 1) => {

	const clockwise = reverse ? R.reverse : R.identity
	const vert = R.filter(R.propEq('vertex', 'type'))
	const facs = R.filter(R.propEq('face', 'type'))

	const center = R.pipe(vert, R.map(R.pipe(R.prop('pos'))), R.addIndex(R.reduce)(
		({x:ax,y:ay,z:az} , {x,y,z}, i) => ({
			x:(ax*i+x)/(i+1),
			y:(ay*i+y)/(i+1),
			z:(az*i+z)/(i+1)
		}), {x:0,y:0,z:0}))(obj)

		const toTriangle = (vs) => {
			return R.pipe(R.slice(1,Infinity), R.aperture(2), R.map(R.prepend(R.nth(0, vs))))(vs)
		}

	const vertices = R.pipe(vert, R.map(R.pipe(R.prop('pos'), R.modify('x', R.pipe(R.subtract(R.__, center.x), R.multiply(scaleX))), R.modify('y', R.pipe(R.subtract(R.__, center.y), R.multiply(scaleY))), R.modify('z', R.pipe(R.subtract(R.__, center.z), R.multiply(scaleZ))), R.map(R.multiply(scale)))))(obj)
	const faces = R.pipe(facs, R.map(R.pipe(R.prop('vertices'), clockwise, toTriangle, R.map(R.pipe(R.map(R.pipe(R.prop('v'), R.add(-1))), R.objOf('vertices'), R.assoc('attrs', {class: "obj-face"}))))), R.flatten())(obj)
	const edges = R.pipe(facs, R.map(R.pipe(R.prop('vertices'), clockwise, cyclicAperture(2), R.map(R.pipe(R.map(R.pipe(R.prop('v'), R.add(-1))), R.objOf('vertices'), R.assoc('attrs', {class: "obj-edge"}), (e) => R.assoc('faces', R.pipe(R.addIndex(R.map)((f,i) => ({i,f})), R.filter(({f}) => (R.intersection(e.vertices, f.vertices)).length >= 2), R.map(R.prop("i")))(faces), e))))), R.flatten(), R.filter(R.pipe(R.prop("faces"), R.complement(R.isEmpty))), R.uniqBy(R.pipe(R.prop("vertices"), R.sortBy(R.identity))))(obj)

	const geo =  {
		vertices,
		edges,
		faces, 
		masks: [
		],
		labels: [
		],
	}

	return geo
}

const lerp = (a,b,t) => (1-t)*a + t*b

export const marchingCubesToGeo = (fn, minX, minY, minZ, maxX, maxY, maxZ, res = 4) => {

	const vertices = [minX,maxX].flatMap(x => [minY,maxY].flatMap(y => [minZ,maxZ].flatMap(z => [({x,y,z})])))
	const faces = [{vertices: [1,0,2,3], attrs: {flip: false, class:"obj-face", opacity: 0.2}},
		{vertices: [4,5,7,6], attrs: {flip: false, class:"obj-face", opacity: 0.2}},
		{vertices: [0,1,5,4], attrs: {flip: false, class:"obj-face", opacity: 0.2}},
		{vertices: [3,2,6,7], attrs: {flip: false, class:"obj-face", opacity: 0.2}},
		{vertices: [1,3,7,5], attrs: {flip: false, class:"obj-face", opacity: 0.2}},
		{vertices: [2,0,4,6], attrs: {flip: false, class:"obj-face", opacity: 0.2}}]
	const edges = [{vertices: [0,1], attrs:{}, faces: []},
		{vertices: [1,3], attrs:{}, faces: []},
		{vertices: [2,3], attrs:{}, faces: []},
		{vertices: [2,0], attrs:{}, faces: []},
		{vertices: [4,5], attrs:{}, faces: []},
		{vertices: [5,7], attrs:{}, faces: []},
		{vertices: [6,7], attrs:{}, faces: []},
		{vertices: [6,4], attrs:{}, faces: []},
		{vertices: [0,4], attrs:{}, faces: []},
		{vertices: [1,5], attrs:{}, faces: []},
		{vertices: [3,7], attrs:{}, faces: []},
		{vertices: [2,6], attrs:{}, faces: []},
	]

	for(let x=0;x<=res;x++) {
		for(let y=0;y<=res;y++) {
			for(let z=0;z<=res;z++) {
				const mask = [0,1].flatMap(xx => [0,1].flatMap(yy => [0,1].flatMap(zz => 
					[fn(lerp(minX,maxX,(x+xx)/res), lerp(minY,maxY,(y+yy)/res), lerp(minZ,maxZ,(z+zz)/res))]
				))).reduce((a,b,i) => a | (b?1<<i:0), 0)
				const d = fn(lerp(minX,maxX,x/res), lerp(minY,maxY,y/res), lerp(minZ,maxZ,z/res))
				if(d <= 0) {
					vertices.push({x: lerp(minX,maxX,x/res),y: lerp(minY,maxY,y/res),z: lerp(minZ,maxZ,z/res)})
				}
			}
		}
	}
	

	const geo =  {
		vertices,
		edges,
		faces, 
		masks: [
		],
		labels: [
		],
	}

	return geo
}


export const renewToGeo = (renewDocument, scale=50, sides = 12) =>  {

	const rectTypes = hierarchyV11.descendantsOf(
		"CH.ifa.draw.figures.RectangleFigure",
		"CH.ifa.draw.figures.RoundRectangleFigure",
	);

	const ellipseTypes = hierarchyV11.descendantsOf(
		"CH.ifa.draw.figures.EllipseFigure",
	);

	const textTypes = hierarchyV11.descendantsOf(
		"CH.ifa.draw.figures.TextFigure",
	);

	const lineTypes = hierarchyV11.implementorsOf(
		"CH.ifa.draw.figures.PolyLineable",
	);

	const rectangles = L.get(
		[
			"refMap",
			L.partsOf(
				L.elems,
				L.when(R.pipe(R.prop(kindKey),R.anyPass([R.includes(R.__, rectTypes)]))),
			),
		],
		renewDocument,
	);
	const ellipsis = L.get(
		[
			"refMap",
			L.partsOf(
				L.elems,
				L.when(R.pipe(R.prop(kindKey),R.anyPass([R.includes(R.__, ellipseTypes)]))),
			),
		],
		renewDocument,
	);


	const figures = L.get(
		[
			"refMap",
			L.partsOf(
				L.elems,
				L.when(R.pipe(R.prop(kindKey),R.anyPass([R.includes(R.__, rectTypes), R.includes(R.__, ellipseTypes)]))),
			),
		],
		renewDocument,
	);

	const textes = L.get(
		[
			"refMap",
			L.partsOf(
				L.elems,
				L.when(R.compose(R.anyPass([R.includes(R.__, textTypes)]), R.prop(kindKey))),
			),
		],
		renewDocument,
	);

	const lines = L.get(
		[
			"refMap",
			L.partsOf(
				L.elems,
				L.when(R.compose(R.anyPass([R.includes(R.__, lineTypes)]), R.prop(kindKey))),
			),
		],
		renewDocument,
	);

	const bounds = L.get(
		L.pick({
			minX: L.foldTraversalLens( L.minimum, [L.elems, 'x']),
			minY: L.foldTraversalLens( L.minimum, [L.elems, 'y']),
			maxX: L.foldTraversalLens( L.maximum, [L.elems, L.props('x','w'), L.foldTraversalLens(L.sum, L.values)]),
			maxY: L.foldTraversalLens( L.maximum, [L.elems, L.props('y','h'), L.foldTraversalLens(L.sum, L.values)]),
		}),
		figures,
	);

	const width = bounds.maxX - bounds.minX
	const height = bounds.maxY - bounds.minY
	const aspect = height/width

	const v = []
	const f = []
	const e = []

	v.push({ x: -0.55*scale, y: -0.55*scale*aspect, z: -0.1 },)
	v.push({ x: 0.55*scale, y: -0.55*scale*aspect, z: -0.1 },)
	v.push({ x: 0.55*scale, y: 0.55*scale*aspect, z: -0.1 },)
	v.push({ x: -0.55*scale, y: 0.55*scale*aspect, z: -0.1 },)


	f.push({ vertices: [0,1,2,3], attrs: { class: "background", color: "#eee", flip: false } },)

	for(const r of rectangles) {
		const {x,y,w,h} = r
		const f1 = f.length
		const v1 = v.length
		const v2 = v.length + 4
		v.push({ x: ((x-bounds.minX)/width-0.5)*scale, y: ((y-bounds.minY)/height-0.5)*scale*aspect, z: 0 },)
		v.push({ x: ((x+w-bounds.minX)/width-0.5)*scale, y: ((y-bounds.minY)/height-0.5)*scale*aspect, z: 0 },)
		v.push({ x: ((x+w-bounds.minX)/width-0.5)*scale, y: ((y+h-bounds.minY)/height-0.5)*scale*aspect, z: 0 },)
		v.push({ x: ((x-bounds.minX)/width-0.5)*scale, y: ((y+h-bounds.minY)/height-0.5)*scale*aspect, z: 0 },)

		v.push({ x: ((x-bounds.minX)/width-0.5)*scale, y: ((y-bounds.minY)/height-0.5)*scale*aspect, z: 1 },)
		v.push({ x: ((x+w-bounds.minX)/width-0.5)*scale, y: ((y-bounds.minY)/height-0.5)*scale*aspect, z: 1 },)
		v.push({ x: ((x+w-bounds.minX)/width-0.5)*scale, y: ((y+h-bounds.minY)/height-0.5)*scale*aspect, z: 1 },)
		v.push({ x: ((x-bounds.minX)/width-0.5)*scale, y: ((y+h-bounds.minY)/height-0.5)*scale*aspect, z: 1 },)

		f.push({ vertices: [v1,v1+1,v1+2,v1+3], attrs: { class: "petri-face", color: renewToRgba(r?.attributes?.attrs?.FillColor??{ r: 112, g: 219, b: 147 }), flip: false } },)
		f.push({ vertices: [v2+1,v2,v2+3,v2+2,], attrs: { class: "petri-face", color: renewToRgba(r?.attributes?.attrs?.FillColor??{ r: 112, g: 219, b: 147 }), flip: false } },)
		f.push({ vertices: [v1+1,v1,v2,v2+1], attrs: { class: "petri-face", color: renewToRgba(r?.attributes?.attrs?.FillColor??{ r: 112, g: 219, b: 147 }), flip: false } },)
		f.push({ vertices: [v1+3,v1+2,v2+2,v2+3,], attrs: { class: "petri-face", color: renewToRgba(r?.attributes?.attrs?.FillColor??{ r: 112, g: 219, b: 147 }), flip: false } },)
		f.push({ vertices: [v1+2,v1+1,v2+1,v2+2], attrs: { class: "petri-face", color: renewToRgba(r?.attributes?.attrs?.FillColor??{ r: 112, g: 219, b: 147 }), flip: false } },)
		f.push({ vertices: [v1+0,v1+3,v2+3,v2+0], attrs: { class: "petri-face", color: renewToRgba(r?.attributes?.attrs?.FillColor??{ r: 112, g: 219, b: 147 }), flip: false } },)

		e.push({ vertices: [v1+0,v1+1], faces: [f1+0,f1+2],  attrs: { class: "petri-edge", color: renewToRgba(r?.attributes?.attrs?.FrameColor??{ r: 0, g: 0, b: 0 }), flip: false } },)
		e.push({ vertices: [v1+2,v1+3], faces: [f1+0,f1+3],  attrs: { class: "petri-edge", color: renewToRgba(r?.attributes?.attrs?.FrameColor??{ r: 0, g: 0, b: 0 }), flip: false } },)
		e.push({ vertices: [v1+4,v1+5], faces: [f1+1,f1+2],  attrs: { class: "petri-edge", color: renewToRgba(r?.attributes?.attrs?.FrameColor??{ r: 0, g: 0, b: 0 }), flip: false } },)
		e.push({ vertices: [v1+6,v1+7], faces: [f1+1,f1+3],  attrs: { class: "petri-edge", color: renewToRgba(r?.attributes?.attrs?.FrameColor??{ r: 0, g: 0, b: 0 }), flip: false } },)
		
		e.push({ vertices: [v1+0,v1+3], faces: [f1+5,f1+0],  attrs: { class: "petri-edge", color: renewToRgba(r?.attributes?.attrs?.FrameColor??{ r: 0, g: 0, b: 0 }), flip: false } },)
		e.push({ vertices: [v1+3,v1+7], faces: [f1+5,f1+3],  attrs: { class: "petri-edge edge-3d", color: renewToRgba(r?.attributes?.attrs?.FrameColor??{ r: 0, g: 0, b: 0 }), flip: false } },)
		e.push({ vertices: [v1+7,v1+4], faces: [f1+1,f1+5],  attrs: { class: "petri-edge", color: renewToRgba(r?.attributes?.attrs?.FrameColor??{ r: 0, g: 0, b: 0 }), flip: false } },)
		e.push({ vertices: [v1+4,v1+0], faces: [f1+5,f1+2],  attrs: { class: "petri-edge edge-3d", color: renewToRgba(r?.attributes?.attrs?.FrameColor??{ r: 0, g: 0, b: 0 }), flip: false } },)
		
		e.push({ vertices: [v1+1,v1+2], faces: [f1+4,f1+0],  attrs: { class: "petri-edge", color: renewToRgba(r?.attributes?.attrs?.FrameColor??{ r: 0, g: 0, b: 0 }), flip: false } },)
		e.push({ vertices: [v1+2,v1+6], faces: [f1+3,f1+4],  attrs: { class: "petri-edge edge-3d", color: renewToRgba(r?.attributes?.attrs?.FrameColor??{ r: 0, g: 0, b: 0 }), flip: false } },)
		e.push({ vertices: [v1+6,v1+5], faces: [f1+4,f1+1],  attrs: { class: "petri-edge", color: renewToRgba(r?.attributes?.attrs?.FrameColor??{ r: 0, g: 0, b: 0 }), flip: false } },)
		e.push({ vertices: [v1+5,v1+1], faces: [f1+4,f1+2],  attrs: { class: "petri-edge edge-3d", color: renewToRgba(r?.attributes?.attrs?.FrameColor??{ r: 0, g: 0, b: 0 }), flip: false } },)
	
	}

	for(const r of ellipsis) {
		const {x,y,w,h} = r
		const f1 = f.length
		const v1 = v.length
		const v2 = v.length + 4

		const cx = x + w/2
		const cy = y + h/2
		const rx = w/2
		const ry =  h/2

		const front = []
		const back = []

		const v0 = v.length
		const f0 = f.length

		f.push({ vertices: front, attrs: { class: "petri-face", color: renewToRgba(r?.attributes?.attrs?.FillColor??{ r: 112, g: 219, b: 147 }), flip: false } },)
		f.push({ vertices: back, attrs: { class: "petri-face", color: renewToRgba(r?.attributes?.attrs?.FillColor??{ r: 112, g: 219, b: 147 }), flip: false } },)



		v.push({ x: (((cx+rx)-bounds.minX)/width-0.5)*scale, y: ((cy-bounds.minY)/height-0.5)*scale*aspect, z: 0 },)
		v.push({ x: (((cx+rx)-bounds.minX)/width-0.5)*scale, y: ((cy-bounds.minY)/height-0.5)*scale*aspect, z: 1 },)
			
		const f2 = f.length
		for (let i = 1; i <= sides; i++) {
			const v1 = v.length
		  const angle = (i / sides) * 2 * Math.PI;
		  const x = cx + rx * Math.cos(angle);
		  const y = cy + ry * Math.sin(angle);
			v.push({ x: ((x-bounds.minX)/width-0.5)*scale, y: ((y-bounds.minY)/height-0.5)*scale*aspect, z: 0 },)
			v.push({ x: ((x-bounds.minX)/width-0.5)*scale, y: ((y-bounds.minY)/height-0.5)*scale*aspect, z: 1 },)
			
			f.push({ vertices: [v1+1,v1,v1-2,v1-1], attrs: { class: "petri-face", color: renewToRgba(r?.attributes?.attrs?.FillColor??{ r: 112, g: 219, b: 147 }), flip: false } },)
			e.push({ vertices: [v1-2, v1-1], faces: [f2+(i+sides-2)%sides, f2+(i+sides-1)%sides],  attrs: { class: "petri-edge edge-3d", color: renewToRgba(r?.attributes?.attrs?.FrameColor??{ r: 0, g: 0, b: 0 }), flip: false } },)
			e.push({ vertices: [v1, v1-2], faces: [f0,f.length-1],  attrs: { class: "petri-edge", color: renewToRgba(r?.attributes?.attrs?.FrameColor??{ r: 0, g: 0, b: 0 }), flip: false } },)
			e.push({ vertices: [v1+1, v1-1], faces: [f0+1,f.length-1],  attrs: { class: "petri-edge", color: renewToRgba(r?.attributes?.attrs?.FrameColor??{ r: 0, g: 0, b: 0 }), flip: false } },)

		  front.push(v1)
		  back.unshift(v1+1)
		}


	
	
	}

	const labels  = []

	for(const t of textes) {
		const v1 = v.length

		v.push({ x: ((t.fOriginX-bounds.minX)/width-0.5)*scale, y: ((t.fOriginY-bounds.minY)/height-0.5)*scale*aspect, z: 1.6 },)
		labels.push({ vertex: v1, text: t.lines, attrs: { class:"petri-label", "font-family": "sans-serif", "pointer-events":"none", "text-anchor": "start","font-size": "1em", fill: "black", transform: "translate(0, 12)"} },)
	}

	for(const l of lines) {
		for(const [from, to] of R.aperture(2, l.points)) {
			const v1 = v.length
			v.push({ x: ((from.x-bounds.minX)/width-0.5)*scale, y: ((from.y-bounds.minY)/height-0.5)*scale*aspect, z: 0.5 },)
			v.push({ x: ((to.x-bounds.minX)/width-0.5)*scale, y: ((to.y-bounds.minY)/height-0.5)*scale*aspect, z: 0.5 },)

			e.push({ vertices: [v1,v1+1], faces: [],  attrs: { "stroke-width": 4, "marker-end": "url(#simple-arrow)" , "class": "petri-line", color: renewToRgba(l?.attributes?.attrs?.FrameColor??{ r: 0, g: 0, b: 0 }), flip: true } },)

		}
		//v.push({ x: ((t.fOriginX-bounds.minX)/width-0.5)*scale, y: ((t.fOriginY-bounds.minY)/height-0.5)*scale*aspect, z: 0 },)
		//labels.push({ vertex: v1, text: t.lines, attrs: { class:"petri-label", "font-family": "sans-serif", "pointer-events":"none", "text-anchor": "start","font-size": "1.1em", fill: "black", transform: "translate(0, -10)"} },)
	}

	const geo =  {
			vertices: v,
			edges: e,
			faces: f, 
			masks: [
			],
			labels,
	}

	return geo
}

function renewToRgba(color) {
		const NONE = { r: 255, g: 199, b: 158, a: 255 }; //WTF?
		if(typeof color === 'string' ) {
			return color
		}
		if (!color) {
			return "rgba(0,0,0,0)";
		}
		if (Object.prototype.hasOwnProperty.call(color, "a")) {
			if (
				NONE.r == color.r &&
				NONE.g == color.g &&
				NONE.b == color.b &&
				NONE.a == color.a
			) {
				return "rgba(0,0,0,0)";
			}
			return `rgba(${color.r},${color.g},${color.b},${color.a / 255})`;
		} else if (
			Object.prototype.hasOwnProperty.call(color, "r") &&
			Object.prototype.hasOwnProperty.call(color, "g") &&
			Object.prototype.hasOwnProperty.call(color, "b")
		) {
			if (NONE.r == color.r && NONE.g == color.g && NONE.b == color.b) {
				return "rgba(0,0,0,0)";
			}
			return `rgb(${color.r},${color.g},${color.b})`;
		} else {
			return "rgb(0,0,0)";
		}
	}