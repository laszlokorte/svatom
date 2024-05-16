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
			s.value = set(opticLense, newVal, s.value)
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