

export function makeReader(tokenize) {
	return function reader(input) {
		const tokenStream = tokenize(input)

		return {
			read: (type, strict = true, includeWhitespace = false) => {
				let t = tokenStream.next()
				
				while(!includeWhitespace && !t.done && t.value.type == 'white'){
					t = tokenStream.next()
				}

				if(t.done) {
					if(strict) {
						throw new Error(`Expected ${type} but got EOF.`)
					} else {
						return new Error(`Expected ${type} but got EOF.`)
					}
				}

				const v = t.value

				if(v.type !== type) {
					if(strict) {
						throw new Error(`Expected ${type} but got ${v.type} (${v.value}).`)
					} else {
						return new Error(`Expected ${type} but got ${v.type} (${v.value}).`)
					}
				}

				return v.value
			},

			readAny: (types, strict = true, includeWhitespace = false) => {
				let t = tokenStream.next()
				
				while(!includeWhitespace && !t.done && t.value.type == 'white'){
					t = tokenStream.next()
				}

				if(t.done) {
					if(strict) {
						throw new Error(`Expected any of ${types.join(", ")} but got EOF.`)
					} else {
						return new Error(`Expected any of ${types.join(", ")} but got EOF.`)
					}
				}

				const v = t.value

				if(types.indexOf(v.type) < 0) {
					if(strict) {
						throw new Error(`Expected any of ${types.join(", ")} but got ${v.type} (${v.value}).`)
					} else {
						return new Error(`Expected any of ${types.join(", ")} but got ${v.type} (${v.value}).`)
					}
				}

				return {
					type: v.type,
					value: v.value,
				}
			},

			readEOF: (strict = true, allowWhitespace = true) => {
				let t = tokenStream.next()
				
				while(allowWhitespace && !t.done && t.value.type == 'white'){
					t = tokenStream.next()
				}

				const v = t.value
				
				if(!t.done) {
					if(strict) {
						throw new Error(`Expected EOF but got ${v.type} (${v.value}).`)
					} else {
						return new Error(`Expected EOF but got ${v.type} (${v.value}).`)
					}
				}

				return true
			}
		}
	}
}