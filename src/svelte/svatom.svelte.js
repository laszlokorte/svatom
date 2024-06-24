import { get, set, collect, foldl, propsExcept } from 'partial.lenses'
import * as R from "ramda";

export function atom(init) {
	let root = $state.frozen({
		value: init
	})

	return {
		get value() {
			return root.value
		},
		set value(newVal) {
			root = {
				value: newVal
			}
		}
	}
}

export function combine(mapOfAtoms, writables = null) {
	if(writables === null) {
	
		writables = R.mapObjIndexed((v, k) => {
			return (typeof Object.getOwnPropertyDescriptor(v, 'value').set === 'function')
		}, mapOfAtoms)
	}

	return {
		get value() {
			return R.map((v) => {
				const s = $state.snapshot(v.value);

				return s
			}, mapOfAtoms)
		},
		set value(newVal) {
			const oldValues = R.map((v) => {
				return $state.snapshot(v.value)
			}, mapOfAtoms)

			R.forEachObjIndexed((v, k) => {
				if(writables[k] && !$state.is(oldValues[k], newVal[k])) {
					v.value = newVal[k]
				}
			}, mapOfAtoms)
		}
	}
}

export function combineWithRest(mapOfAtoms, rest = atom({}), writables = null) {
	if(writables === null) {
	
		writables = R.mapObjIndexed((v, k) => {
			return (typeof Object.getOwnPropertyDescriptor(v, 'value').set === 'function')
		}, mapOfAtoms)
	};

	return {
		get value() {
			return {
				...rest.value,
				...R.map((v) => v.value, mapOfAtoms)
			}
		},
		set value(newVal) {
			const oldValues = R.map((v) => {
				return $state.snapshot(v.value)
			}, mapOfAtoms)

			R.forEachObjIndexed((v, k) => {
				if(writables[k] && !$state.is(oldValues[k], newVal[k])) {
					v.value = newVal[k]
				}
			}, mapOfAtoms)
			rest.value = R.pick(R.difference(Object.keys(newVal), Object.keys(mapOfAtoms)), newVal)
		}
	}
}

export function combineArray(listOfAtoms) {
	return {
		get value() {
			return R.map((v) => {
				const s = $state.snapshot(v.value);

				return s
			}, listOfAtoms)
		},
		set value(newVal) {
			const oldValues = R.map((v) => {
				return $state.snapshot(v.value)
			}, listOfAtoms)

			R.addIndex(R.forEach)((v, i) => {
				if(!$state.is(oldValues[i], newVal[i])) {
					v.value = newVal[i]
				}
			}, listOfAtoms)
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
		},
	}
}

export function update(fn, someAtom) {
	someAtom.value = fn(someAtom.value)
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
			return foldl((a,b) => b===undefined?a:Math.max(a,b), -Infinity, opticLense, someAtom.value)
		},

		get min() {
			return foldl((a,b) => b===undefined?a:Math.min(a,b), Infinity, opticLense, someAtom.value)
		},

		folded(fn, init, skipUndefined=true) {
			return foldl((a,b) => (skipUndefined && b===undefined) ? a : fn(a,b), init, opticLense, someAtom.value)
		},

		traverse(trav, fn = R.identity) {
			return {
				get value() {
					return fn(trav(opticLense, someAtom.value))
				},
			}
		}
	}
}

export function traverse(opticLense, trav, someAtom) {
	return {
		get value() {
			return fn(trav(opticLense, someAtom.value))
		},

		map(fn) {
			return {
				get value() {
					return fn(trav(opticLense, someAtom.value))
				},
			}
		}
	}
}

export function map(fn, someAtom) {
	return {
		get value() {
			return fn(someAtom.value)
		},
	}
}

export function string(parts, ...args) {
	return {
		get value() {
			return R.join('', R.zipWith(R.concat, parts, R.map(R.compose(R.toString, R.prop('value')), args))) + R.last(parts)
		},
	}
}



export function delayedRead(lens, someAtom) {
	const later = atom(L.get(lens, someAtom.value));

	$effect.pre(() => {
		later.value = L.get(lens, someAtom.value);
		tick().then(() => {
			later.value = L.get(lens, someAtom.value);
		});
	});

	return read(L.identity, later);
}

