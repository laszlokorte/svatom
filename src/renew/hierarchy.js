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

		roots() {
			return Object.keys(grammar.rules).filter((k) => {
				return !grammar.rules[k].super
			})
		},
	}
}