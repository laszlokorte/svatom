export function makeHierarchy(syntax) {
	function isChildOf(c, p) {
		return c && (p === syntax[c].super || isChildOf(syntax[c].super, p))
	}

	return {
		descendantsOf(...kinds) {
			return Object.keys(syntax).filter((k) => {
				return kinds.some(kind => k===kind || isChildOf(k, kind))
			})
		}
	}
}