import { get, set, collect, foldl, propsExcept } from 'partial.lenses'
import * as R from "ramda";
import {tick, untrack} from "svelte";
import { createActor } from 'xstate';


export function fsm(machineDef) {

	const machineActor = createActor(machineDef).start();

	let machineState = $state.raw({value: machineActor.getSnapshot()});

	machineActor.subscribe((newState) => {
		machineState = {value: newState}
	})

	return {
		get value() {
			return machineState.value
		},

		get state() {
			return read('value', this)
		},

		get context() {
			return read('context', this)
		},

		send(evt) {
			return machineActor.send(evt)
		},

		on(event, listener) {
			return machineActor.on(event, listener)
		},

		can(event) {
			return machineState.value.can(event)
		},

		dispose() {
			machineActor.stop()
		},
	}
}


export function atom(init) {
	let root = $state.raw({
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
				const s = v.value;

				return s
			}, mapOfAtoms)
		},
		set value(newVal) {
			const oldValues = R.map((v) => {
				return (v.value)
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
				return (v.value)
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
				const s = (v.value);

				return s
			}, listOfAtoms)
		},
		set value(newVal) {
			const oldValues = R.map((v) => {
				return (v.value)
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
	const cachedOriginal = $derived(someAtom.value)
	const cached = $derived(get(opticLense, cachedOriginal))

	return {
		get value() {
			return cached
		},
		set value(newVal) {
			const transformed = set(opticLense, newVal, cachedOriginal)
			
			if (!(transformed instanceof Error)) {
				someAtom.value = transformed
			}
		},
	}
}

export function strictView(opticLense, someAtom) {
	return {
		get value() {
			return get(opticLense, someAtom.value)
		},
		set value(newVal) {
			const transformed = set(opticLense, newVal, someAtom.value)
			
			if (!(transformed instanceof Error)) {
				someAtom.value = transformed
			} else {
				someAtom.value = someAtom.value
			}
		},
	}
}

export function mutableView(init, someAtom, equality = R.equals) {
	let original = $state(someAtom.value)
	let mutable = $state(init(original, undefined))

	$effect(() => {
		const newValue = someAtom.value

		untrack(() => {
			if(!equality(newValue, original)) {
				original = newValue
				mutable = init(newValue, mutable)
			}
		})
	})

	return {
		get value() {
			return mutable
		},
		set value(newVal) {
			const transformed = newVal
			
			if (!(transformed instanceof Error)) {
				mutable = transformed
			}
		},
	}
}

export function update(fn, someAtom) {
	someAtom.value = fn(someAtom.value)
}


export function toggle(someAtom, fn) {
	let prev = null

	$effect(() => {
		const currentValue = someAtom.value
		const next = !!currentValue

		if(next !== prev) {			
			prev = next

			fn(currentValue)
		}
	})
}

export function during(someAtom, fn) {
	let raf = null

	toggle(someAtom, (val) => {
		if (val) {
			function tick() {
				fn(someAtom.value)
				raf = requestAnimationFrame(tick)
			}

			tick()
		} else {
			cancelAnimationFrame(raf)
			raf = null
		}
	})
}

export function animateWith(someAtom, fn) {
	let raf = null

	$effect(() => {
		const currentVal = someAtom.value
		const restore = (event) => {
			fn(currentVal)
		}
		if(currentVal) {
			currentVal.el.addEventListener("contextrestored", restore);
			function tick() {
				const currentVal = someAtom.value
				if(currentVal) {
					fn(currentVal)
					raf = requestAnimationFrame(tick)
				}
			}

			tick()

			return () => {
				currentVal.el.removeEventListener("contextrestored", restore);
			}
		} else if(raf) {
			cancelAnimationFrame(raf)
			raf = null
		}
	})
}


export function adjustSize(node, someAtom) {
	let prevX = 0;
	let prevY = 0;

	$effect.pre(() => {
		const newVal = someAtom.value;

		if (prevX !== newVal.x) {
			prevX = newVal.x;
			tick().then(() => {
				node.width = prevX;
			});
		}
		if (prevY !== newVal.y) {
			prevY = newVal.y;
			tick().then(() => {
				node.height = prevY;
			});
		}
	});
}

export function failableView(opticLense, someAtom, autoReset = true, errorAtom = atom(null), transientAtom = atom(null)) {
	$effect(() => {
		const changed = someAtom.value

		untrack(() => {
			errorAtom.value = null
			transientAtom.value = null
		})
	})

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
	const cached = $derived(get(opticLense, someAtom.value))

	return {
		get value() {
			return cached
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
			return R.join('', R.zipWith(R.concat, parts, R.map(R.compose(x=>""+x, R.prop('value')), args))) + R.last(parts)
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

export function throttled(fn) {
	let ticking = false;

	return (...args) => {
		if (!ticking) {
		    window.requestAnimationFrame(() => {
		      fn(...args);
		      ticking = false;
		    });

		    ticking = true;
		}
	}
}

export function bindScroll(node, someAtom) {
	 const onScrollThrottled = throttled(function onscroll(e) {
	
	 	const newValue = someAtom.value
		const nodeScrollLeft = node.scrollLeft
		const nodeScrollTop = node.scrollTop

	 	if((!$state.is(newValue.x, nodeScrollLeft) || !$state.is(newValue.y, nodeScrollTop))) {

	 		const leftMax = node.scrollLeftMax ?? (node.scrollWidth - node.offsetWidth)
	 		const topMax =  node.scrollTopMax ?? (node.scrollHeight - node.offsetHeight)

			const scrollMaxX = Math.max(0, leftMax)
			const scrollMaxY = Math.max(0, topMax)

			someAtom.value = {
				x: nodeScrollLeft,
				y: nodeScrollTop,
				atMaxX: nodeScrollLeft >= scrollMaxX,
				atMinX: nodeScrollLeft <= 0,
				atMaxY: nodeScrollTop >= scrollMaxY,
				atMinY: nodeScrollTop <= 0,
			}
	 	}
	})


	$effect.pre(() => {
		const newPos = someAtom.value
		tick().then(function bindScrollEffect() {
			const scrollMaxX = Math.max(0, node.scrollLeftMax  ?? node.scrollWidth - node.offsetWidth)
			const scrollMaxY = Math.max(0, node.scrollTopMax  ?? node.scrollHeight - node.offsetHeight)
			const newX =  R.clamp(0, scrollMaxX, newPos.x)
			const newY =  R.clamp(0, scrollMaxY, newPos.y)
			const oldX = R.clamp(0, scrollMaxX, node.scrollLeft)
			const oldY = R.clamp(0, scrollMaxY, node.scrollTop)

			if(oldX != newX | oldY != newY) {
				node.scrollTo({
					left: newX,
					top: newY,
					behavior: "instant",
				})
			}
		})
	});

	node.addEventListener("scroll", onScrollThrottled, { passive: true });

	return () => {
		node.removeEventListener("scroll", onScrollThrottled, { passive: true });
	};
}

export function readScroll(node, someAtom) {
	 const onScrollThrottled = throttled(function onscroll(e) {
	 	const newValue = someAtom.value
		const nodeScrollLeft = node.scrollLeft
		const nodeScrollTop = node.scrollTop
	 	if((!$state.is(newValue.x, nodeScrollLeft) || !$state.is(newValue.y, nodeScrollTop))) {
			someAtom.value = {
				x: nodeScrollLeft,
				y: nodeScrollTop,
			}
	 	}
	})

	node.addEventListener("scroll", onScrollThrottled, { passive: true });

	return () => {
		node.removeEventListener("scroll", onScrollThrottled, { passive: true });
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

export function bindBoundingBox(node, someAtom) {
	let oldV
	$effect.pre(() => {
		tick().then(() => {
			const bbox = node.getBBox();
			if(bbox.width || bbox.height) {
				oldV = {x:bbox.x, y:bbox.y, width: bbox.width, height: bbox.height}
				someAtom.value = oldV
			} else {
				oldV = undefined
				someAtom.value = undefined
			}
		})
	})

	return {
		update(newAtom) {
		},
		destroy() {
			someAtom.value = undefined
		}
	}
}


export function readTextreaScrollSize(node, someAtom) {
	function oninput(e) {
		someAtom.value = {
			x: node.scrollWidth,
			y: node.scrollHeight,
		}
	}

	node.addEventListener("input", oninput);

	return () => {
		node.removeEventListener("input", oninput);
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

export function disableEventIf(node, {eventType, cond}) {
	return activeEvent(node, {eventType, fn: (evt) => {
		if (cond === true || (cond !== false && cond.value)) {
			evt.preventDefault();
		}
	}})
}

export function onPointerClick(node, fn) {
	let wasDown = false
	const onDown = (evt) => {
		evt.stopPropagation()
		evt.stopImmediatePropagation()
		wasDown = true
	}
	const onEnd = (evt) => {
		wasDown = false
	}
	const onClick = (evt) => {
		if(wasDown) {
			fn(evt)
			wasDown = false
		}
	}

	node.addEventListener('pointerdown', onDown)
	node.addEventListener('click', onClick)
	node.addEventListener('onpointercancel', onEnd)

	return () => {
		node.removeEventListener('onpointercancel', onEnd)
		node.removeEventListener('click', onClick)
		node.removeEventListener('pointerdown', onDown)
	}
}

export function isFullscreen() {
	let isFull = $state(document.fullscreenElement !== null)

	function updateFullScreenState() {
		isFull = document.fullscreenElement !== null
	}

	$effect(() => {
		document.addEventListener("fullscreenchange", updateFullScreenState, false);  
		return () => {
			document.removeEventListener("fullscreenchange", updateFullScreenState, false); 
		}
	})

	return {
		get value() {
			return isFull
		}
	}
}