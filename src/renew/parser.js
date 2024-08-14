import {kindKey, refKey, selfKey} from './symbols.js'

export function makeParser(reader, grammar, autoDeref = true, metaKeys = {}) {
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

			if(syn.parser) {
				return Object.assign(target, syn.parser(context))
			} else {
				return target
			}
			
		}

		function transitiveTypes(kind) {
			if(kind) {
				return [kind, ...grammar.rules[kind].interfaces, ...transitiveTypes(grammar.rules[kind].super)]
			} else {
				return []
			}
		}

		function replaceAlias(className) {
			return grammar.aliases[className] ?? className
		}


		const context = {
			get version() {
				return grammar.version
			},
			get refMap() {
				return refMap;
			},
			get kindKey() {
				return kindKey;
			},
			parseStorable(ofInterface = null, allowNull = true, forceDeref = null)  {
				const t = r.readAny(['nil','ref','className'])

				if(t.type === 'ref') {
					if(t.value >= refMap.length) {
						throw new Error(`Forward References are not allowed: try reading "REF ${t.value}" but only ${refMap.length} objects have been loaded yet.`)
					}
					
					const referencedObject = refMap[t.value]
					
					if(ofInterface) {
						if(transitiveTypes(referencedObject[kindKey]).indexOf(ofInterface) < 0) {
							throw new Error(`Expected parsed object to be of kind ${ofInterface} but was ${referencedObject[kindKey]}`);
						}
					}

					if(autoDeref || forceDeref === true) {
						return referencedObject
					} else {
						const ref = {[refKey]: true, ref: t.value}
						if(metaKeys.ref) {
							ref[metaKeys.ref] = t.value
						}

						return ref
					}

				} else if(t.type === 'nil') {
					if(!allowNull) {
						throw new Error("Expected object to be not null");
					}
					return null
				} else if(t.type === 'className') {
					const className = replaceAlias(t.value)
					const newObject = {
						[kindKey]: className,
					};

					if(metaKeys.kind) {
						newObject[metaKeys.kind] = className
					}

					newObject[selfKey] = refMap.length
					if(metaKeys.self) {
						newObject[metaKeys.self] = refMap.length
					}
					refMap.push(newObject)

					parseInto(newObject, className);

					if(forceDeref !== true) {
						const ref = {[refKey]: true, ref: newObject[metaKeys.self]}
						if(metaKeys.ref) {
							ref[metaKeys.ref] = newObject[metaKeys.self]
						}

						return ref
					}

					return newObject
				}
			},
			parseImplicitStorable (ofType, storeRef = true)  {
				const newObject = {
					[kindKey]: ofType,
				};

				if(metaKeys.kind) {
					newObject[metaKeys.kind] = ofType
				}

				if(storeRef) {
					newObject[selfKey] = refMap.length
					if(metaKeys.self) {
						newObject[metaKeys.self] = refMap.length
					}
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
				if(!(x instanceof Error)) {
					const y = r.read("int", true);
					const w = r.read("int", true);
					const h = r.read("int", true);
					
					return {x,y,w,h}
				} else {
					return null
				}

			},
			expectFinish(allowWhitespace = true) {
				r.readEOF(true, allowWhitespace)
			}
		}

		return context
	}
}