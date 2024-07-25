
export function makeParser(reader, grammar) {
	return function parser(inputString) {
		const r = reader(inputString)
		const refMap = [];

		function parseInto(target, rule) {
			const syn = grammar.rules[rule];
			if(!syn) {
				throw new Error(`Unknown grammar node ${rule}`);
			}
			if(syn.super && !syn.skipSuper) {
				parseInto(target, syn.super)
			}

			return Object.assign(target, syn.parser(context))
		}

		function transitiveTypes(kind) {
			if(kind) {
				return [kind, ...grammar.rules[kind].interfaces, ...transitiveTypes(grammar.rules[kind].super)]
			} else {
				return []
			}
		}

		const context = {
			get version() {
				return grammar.version
			},
			get refMap() {
				return refMap;
			},
			parseStorable(ofInterface, allowNull = true)  {
				const t = r.readAny(['nil','ref','className'])

				if(t.type === 'ref') {
					if(t.value >= refMap.length) {
						throw new Error(`Forward References are not allowed: try reading "REF ${t.value}" but only ${refMap.length} objects have been loaded yet.`)
					}
					
					const referencedObject = refMap[t.value]
					
					if(ofInterface) {
						if(transitiveTypes(referencedObject.__kind).indexOf(ofInterface) < 0) {
							throw new Error(`Expected parsed object to be of kind ${ofInterface} but was ${referencedObject.__kind}`);
						}
					}

					return referencedObject
				} else if(t.type === 'nil') {
					if(!allowNull) {
						throw new Error("Expected object to be not null");
					}
					return null
				} else if(t.type === 'className') {
					const newObject = {
						__kind: t.value,
					};

					refMap.push(newObject)

					parseInto(newObject, t.value);

					return newObject
				}
			},
			parseImplicitStorable (ofType, storeRef = true)  {
				const newObject = {
					__kind: ofType,
				};

				if(storeRef) {
					refMap.push(newObject)
				}

				parseInto(newObject, ofType);

				return newObject
			},
			parseInt() {
				return r.read("int")
			},
			parseString() {
				return r.read("string")
			},
			parseDouble() {
				return r.read("float")
			},
			parseFloat() {
				return r.read("float")
			},
			parseBoolean() {
				const v = r.readAny(["boolean","int"]);

				return v === true || v === 1 
			},
			skipAny(types) {
				return r.readAny(types)
			},
			parseWindowPositionMaybe() {
				const x = r.read("int", false);
				if(x !== null) {
					const y = r.read("int", true);
					const w = r.read("int", true);
					const h = r.read("int", true);
					
					return {x,y,w,h}
				} else {
					return null
				}

			},
			expectFinish(allowWhitespace = true) {
				r.readEOF()
			}
		}

		return context
	}
}