
import * as L from "partial.lenses";

import {
	atom,
	view,
	read,
	combine,
	combineWithRest,
} from "../../svatom.svelte.js";

import {pivotZoomLens,
pivotRotationLens,
panScreenLens} from './navigation'

export function bindEvents(node, {camera, worldClientIso, errorHandler}) {
	const eventWorld = [L.props('clientX', 'clientY'), L.pick({x: 'clientX', y: 'clientY'}), L.inverse(worldClientIso), L.props('x','y')]

	const zoomDelta = view(['focus', pivotZoomLens], camera)
	const rotationDelta = view(['focus', pivotRotationLens], camera)
	const panScreenDelta = view(['focus', panScreenLens], camera)

	function onWheel(evt) {
		if (evt.deltaMode === WheelEvent.DOM_DELTA_PIXEL) {
			if(evt.ctrlKey || mouseGrab || evt.defaultPrevented) {
				evt.preventDefault()
				evt.stopPropagation()

				const worldPos = L.get(eventWorld, evt)

				if(evt.shiftKey) {
					rotationDelta.value = {
						px: worldPos.x,
						py: worldPos.y,
						dw: -Math.sign(evt.deltaY)/16 * 90,
					}
				} else {
					zoomDelta.value = {
						px: worldPos.x,
						py: worldPos.y,
						dz: -Math.sign(evt.deltaY)/16,
					}
				}
			}
		} else {
			if(!evt.altKey && !evt.ctrlKey && !mouseGrab && !evt.defaultPrevented) {
				return
			}

			evt.preventDefault()
			evt.stopPropagation()

			const worldPos = L.get(eventWorld, evt)

			if(evt.altKey) {
				rotationDelta.value = {
					px: worldPos.x,
					py: worldPos.y,
					dw: -evt.deltaY/100 * 90 * (evt.ctrlKey ? 5 : 1),
				}
			} else {
				zoomDelta.value = {
					px: worldPos.x,
					py: worldPos.y,
					dz: -Math.sign(evt.deltaY)/8,
				}
			}
		}
	}

	let gestureBaseRot
	let gestureBaseScale
	let gestureBasePivot = null
	let gestureBasePivotWorld = null
	let prevTouchCount
	function onGestureChange(evt) {
		const dw = Math.atan2(Math.sin((evt.rotation - gestureBaseRot)/180*Math.PI), Math.cos((evt.rotation - gestureBaseRot)/180*Math.PI))*180/Math.PI
		const dz = Math.log(evt.scale) - Math.log(gestureBaseScale)
		const dx = gestureBasePivot.x - evt.clientX
		const dy = gestureBasePivot.y - evt.clientY

		const suddenAngle = Math.abs(dw) > 30
		const suddenZoom = Math.abs(dz) > 0.2
		const suddenPan = Math.hypot(dx, dy) > 15 * window.devicePixelRatio

		if(!suddenAngle /*&& !suddenZoom*/ && !suddenPan) {
			zoomDelta.value = {
				px: gestureBasePivotWorld.x,
				py: gestureBasePivotWorld.y,
				dz: dz,
			}
			rotationDelta.value = {
				px: gestureBasePivotWorld.x,
				py: gestureBasePivotWorld.y,
				dw: dw,
			}
			panScreenDelta.value = {
				dx,
				dy,
			}
		} else {
			gestureBasePivotWorld = L.get(eventWorld, evt)
		}

		gestureBaseScale = evt.scale
		gestureBaseRot = evt.rotation
		gestureBasePivot = {
			x: evt.clientX,
			y: evt.clientY,
		}
	};


	function onGestureStart(evt) {
		gestureBaseRot = evt.rotation
		gestureBaseScale = evt.scale

		gestureBasePivot = {
			x: evt.clientX,
			y: evt.clientY,
		}
		gestureBasePivotWorld = L.get(eventWorld, evt)
	};

	function onGestureEnd(evt) {
		gestureBaseRot = null
		gestureBaseScale = null
		gestureBasePivot = null

	};

	let mouseGrab
	function onPointerStart(evt) {
		if(evt.pointerType === 'mouse' && evt.button === 1 && evt.shiftKey) {
			evt.preventDefault()
			node.setPointerCapture(evt.pointerId)
			mouseGrab = {
				pointerId: evt.pointerId,
				x: evt.clientX,
				y: evt.clientY,
				world: L.get(eventWorld, evt),
			}
		}
	}

	function onPointerEnd(evt) {
	}

	function onPointerGotCapture(evt) {
	}

	function onPointerLostCapture(evt) {
		if(mouseGrab && mouseGrab.pointerId == evt.pointerId) {
			mouseGrab = undefined
		}
	}

	function onPointerMove(evt) {
		if(mouseGrab && mouseGrab.pointerId === evt.pointerId) {
			const dx = mouseGrab.x - evt.clientX
			const dy = mouseGrab.y - evt.clientY

			
			if(evt.ctrlKey) {
				const sign = Math.sign(dx)
				zoomDelta.value = {
					px: mouseGrab.world.x,
					py: mouseGrab.world.y,
					dz: -sign*Math.hypot(dx,dy)/128,
				}
			} else if(evt.altKey) {
				const sign = Math.sign(dx)
					rotationDelta.value = {
						px: mouseGrab.world.x,
						py: mouseGrab.world.y,
						dw: -sign*Math.hypot(dx,dy),
					}
			} else {
				panScreenDelta.value = {
					dx,
					dy,
				}
			}

			mouseGrab.x = evt.clientX
			mouseGrab.y = evt.clientY
		}
	}

	const onError = (e) => {
		if(errorHandler) {
			const pos = L.get(eventWorld, {clientX: window.innerWidth / 2, clientY: window.innerHeight / 2})
			errorHandler({ msg: e.message, ...pos })
		} else {
			alert(e.message)
		}
	};

	if(typeof window.DragEvent === "undefined") {
		const pos = L.get(eventWorld, {clientX: window.innerWidth / 2, clientY: window.innerHeight / 2})
		errorHandler({ msg: "DragEvent not supported", ...pos })
	}

	//let c = 0
	//const colors = ['#fff','#ddd','#eee','#f0f0f0','#d0d0d0','#e0e0e0'];
	let localTouches = []
	let touchBaseRot
	let touchBaseScale
	let touchBasePivot = null
	let touchBasePivotWorld = null

	function touchesCenter(touches) {
		let sumX = 0;
		let sumY = 0;

		for(let t=touches.length-1;t>=0;t--) {
			sumX += touches[t].clientX
			sumY += touches[t].clientY
		}

		return {
			x: sumX / touches.length,
			y: sumY / touches.length
		}
	}

	function touchesAngle(center, touches) {
		let sum = 0;

		for(let t=touches.length-1;t>=0;t--) {
			const d = Math.atan2(touches[t].clientY - center.y, touches[t].clientX - center.x)
			sum += d
		}

		return sum
	}

	function touchesDistance(center, touches) {
		let sum = 0;

		for(let t=touches.length-1;t>=0;t--) {
			const d = Math.hypot(touches[t].clientX - center.x, touches[t].clientY - center.y)
			sum += d
		}

		return (sum / touches.length)
	}

	function onTouchStartLocal(evt) {
		localTouches = evt.targetTouches

		touchBasePivot = touchesCenter(evt.touches)
		touchBasePivotWorld = L.get(eventWorld, {clientX: touchBasePivot.x, clientY: touchBasePivot.y})
		touchBaseScale = touchesDistance(touchBasePivot, evt.touches)
		touchBaseRot = touchesAngle(touchBasePivot, evt.touches)
	}

	function onTouchStopLocal(evt) {
		localTouches = evt.targetTouches

		if(evt.touches.length < 2 || localTouches.length < 1) {
			touchBasePivot = null
			touchBasePivotWorld = null
			touchBaseScale = null
			touchBaseRot = null
		}
	}

	function onTouchStartGlobal(evt) {
		if(evt.touches.length > 1 && localTouches.length > 0) {
			evt.preventDefault()
			touchBasePivot = touchesCenter(evt.touches)
			touchBaseScale = touchesDistance(touchBasePivot, evt.touches)
			touchBaseRot = touchesAngle(touchBasePivot, evt.touches)
		}
	}

	function onTouchStopGlobal(evt) {
		if(evt.touches.length > 1 && localTouches.length > 0) {
			evt.preventDefault()
			touchBasePivot = touchesCenter(evt.touches)
			touchBaseScale = touchesDistance(touchBasePivot, evt.touches)
			touchBaseRot = touchesAngle(touchBasePivot, evt.touches)
		}
	}

	function onTouchMoveLocal(evt) {

		if(evt.touches.length > 1 && localTouches.length > 0) {
			evt.preventDefault()
		}
	}

	function onTouchMoveGlobal(evt) {
		if(evt.touches.length > 1 && localTouches.length > 0) {
			evt.preventDefault()
			const newPivot = touchesCenter(evt.touches)
			const newScale = touchesDistance(newPivot, evt.touches)
			const newAngle = touchesAngle(newPivot, evt.touches)

			const dx = touchBasePivot.x - newPivot.x
			const dy = touchBasePivot.y - newPivot.y
			const dz = Math.log(newScale) - Math.log(touchBaseScale)
			const dw = Math.atan2(Math.sin((newAngle - touchBaseRot)), Math.cos((newAngle - touchBaseRot)))*180/Math.PI


			zoomDelta.value = {
				px: touchBasePivotWorld.x,
				py: touchBasePivotWorld.y,
				dz: dz,
			}
			rotationDelta.value = {
				px: touchBasePivotWorld.x,
				py: touchBasePivotWorld.y,
				dw: dw / evt.touches.length,
			}
			panScreenDelta.value = {
				dx,
				dy,
			}

			touchBasePivot = newPivot
			touchBaseScale = newScale
			touchBaseRot = newAngle
		}
	}

	window.addEventListener('error', onError)


	node.addEventListener('wheel', onWheel, { passive:false, capture: false })
	node.addEventListener('pointerdown', onPointerStart, {capture: true})
	node.addEventListener('pointermove', onPointerMove, {capture: true})
	node.addEventListener('pointercancel', onPointerEnd, {capture: true})
	node.addEventListener('lostpointercapture', onPointerLostCapture, {capture: true})
	node.addEventListener('getpointercapture', onPointerGotCapture, {capture: true})
	node.addEventListener('pointerup', onPointerEnd, {capture: true})

	const nativeGestureEvents = (typeof window.GestureEvent) !== "undefined"
	const nativeTouchEvents = (typeof window.TouchEvent) !== "undefined"

	if(nativeGestureEvents) {
		node.addEventListener('gesturestart', onGestureStart, {capture: true})
		node.addEventListener('gestureend', onGestureEnd, {capture: true})
		node.addEventListener('gesturechange', onGestureChange, {capture: true})
	} else if(nativeTouchEvents) {
		node.addEventListener('touchstart', onTouchStartLocal, {capture: true})
		node.addEventListener('touchmove', onTouchMoveLocal, {capture: true})
		node.addEventListener('touchend', onTouchStopLocal, {capture: true})
		node.addEventListener('touchcancel', onTouchStopLocal, {capture: true})
		window.addEventListener('touchmove', onTouchMoveGlobal, {capture: true})
		window.addEventListener('touchstart', onTouchStartGlobal, {capture: true})
		window.addEventListener('touchend', onTouchStopGlobal, {capture: true})
		window.addEventListener('touchcancel', onTouchStopGlobal, {capture: true})
	}


	return () => {
		if(nativeGestureEvents) {
			node.removeEventListener('gesturechange', onGestureStart, {capture: true})
			node.removeEventListener('gesturestart', onGestureChange, {capture: true})
			node.removeEventListener('gestureend', onGestureEnd, {capture: true})
		} else if(nativeTouchEvents) {
			window.removeEventListener('touchcancel', onTouchStopGlobal, {capture: true})
			window.removeEventListener('touchend', onTouchStopGlobal, {capture: true})
			window.removeEventListener('touchstart', onTouchStartGlobal, {capture: true})
			window.removeEventListener('touchmove', onTouchMoveGlobal, {capture: true})
			node.removeEventListener('touchcancel', onTouchStopLocal, {capture: true})
			node.removeEventListener('touchend', onTouchStopLocal, {capture: true})
			node.removeEventListener('touchmove', onTouchMoveLocal, {capture: true})
			node.removeEventListener('touchstart', onTouchStartLocal, {capture: true})
		}
		
		node.removeEventListener('pointerup', onPointerEnd, {capture: true})
		node.removeEventListener('pointermove', onPointerMove, {capture: true})
		node.removeEventListener('lostpointercapture', onPointerLostCapture, {capture: true})
		node.removeEventListener('getpointercapture', onPointerGotCapture, {capture: true})
		node.removeEventListener('pointercancel', onPointerEnd, {capture: true})
		node.removeEventListener('pointerdown', onPointerStart, {capture: true})
		node.removeEventListener('wheel', onWheel, { passive:false, capture: false })

		window.removeEventListener('error', onError)
	}
}