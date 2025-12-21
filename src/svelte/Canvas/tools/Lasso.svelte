<script>
    import * as L from "partial.lenses";
    import * as R from "ramda";
    import * as U from "../../utils";
    import * as C from "@svatom/basic/combinators";
    import { atom, view, read } from "../../svatom.svelte.js";

    const { frameBoxPath, clientToCanvas, cameraScale, rotationTransform } =
        $props();

    const lasso = atom({});

    const lassoPoints = $derived(view(["points", L.defaults([])], lasso));
    const isActive = $derived(
        view(
            [L.lens(R.compose(R.lt(0), R.length), (n, old) => (n ? old : []))],
            lassoPoints,
        ),
    );
    const currentLasso = $derived(
        view(
            [
                L.setter(R.takeLast(200)), // limit the lasso length just for fun
                L.setter(
                    // discard very close samples
                    R.dropRepeatsWith(
                        R.compose(
                            (x) => x < cameraScale.value * 10,
                            Math.sqrt,
                            R.uncurryN(
                                2,
                                C.Phi1(R.add)(
                                    C.Psi(R.compose((x) => x * x, R.subtract))(
                                        R.prop("x"),
                                    ),
                                )(
                                    C.Psi(R.compose((x) => x * x, R.subtract))(
                                        R.prop("y"),
                                    ),
                                ),
                            ),
                        ),
                    ),
                ),
                L.setter((n, o) => (n ? [...o, n] : [])),
                L.removable("x", "y"),
                L.defaults(false),
            ],
            lassoPoints,
        ),
    );

    const lassoPath = $derived(
        view(
            [
                L.iso(
                    R.compose(
                        R.join(" "),
                        R.map(R.compose(R.join(","), R.props(["x", "y"]))),
                    ),
                    R.compose(
                        R.map(
                            R.compose(
                                R.zipWith(R.assoc, ["x", "y"]),
                                R.split(","),
                            ),
                        ),
                        R.split(" "),
                    ),
                ),
            ],
            lassoPoints,
        ),
    );

    export const canCancel = () => isActive.value;
    export function cancel() {
        isActive.value = false;
    }

    export const allowAffineTransform = true;
</script>

<path
    d={frameBoxPath.value}
    pointer-events="all"
    fill="none"
    role="button"
    tabindex="-1"
    class="lasso-surface"
    onclick={(evt) => {
        evt.stopPropagation();
    }}
    onkeydown={(evt) => {
        if (evt.key === "Escape" || evt.key === "Esc") {
            currentLasso.value = undefined;
        }
    }}
    oncontextmenu={(evt) => {
        evt.preventDefault();
        isActive.value = false;
    }}
    onpointerdown={(evt) => {
        if (!evt.isPrimary || !U.isLeftButton(evt)) {
            isActive.value = false;
            return;
        }

        evt.preventDefault();

        evt.currentTarget.setPointerCapture(evt.pointerId);

        currentLasso.value = clientToCanvas(evt.clientX, evt.clientY);
    }}
    onpointermove={(evt) => {
        if (!evt.isPrimary) {
            return;
        }
        if (!isActive.value) {
            return;
        }

        currentLasso.value = clientToCanvas(evt.clientX, evt.clientY);
    }}
    onpointerup={(evt) => {
        if (!evt.isPrimary) {
            return;
        }
        isActive.value = false;
    }}
    onpointercancel={(evt) => {
        if (!evt.isPrimary) {
            return;
        }
        isActive.value = false;
    }}
    onlostpointercapture={(evt) => {
        if (!evt.isPrimary) {
            return;
        }
        isActive.value = false;
    }}
/>

<g transform={rotationTransform.value} pointer-events="none">
    <polyline points={lassoPath.value} fill="none" class="lasso-area" />
</g>

<style>
    /*.lasso-anchor {
		fill: #2374ff;
		vector-effect: non-scaling-stroke;
		display: none;
	}*/

    .lasso-surface {
        stroke-width: 0;
        outline: none;
    }

    .lasso-area {
        fill: #27b7db;
        stroke: #2374ff;
        fill-opacity: 0.2;
        fill-rule: evenodd;
        stroke-width: 1px;
        vector-effect: non-scaling-stroke;
        stroke-dasharray: 5 5;
        animation: 4s linear marquee infinite;
    }

    @keyframes marquee {
        0% {
            stroke-dashoffset: 0;
        }
        100% {
            stroke-dashoffset: -100;
        }
    }
</style>