export function delayed(lens, someAtom) {
	const later = atom(L.get(lens, someAtom.value));

	$effect.pre(() => {
		later.value = L.get(lens, someAtom.value);
		tick().then(() => {
			later.value = L.get(lens, someAtom.value);
		});
	});

	$effect.pre(() => {
		someAtom.value = L.set(lens, instant.value, someAtom.value);
		tick().then(() => {
			someAtom.value = L.set(lens, instant.value, someAtom.value);
		});
	});

	return later;
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

	node.value = someAtom.value;

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
	 function onscroll(e) {
	 	if((!$state.is(someAtom.value.x, node.scrollLeft) || !$state.is(someAtom.value.y, node.scrollTop))) {
			someAtom.value = {
				x: node.scrollLeft,
				y: node.scrollTop,
			}
	 	}
	}

	$effect.pre(() => {
		const scrollMaxX = Math.max(0, node.scrollLeftMax  ? node.scrollLeftMax : node.scrollWidth - node.offsetWidth)
		const scrollMaxY = Math.max(0, node.scrollTopMax  ? node.scrollTopMax : node.scrollHeight - node.offsetHeight)
		const newX =  R.clamp(0, scrollMaxX, someAtom.value.x)
		const newY =  R.clamp(0, scrollMaxY, someAtom.value.y)
		const oldX = R.clamp(0, scrollMaxX, node.scrollLeft)
		const oldY = R.clamp(0, scrollMaxY, node.scrollTop)


		if(oldX != newX) {
			node.scrollLeft = newX;
		}
		if(oldY != newY) {
			node.scrollTop = newY
		}

	});

	node.addEventListener("scroll", onscroll, { passive: false });

	return () => {
		node.removeEventListener("scroll", onscroll, { passive: false });
	};
}

export function readScroll(node, someAtom) {
	 function onscroll(e) {
	 	if((!$state.is(someAtom.value.x, node.scrollLeft) || !$state.is(someAtom.value.y, node.scrollTop))) {
			someAtom.value = {
				x: node.scrollLeft,
				y: node.scrollTop,
			}
	 	}
	}

	node.addEventListener("scroll", onscroll, { passive: false });

	return () => {
		node.removeEventListener("scroll", onscroll, { passive: false });
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

export function bindScrollMax(node, someAtom) {
	// TODO specialize code for different kind of elements
	const resizeObserver = new ResizeObserver(() => {
		someAtom.value = {
			x: node.scrollWidth - node.clientWidth,
			y: node.scrollHeight - node.clientHeight,
		}
	});

	const mutObserver = new MutationObserver(() => {
		someAtom.value = {
			x: node.scrollWidth - node.clientWidth,
			y: node.scrollHeight - node.clientHeight,
		}
	});

	const onInput = (evt) => {
		if(evt.currentTarget !== node) {
			return
		}
		someAtom.value = {
			x: node.scrollWidth - node.clientWidth,
			y: node.scrollHeight - node.clientHeight,
		}
	}

	resizeObserver.observe(node)
	mutObserver.observe(node, { attributes: true, childList: false, subtree: true, characterData: true, })
	node.addEventListener('input', onInput)

	return () => {
		node.removeEventListener('input', onInput)
		mutObserver.unobserve(node)
		resizeObserver.unobserve(node)
	};
}

export function autofocusIf(node, yes) {
	if(yes) {
		if(yes && document.activeElement !== node) {
			node.focus({
			  preventScroll: true
			})
		} else if(!yes && document.activeElement === node) {
			node.blur()
		}
	}


	return {
		update(yes) {
			if(yes && document.activeElement !== node) {
				node.focus({
				  preventScroll: true
				})
			} else if(!yes && document.activeElement === node) {
				node.blur()
			}
		},

		destroy() {
			// the node has been removed from the DOM
		},
	};
}

export function activeEvent(node, {eventType, fn}) {
    node.addEventListener(eventType, fn, { passive: false });

    return {
        destroy() {
            node.removeEventListener(eventType, fn, { passive: false });
        },
    };
};


export function activeTouchMove(node, fn) {
    return activeEvent(node, {eventType: 'touchmove', fn})
};

export function disableTouchEventsIf(node, atom) {
	return activeTouchMove(node, (evt) => {
		if (atom.value) {
			evt.preventDefault();
		}
	})
}