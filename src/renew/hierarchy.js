export function makeHierarchy(grammar) {
	function isChildOf(c, p) {
		return c && (p === grammar.rules[c].super || isChildOf(grammar.rules[c].super, p))
	}

	return {
		descendantsOf(...kinds) {
			return Object.keys(grammar.rules).filter((k) => {
				return kinds.some(kind => k===kind || isChildOf(k, kind))
			})
		},


		implementorsOf(interfa) {
			return Object.keys(grammar.rules).filter((k) => {
				return this.interfacesOf(k).indexOf(interfa) > -1
			})
		},


		interfacesOf(kind) {
			if(kind) {
				return [...grammar.rules[kind].interfaces, ...this.interfacesOf(grammar.rules[kind].super)]
			} else {
				return []
			}
		},

		roots() {
			return Object.keys(grammar.rules).filter((k) => {
				return !grammar.rules[k].super
			})
		},
	}
}