
export function makeParser(reader, syntax) {
	return function parser(inputString) {
		const r = reader(inputString)
		const refMap = [];

		function parseInto(target, rule) {
			const syn = syntax[rule];
			if(!syn) {
				throw new Error(`Unknown syntax node ${rule}`);
			}
			if(syn.super && !syn.skipSuper) {
				try {
					target = parseInto(target, syn.super)

				} catch (e) {
					console.error("Error while parsing" + syn.super)
					console.error(target)
					throw e
				}
			}

			return Object.assign(target, syn.parser(context))
		}

		function transitiveTypes(kind) {
			if(kind) {
				return [kind, ...syntax[kind].interfaces, ...transitiveTypes(syntax[kind].super)]
			} else {
				return []
			}
		}

		const context = {
			get version() {
				return syntax.version
			},
			get refMap() {
				return refMap;
			},
			parseStorable(ofInterface, allowNull = true)  {
				const t = r.readAny(['nil','ref','className'])

				if(t.type === 'ref') {
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

					try {
						refMap.push(newObject)

						const result = parseInto(newObject, t.value);


						return result
					} catch (e) {
						console.error("Error while parsing " + t.value)
						console.error(newObject)
						throw e
					}
				}
			},
			parseImplicitStorable (ofType, storeRef = true)  {
				const newObject = {
					__kind: ofType,
				};
				try {

					if(storeRef) {
						refMap.push(newObject)
					}

					const result = parseInto(newObject, ofType);


					return result
				} catch (e) {
					console.error("Error while parsing " + ofType)
					console.error(newObject)
					throw e
				}
				
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
		}

		return context
	}
}