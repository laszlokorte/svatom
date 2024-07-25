export function makeHierarchy(grammar) {
	function isChildOf(c, p) {
		return c && (p === grammar[c].super || isChildOf(grammar[c].super, p))
	}

	return {
		descendantsOf(...kinds) {
			return Object.keys(grammar).filter((k) => {
				return kinds.some(kind => k===kind || isChildOf(k, kind))
			})
		}
	}
}