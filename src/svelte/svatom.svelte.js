import { get, set, collect, foldl, propsExcept } from 'partial.lenses'
import * as R from "ramda";
import {tick} from "svelte";

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

export function failableView(opticLense, someAtom, autoReset = true, errorAtom = atom(null), transientAtom = atom(null)) {
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
		get stableValue() {
			return get(opticLense, someAtom.value)
		},
		set stableValue(newVal) {
			const transformed = set(opticLense, newVal, someAtom.value)
			
			if (!(transformed instanceof Error)) {
				someAtom.value = transformed

				if(autoReset) {
					transientAtom.value = null
					errorAtom.value = null
				}
			}
		},

		get stableAtom() {
			return {
				get value() {
					return get(opticLense, someAtom.value)
				},
				set value(newVal) {
					const transformed = set(opticLense, newVal, someAtom.value)
					
					if (!(transformed instanceof Error)) {
						someAtom.value = transformed
						if(autoReset) {
							transientAtom.value = null
							errorAtom.value = null
						}
					}
				}
			}
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
	let c0 = null;
	let c1 = null;
	function oninput(e) {
		const before = someAtom.value;
		someAtom.value = node.value;
		node.value = someAtom.value;
		const newVal = someAtom.value;
		if(node.value != newVal) {	
			node.value = newVal;
		}
		if(c0 !== null && someAtom.value == before) {
			node.selectionStart = c0
			node.selectionEnd = c1
		}
	}

	function onbeforeinput(e) {
		c0 = node.selectionStart
		c1 = node.selectionEnd
	}

	$effect.pre(() => {
		const newVal = someAtom.value;
		if(node.value != newVal) {	
			node.value = newVal;
		}
	});

	// $effect(() => {
	// 	node.value = someAtom.value;
	// });

	node.addEventListener("input", oninput);
	node.addEventListener("change", oninput);
	try {
		let x = node.selectionStart;
		node.addEventListener("beforeinput", onbeforeinput);
	} catch(e) {

	}

	return () => {
		node.removeEventListener("beforeinput", onbeforeinput);
		node.removeEventListener("input", oninput);
		node.removeEventListener("change", oninput);
	};
}

export function bindScroll(node, someAtom) {
	 let scrolling = false
	 function onscroll(e) {
	 	if(!scrolling && (!$state.is(someAtom.value.x, node.scrollLeft) || !$state.is(someAtom.value.y, node.scrollTop))) {
			someAtom.value = {
				x: node.scrollLeft,
				y: node.scrollTop,
			}
	 	}
	}

	$effect.pre(() => {
		const newY =  someAtom.value.y
		const newX =  someAtom.value.x
		scrolling = true
		tick().then(() => {
			node.scrollLeft = newX;
			node.scrollTop = newY
			scrolling = false
		});
	});

	node.addEventListener("scroll", onscroll, { passive: true });

	return () => {
		node.removeEventListener("scroll", onscroll, { passive: true });
	};
}

export function bindSize(node, someAtom) {
	const resizeObserver = new ResizeObserver((entries) => {
	  for (const entry of entries) {
	    if (entry.borderBoxSize) {
	    	someAtom.value = {
	    		x: entry.borderBoxSize[0].inlineSize,
	    		y: entry.borderBoxSize[0].blockSize,
	    	}
	    } else {
			someAtom.value = {
				x: entry.contentRect.width,
				y: entry.contentRect.height,
			}
	    }
	  }
	});

	resizeObserver.observe(node)

	return () => {
		resizeObserver.disconnect()
	};
}