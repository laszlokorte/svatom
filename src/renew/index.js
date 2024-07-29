import {decycle, retrocycle} from './cycle.js'
import {isDeepEqual} from './compare.js'
import {makeTokenizer} from './tokenizer.js'
import {makeReader} from './reader.js'
import {makeParser, kindKey, refKey, selfKey} from './parser.js'
import {makeGrammar} from './grammar.js'
import {makeHierarchy} from './hierarchy.js'

export const tokenizer = makeTokenizer([
	{name: "white", pattern: /\s+/my, cast: (v) => v},
	{name: "float", pattern: /-?\d+\.\d+/, cast: (v) => parseFloat(v)},
	{name: "int", pattern: /-?\d+/, cast: (v) => parseInt(v, 10)},
	{name: "boolean", pattern: /(true|false|0|1)/, cast: (v) => v==="1" || v.toLowerCase() === "true"},
	{name: "nil", pattern: /NULL/, cast: (v) => null},
	{name: "ref", pattern: /\d+/, prefix: /REF\s+/, cast: (v) => parseInt(v, 10)},
	{name: "className", pattern: /[_a-zA-Z]+(?:\.[_a-zA-Z][_a-zA-Z0-9]*)*/, cast: (v) => v},
	{name: "string", pattern: /\"(?:(?:\\\\)*\\\"|[^\"])*\"/, cast: (v) => eval(v)},
])

export {kindKey, selfKey}

export const reader = makeReader(tokenizer)

export const parserV11 = makeParser(reader, makeGrammar(11))
export const hierarchyV11 = makeHierarchy(makeGrammar(11))

export const parserAutoDetect = function(inputString, autoDeref = true, metaKeys = {}) {
	const tokenStream = tokenizer(inputString);
	const r = reader(inputString)
	const version = r.readAny(["int","className"], true);
	
	if(version.type == 'int') {
		const parser = makeParser(reader, makeGrammar(version.value), autoDeref, metaKeys)
		const p = parser(inputString)

		p.skipAny(["int"])

		const drawing = p.parseStorable();
		p.parseWindowPositionMaybe();
		p.expectFinish()

		return {version: p.version, doctype: drawing[kindKey], drawing, refMap: p.refMap};
	} else {
		const parser = makeParser(reader, makeGrammar(-1), autoDeref, metaKeys)
		const p = parser(inputString)

		const drawing = p.parseStorable();
		p.parseWindowPositionMaybe();
		p.expectFinish()

		return {version: p.version, doctype: drawing[kindKey], drawing, refMap: p.refMap};
	}
}

export const stringify = (x) => JSON.stringify(decycle(x), null, 2);

export function tryDeref(refOrObject, refMap, path = []) {
	const object = (refOrObject && refOrObject[refKey]) ? refMap[refOrObject.ref] : refOrObject

	return path.reduce((o, k) => o ? tryDeref(o[k], refMap) : null, object)
}