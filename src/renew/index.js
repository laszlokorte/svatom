import {decycle, retrocycle} from './cycle.js'
import {isDeepEqual} from './compare.js'
import {makeTokenizer} from './tokenizer.js'
import {makeReader} from './reader.js'
import {makeParser} from './parser.js'
import {makeSyntax} from './syntax.js'
import {makeHierarchy} from './hierarchy.js'

export const tokenizer = makeTokenizer([
	{name: "white", pattern: /\s+/my, cast: (v) => v},
	{name: "float", pattern: /-?\d+\.\d+/, cast: (v) => parseFloat(v)},
	{name: "int", pattern: /-?\d+/, cast: (v) => parseInt(v, 10)},
	{name: "boolean", pattern: /(true|false|0|1)/, cast: (v) => v==="1" || v.toLowerCase() === "true"},
	{name: "nil", pattern: /NULL/, cast: (v) => null},
	{name: "ref", pattern: /\d+/, prefix: /REF\s+/, cast: (v) => v},
	{name: "className", pattern: /[_a-zA-Z]+(?:\.[_a-zA-Z][_a-zA-Z0-9]*)+/, cast: (v) => v},
	{name: "string", pattern: /\"(?:(?:\\\\)*\\\"|[^\"])*\"/, cast: (v) => eval(v)},
])


export const reader = makeReader(tokenizer)

export const parserV11 = makeParser(reader, makeSyntax(11))
export const hierarchyV11 = makeHierarchy(makeSyntax(11))

export const parserAutoDetect = function(inputString) {
	const tokenStream = tokenizer(inputString);
	const r = reader(inputString)
	const version = r.readAny(["int","className"], true);
	
	if(version.type == 'int') {
		const parser = makeParser(reader, makeSyntax(version.value))
		const p = parser(inputString)

		p.skipAny(["int"])
		return p.parseStorable();
	} else {
		const parser = makeParser(reader, makeSyntax(-1))
		const p = parser(inputString)


		return p.parseStorable();
	}
}

export const stringify = (x) => JSON.stringify(decycle(x), null, 2);