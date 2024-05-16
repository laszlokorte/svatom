import { get, set } from 'partial.lenses'

export function atom(init) {
	let root = $state({
		value: init
	})

	return root
}

export function view(opticLense, s) {
	return {
		get value() {
			return get(opticLense, s.value)
		},
		set value(newVal) {
			const transformed = set(opticLense, newVal, s.value)
			
			if (!(transformed instanceof Error)) {
				s.value = transformed
			}
		}
	}
}

export function read(opticLense, s) {
	return {
		get value() {
			return get(opticLense, s.value)
		},
	}
}