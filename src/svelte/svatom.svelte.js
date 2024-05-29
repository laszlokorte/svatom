import { get, set, collect, foldl, propsExcept } from 'partial.lenses'
import * as R from "ramda";

export function atom(init) {
	let root = $state({
		value: init
	})

	return root
}

export function combine(mapOfAtoms) {
	return {
		get value() {
			return R.map((v) => v.value, mapOfAtoms)
		},
		set value(newVal) {
			R.forEachObjIndexed((v, k) => {
				v.value = newVal[k]
			}, mapOfAtoms)
		}
	}
}

export function combineWithRest(mapOfAtoms, rest = atom({})) {
	return {
		get value() {
			return {
				...rest.value,
				...R.map((v) => v.value, mapOfAtoms)
			}
		},
		set value(newVal) {
			R.forEachObjIndexed((v, k) => {
				v.value = newVal[k]
			}, mapOfAtoms)
			rest.value = R.pick(R.difference(Object.keys(newVal), Object.keys(mapOfAtoms)), newVal)
		}
	}
}

export function view(opticLense, someAtom) {
	return {
		get value() {
			return get(opticLense, someAtom.value)
		},
		set value(newVal) {
			const transformed = set(opticLense, newVal, someAtom.value)
			
			if (!(transformed instanceof Error)) {
				someAtom.value = transformed
			}
		}
	}
}

export function failableView(opticLense, someAtom, errorAtom = atom(null), transientAtom = atom(null)) {
	return {
		get value() {
			return !$state.is(errorAtom.value, null) ? transientAtom.value : get(opticLense, someAtom.value)
		},
		set value(newVal) {
			const transformed = set(opticLense, newVal, someAtom.value)
			

			if (!(transformed instanceof Error)) {
				someAtom.value = transformed
				transientAtom.value = null
				errorAtom.value = null
			} else {
				transientAtom.value = newVal
				errorAtom.value = transformed
			}
		},
		get stable() {
			return get(opticLense, someAtom.value)
		},
		get error() {
			return errorAtom.value
		},
		get hasError() {
			return errorAtom.value !== null
		},
		reset() {
			transientAtom.value = null
			errorAtom.value = null
		}
	}
}

export function read(opticLense, someAtom) {
	return {
		get value() {
			return get(opticLense, someAtom.value)
		},

		get all() {
			return collect(opticLense, someAtom.value)
		},

		get allUniq() {
			return [...foldl((a, b) => {
				a.add(b)

				return a
			}, new Set(), opticLense, someAtom.value)]
		},

		get max() {
			return foldl((a,b) => b===undefined?a:Math.max(a,b), -Infinity, opticLense, someAtomsomeAtom.value)
		},

		get min() {
			return foldl((a,b) => b===undefined?a:Math.min(a,b), Infinity, opticLense, someAtom.value)
		},

		folded(fn, init, skipUndefined=true) {
			return foldl((a,b) => (skipUndefined && b===undefined) ? a : fn(a,b), init, opticLense, someAtom.value)
		},
	}
}


export function bindValue(node, someAtom) {
	function oninput(e) {
		someAtom.value = node.value;
		node.value = someAtom.value;
	}

	node.value = someAtom.value;

	$effect(() => {
		node.value = someAtom.value;
	});

	node.addEventListener("input", oninput);

	return () => {
		node.removeEventListener("input", oninput);
	};
}