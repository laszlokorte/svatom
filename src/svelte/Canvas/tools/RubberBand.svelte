<script>
    import * as L from "partial.lenses";
    import * as R from "ramda";
    import * as U from "../../utils";
    import { atom, view, read } from "../../svatom.svelte.js";
    const {
        frameBoxPath,
        clientToCanvas,
        frame,
        rotationTransform,
        cameraOrientation,
        cameraScale,
    } = $props();

    const rubberBand = atom(undefined);

    const rubberBandStart = $derived(
        view(
            [L.removable("start"), "start", L.removable("x", "y")],
            rubberBand,
        ),
    );
    const rubberBandSize = $derived(
        view(
            L.ifElse(
                R.prop("start"),
                [L.removable("size"), "size", L.removable("x", "y")],
                L.zero,
            ),
            rubberBand,
        ),
    );
    const isActive = $derived(
        view(
            L.lens(R.compose(R.not, R.isNil), (n, o) => (n ? o : undefined)),
            rubberBandStart,
        ),
    );

    const hasProgressed = $derived(
        view(["progressed", L.valueOr(false)], rubberBand),
    );

    const rubberBandAngle = $derived(
        view([L.removable("angle"), "angle"], rubberBand),
    );
    const rubberBandAngleCos = $derived(
        view([L.reread((r) => Math.cos((r / 180) * Math.PI))], rubberBandAngle),
    );
    const rubberBandAngleSin = $derived(
        view([L.reread((r) => Math.sin((r / 180) * Math.PI))], rubberBandAngle),
    );

    const rubberBandPath = $derived(
        read(
            L.getter((b) =>
                b && b.start && b.size
                    ? U.formattedNumbers`M${b.start.x},${b.start.y}h${b.size.x}v${b.size.y}M${b.start.x},${b.start.y}v${b.size.y}h${b.size.x}`
                    : "",
            ),
            rubberBand,
        ),
    );

    const rubberBandTransform = $derived(
        read(
            L.reread((r) => `rotate(${r.angle}, ${r.start.x}, ${r.start.y})`),
            rubberBand,
        ),
    );

    export const canCancel = () => hasProgressed.value;
    export function cancel() {
        hasProgressed.value = false;
    }

    let captureNextClick = $state(false);
    export const allowAffineTransform = true;
</script>

<path
    d={frameBoxPath.value}
    pointer-events="all"
    fill="none"
    class="rubber-band-surface"
    role="button"
    tabindex="-1"
    onclick={(evt) => {
        if (captureNextClick) {
            captureNextClick = false;
            evt.stopPropagation();
        }
    }}
    onkeydown={(evt) => {
        if (evt.key === "Escape" || evt.key === "Esc") {
            hasProgressed.value = false;
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

        evt.currentTarget.setPointerCapture(evt.pointerId);

        rubberBandStart.value = clientToCanvas(evt.clientX, evt.clientY);
        rubberBandAngle.value = -cameraOrientation.value;
    }}
    onpointermove={(evt) => {
        if (!evt.isPrimary) {
            return;
        }

        if (!isActive.value) {
            return;
        }

        const worldPos = clientToCanvas(evt.clientX, evt.clientY);

        const dx = worldPos.x - rubberBandStart.value.x;
        const dy = worldPos.y - rubberBandStart.value.y;

        const newSize = {
            x: rubberBandAngleCos.value * dx + rubberBandAngleSin.value * dy,
            y: -rubberBandAngleSin.value * dx + rubberBandAngleCos.value * dy,
        };

        rubberBandSize.value = newSize;
        if (
            Math.hypot(newSize.x, newSize.y) >
            (cameraScale.value * Math.hypot(evt.width, evt.height)) / 4
        ) {
            hasProgressed.value = true;
        }
    }}
    onpointerup={(evt) => {
        if (!evt.isPrimary) {
            return;
        }
        if (hasProgressed.value) {
            captureNextClick = true;
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

{#if hasProgressed.value}
    <g pointer-events="none" transform={rotationTransform.value}>
        <path
            d={rubberBandPath.value}
            transform={rubberBandTransform.value}
            fill="none"
            class="rubber-band"
            pointer-events="none"
        />
    </g>
{/if}

<style>
    .rubber-band-surface {
        stroke-width: 0;
        cursor: default;
        outline: none;
    }

    .rubber-band {
        stroke-dasharray: 5 5;
        fill: #27b7db;
        stroke: #2374ff;
        fill-opacity: 0.2;
        fill-rule: evenodd;
        stroke-width: 1px;
        shape-rendering: crispEdges;
        vector-effect: non-scaling-stroke;
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
