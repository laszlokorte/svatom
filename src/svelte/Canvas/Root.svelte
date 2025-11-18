<script>
    import { tick } from "svelte";
    import * as L from "partial.lenses";
    import * as H from "partial.lenses.history";
    import * as R from "ramda";
    import * as Geo from "../geometry";
    import * as U from "../utils";
    import Navigator from "./camera/Navigator.svelte";
    import ClickPicker from "./tools/ClickPicker.svelte";
    import AffineTansformer from "./tools/AffineTansformer.svelte";
    import * as CamNavigation from "./camera/navigation";
    import { cameraAsViewbox } from "./camera/functions";
    import {
        frameBoxLens,
        panMovementLens,
        rotateMovementLens,
        zoomMovementLens,
    } from "./camera/lenses";

    import {
        atom,
        view,
        read,
        combine,
        update,
        failableView,
        bindValue,
        bindScroll,
        bindSize,
        traverse,
        animateWith,
        adjustSize,
        isFullscreen,
    } from "../svatom.svelte.js";
    import { constructLenses } from "./camera/live.js";

    const numberFormat = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: false,
    });

    const numberSvgFormat = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 5,
        maximumFractionDigits: 5,
        useGrouping: false,
    });

    const numberLens = L.lens(
        (x) => numberFormat.format(x),
        (x) => {
            return parseFloat(x);
        },
    );

    import Scroller from "../Scroller.svelte";
    import NodeCreator from "./tools/NodeCreator.svelte";
    import EdgeCreator from "./tools/EdgeCreator.svelte";
    import Lasso from "./tools/Lasso.svelte";
    import Pen from "./tools/Pen.svelte";
    import Polygon from "./tools/Polygon.svelte";
    import Spline from "./tools/Spline.svelte";
    import Shape from "./tools/Shape.svelte";
    import ShapesDef from "./tools/ShapesDef.svelte";
    //import ShapesUse from "./tools/ShapesUse.svelte";
    import LayeredUse from "./tools/LayeredUse.svelte";

    import RubberBand from "./tools/RubberBand.svelte";
    import NodesDef from "./tools/NodesDef.svelte";
    import Blocker from "./tools/Blocker.svelte";
    //import NodesUse from "./tools/NodesUse.svelte";
    import EdgesDef from "./tools/EdgesDef.svelte";
    import DrawingsDef from "./tools/DrawingsDef.svelte";
    import SplinesDef from "./tools/SplinesDef.svelte";
    import Bounds from "./tools/Bounds.svelte";
    import Origin from "./tools/Origin.svelte";
    import TextLinesDef from "./tools/TextLinesDef.svelte";
    import TextBoxesDef from "./tools/TextBoxesDef.svelte";
    import TextLineTyper from "./tools/TextLineTyper.svelte";
    import TextBoxTyper from "./tools/TextBoxTyper.svelte";
    import Magnifier from "./tools/Magnifier.svelte";
    import GuideLiner from "./tools/GuideLiner.svelte";
    import Guides from "./tools/Guides.svelte";
    import Grid from "./tools/Grid.svelte";
    import Ruler from "./tools/Ruler.svelte";
    import Axis from "./tools/Axis.svelte";
    import PlotCreator from "./tools/PlotCreator.svelte";
    import ShowAxis from "./tools/ShowAxis.svelte";
    import ShowAlert from "./tools/ShowAlert.svelte";
    import ShowPlots from "./tools/ShowPlots.svelte";
    import Pan from "./tools/Pan.svelte";
    import Rotate from "./tools/Rotate.svelte";
    import Zoom from "./tools/Zoom.svelte";
    import Dropper from "./tools/Dropper.svelte";
    import Minimap from "./tools/Minimap.svelte";

    import Droppables from "./toolbars/Droppables.svelte";
    import Bookmarker from "./toolbars/Bookmarker.svelte";
    import History from "./toolbars/History.svelte";
    import Tabs from "./toolbars/Tabs.svelte";
    import Properties from "./toolbars/Properties.svelte";

    const svgElement = atom(undefined);
    const bitmapCanvas = atom(undefined);
    const cameraTow = atom(undefined);
    const currentToolElement = atom(undefined);
    const fullScreenContainer = atom(undefined);
    const canFullScreen = read("requestFullscreen", fullScreenContainer);

    const debugFrames = atom(false);
    const showBounds = atom(false);
    const fullPageCanvas = atom(false);
    const isFullScreen = isFullscreen();
    const bookmarks = atom([
        { label: "Origin", value: { x: 0, y: 0, z: 0, w: 0 } },
    ]);

    const defaultProperties = atom({});

    const HISTORY_SETTINGS = {
        replacePeriod: 1000,
        initialTime: () => Date.now() - 10000,
    };
    animateWith(
        read(
            L.reread((el) =>
                el ? { el, ctx: el.getContext("2d") } : undefined,
            ),
            bitmapCanvas,
        ),
        ({ el, ctx }) => {
            ctx.clearRect(0, 0, el.width, el.height);

            ctx.fillStyle = "black";
            ctx.font = "20px arial";
            ctx.fillText("Hello World", 100, 100);
        },
    );

    const allTabs = atom({
        current: 0,
        tabs: [
            {
                document: H.init(HISTORY_SETTINGS, {
                    content: {
                        axis: {
                            start: { x: 0, y: 0 },
                            size: { x: 200, y: -200 },
                            angle: 0,
                        },
                        nodes: [
                            { x: 200, y: 100 },
                            {
                                x: 266,
                                y: -217,
                            },
                            {
                                x: -110,
                                y: -10,
                            },
                        ],
                        textes: [
                            {
                                x: 119.35297908638951,
                                y: -70.289311950847,
                                fontSize: 0.8922579558824082,
                                content: "Hello World",
                            },
                        ],
                        drawings: [
                            {
                                path: [
                                    {
                                        x: 109.04754010203979,
                                        y: -98.87231234392203,
                                    },
                                    {
                                        x: 101.18452789898805,
                                        y: -108.78054322005022,
                                    },
                                    {
                                        x: 93.66353583926212,
                                        y: -117.74908147539247,
                                    },
                                    {
                                        x: 85.54487130207582,
                                        y: -125.43590696662318,
                                    },
                                    {
                                        x: 75.88884166664351,
                                        y: -131.49899955041673,
                                    },
                                    {
                                        x: 65.97715969707659,
                                        y: -135.34068674931274,
                                    },
                                    {
                                        x: 54.272460295128894,
                                        y: -135.337235655874,
                                    },
                                    {
                                        x: 42.996148845698,
                                        y: -131.23299393596596,
                                    },
                                    {
                                        x: 34.62528306781596,
                                        y: -124.99371464035153,
                                    },
                                    {
                                        x: 27.878150197371127,
                                        y: -117.217070246491,
                                    },
                                    {
                                        x: 23.183138186880228,
                                        y: -103.80227012791505,
                                    },
                                    {
                                        x: 21.393571847938233,
                                        y: -88.25243243363272,
                                    },
                                    {
                                        x: 22.934388039623116,
                                        y: -78.1714659391223,
                                    },
                                    {
                                        x: 26.44095728207091,
                                        y: -65.6134417255798,
                                    },
                                    {
                                        x: 31.142871479439208,
                                        y: -55.61884304026049,
                                    },
                                    {
                                        x: 38.0661910617049,
                                        y: -45.368592020806574,
                                    },
                                    {
                                        x: 45.58718312143094,
                                        y: -36.40005376546425,
                                    },
                                    {
                                        x: 54.38988794526847,
                                        y: -26.833843032661704,
                                    },
                                    {
                                        x: 62.850572625780416,
                                        y: -18.20732492064502,
                                    },
                                    {
                                        x: 72.84862240453842,
                                        y: -11.204539716065653,
                                    },
                                    {
                                        x: 82.16263189664511,
                                        y: -6.081139753058039,
                                    },
                                    {
                                        x: 92.75835415286338,
                                        y: -0.3600673125902176,
                                    },
                                    {
                                        x: 103.95174888654194,
                                        y: 4.079292363766058,
                                    },
                                    {
                                        x: 116.42685638433207,
                                        y: 9.116324517582541,
                                    },
                                    {
                                        x: 126.08288601976446,
                                        y: 15.179417101376032,
                                    },
                                    {
                                        x: 137.276280753443,
                                        y: 19.61877677773225,
                                    },
                                    {
                                        x: 149.0673479645817,
                                        y: 22.776423689976923,
                                    },
                                    {
                                        x: 147.52653177289676,
                                        y: 12.695457195466531,
                                    },
                                    {
                                        x: 153.93164450001598,
                                        y: 3.9791201808200753,
                                    },
                                    {
                                        x: 162.8138149461672,
                                        y: -6.702969884589322,
                                    },
                                    {
                                        x: 169.21892767328632,
                                        y: -15.419306899235835,
                                    },
                                    {
                                        x: 175.87969273453996,
                                        y: -26.357049298779785,
                                    },
                                    {
                                        x: 180.66107255422185,
                                        y: -36.61075141167238,
                                    },
                                    {
                                        x: 185.44245237390385,
                                        y: -46.86445352456505,
                                    },
                                    {
                                        x: 189.28413957279986,
                                        y: -56.77613549413195,
                                    },
                                    {
                                        x: 193.97915158329067,
                                        y: -70.19093561270799,
                                    },
                                    {
                                        x: 198.33214345045576,
                                        y: -84.5454283520699,
                                    },
                                    {
                                        x: 199.9524252644543,
                                        y: -94.71276265577137,
                                    },
                                    {
                                        x: 201.48633926926175,
                                        y: -108.04119496515631,
                                    },
                                    {
                                        x: 200.20117541171146,
                                        y: -120.34356684456412,
                                    },
                                    {
                                        x: 197.37864645591503,
                                        y: -131.02220581653478,
                                    },
                                    {
                                        x: 193.274404736007,
                                        y: -142.2985172659657,
                                    },
                                    {
                                        x: 189.8542033027503,
                                        y: -151.6954434738248,
                                    },
                                    {
                                        x: 182.07755890888973,
                                        y: -158.44257634426964,
                                    },
                                    {
                                        x: 172.763549416783,
                                        y: -163.56597630727725,
                                    },
                                    {
                                        x: 161.05885001483546,
                                        y: -163.5625252138385,
                                    },
                                    {
                                        x: 149.09849827875325,
                                        y: -161.3376687355023,
                                    },
                                    {
                                        x: 139.70157207089417,
                                        y: -157.9174673022456,
                                    },
                                    {
                                        x: 129.45132105144026,
                                        y: -150.99414771997988,
                                    },
                                    {
                                        x: 119.88511031863769,
                                        y: -142.1914428961423,
                                    },
                                    {
                                        x: 113.82201773484425,
                                        y: -132.5354132607099,
                                    },
                                    {
                                        x: 109.0406379151623,
                                        y: -122.2817111478173,
                                    },
                                    {
                                        x: 106.4806634803779,
                                        y: -111.77235670079011,
                                    },
                                    {
                                        x: 108.02147967206278,
                                        y: -101.69139020627972,
                                    },
                                ],
                            },
                        ],
                    },
                }),
                camera: { x: 100, y: -50, z: 0, w: 20 },
            },
        ],
    });

    const cameraSettings = atom({
        plane: {
            autosize: true,
            x: 1000,
            y: 1000,
        },
        frame: {
            aspect: "meet",
            alignX: "Mid",
            alignY: "Mid",
            autoPadding: true,
            size: {
                x: 100,
                y: 100,
            },
        },
    });

    const cameraFocus = view(
        [
            L.choose(({ current, docs }) => [
                "tabs",
                L.defaults([]),
                L.choices(current, L.appendTo),
                "camera",
                L.valueOr({ x: 0, y: 0, z: 0, w: 0 }),
            ]),
        ],
        allTabs,
    );

    const camera = view(
        [
            L.pick({
                focus: "focus",
                frame: ["settings", "frame"],
                plane: ["settings", "plane"],
            }),
            L.valueOr({
                focus: { x: 0, y: 0, z: 0, w: 0 },
                plane: {
                    autosize: true,
                    x: 1000,
                    y: 1000,
                },
                frame: {
                    aspect: "meet",
                    alignX: "Mid",
                    alignY: "Mid",
                    autoPadding: true,
                    size: {
                        x: 100,
                        y: 100,
                    },
                },
            }),
        ],
        combine({ focus: cameraFocus, settings: cameraSettings }),
    );

    const {
        clientToCanvas,
        canvasToClient,
        clientToPage,
        pageToClient,
        worldPageIso,
        worldClientIso,
    } = constructLenses(svgElement, camera);

    const aspectRatioAlignLens = L.iso(
        ({ alignX, alignY }) => `x${alignX}Y${alignY}`,
        R.compose(
            R.prop("groups"),
            R.match(/x(?<alignX>Min|Mid|Max)Y(?<alignY>Min|Mid|Max)/),
        ),
    );
    const preserveAspectRatioLens = [
        "frame",
        L.props("aspect", "alignX", "alignY"),
        L.iso(
            (frame) =>
                frame.aspect
                    ? `x${frame.alignX}Y${frame.alignY} ${frame.aspect}`
                    : "none",
            R.compose(
                R.ifElse(
                    R.prop("noAspect"),
                    R.compose(R.objOf("aspect"), R.prop("noAspect")),
                    R.props(["alignX", "alignY", "aspect"]),
                ),
                R.prop("groups"),
                R.match(
                    /^((?<noAspect>none)|x(?:(?<alignX>Min|Mid|Max)Y(?<alignY>Min|Mid|Max) (?<aspect>meet|slice)))$/,
                ),
            ),
        ),
    ];
    const preserveAspectRatio = read(preserveAspectRatioLens, camera);

    const viewBoxLens = L.reread((cam) => {
        return `${numberSvgFormat.format(cam.focus.x - (cam.plane.x / 2) * Math.exp(-cam.focus.z))}
		${numberSvgFormat.format(cam.focus.y - (cam.plane.y / 2) * Math.exp(-cam.focus.z))}
		${numberSvgFormat.format(cam.plane.x * Math.exp(-cam.focus.z))}
		${numberSvgFormat.format(cam.plane.y * Math.exp(-cam.focus.z))}`;
    });
    const viewBox = view(viewBoxLens, camera);

    const viewBoxPathLens = L.reread((cam) => {
        return `M${numberSvgFormat.format(cam.focus.x - (cam.plane.x / 2) * Math.exp(-cam.focus.z))},
		${numberSvgFormat.format(cam.focus.y - (cam.plane.y / 2) * Math.exp(-cam.focus.z))}
		H${numberSvgFormat.format(cam.focus.x + (cam.plane.x / 2) * Math.exp(-cam.focus.z))}
		V${numberSvgFormat.format(cam.focus.y + (cam.plane.y / 2) * Math.exp(-cam.focus.z))}
		H${numberSvgFormat.format(cam.focus.x - (cam.plane.x / 2) * Math.exp(-cam.focus.z))}z`;
    });

    const viewBoxPath = view(viewBoxPathLens, camera);

    const boxPathLens = L.reread(
        ({ minX, minY, width, height }) =>
            `M${numberSvgFormat.format(minX)},${numberSvgFormat.format(minY)}h${numberSvgFormat.format(width)}v${numberSvgFormat.format(height)}h${numberSvgFormat.format(-width)}z`,
    );

    const frameBoxObject = read(frameBoxLens, camera);
    const frameBoxScreen = read([frameBoxLens, "screenSpaceAligned"], camera);
    const frameBoxPath = read(
        [frameBoxLens, "screenSpaceAligned", boxPathLens],
        camera,
    );

    const cameraRotationTransformLens = L.reread(
        (c) => `rotate(${c.focus.w}, ${c.focus.x}, ${c.focus.y})`,
    );

    const cameraRotationInverseTransformLens = L.reread(
        (c) => `rotate(${-c.focus.w}, ${c.focus.x}, ${c.focus.y})`,
    );

    const rotationTransform = read(cameraRotationTransformLens, camera);
    const rotationInverseTransform = read(
        cameraRotationInverseTransformLens,
        camera,
    );
    const cameraRotationLens = L.iso(
        ({ x, y }) => {
            const c = camera.value;
            const cos = Math.cos((-c.focus.w / 180) * Math.PI);
            const sin = Math.sin((-c.focus.w / 180) * Math.PI);

            const dx = x - c.focus.x;
            const dy = y - c.focus.y;

            return {
                x: c.focus.x + dx * cos + dy * sin,
                y: c.focus.y + dx * -sin + dy * cos,
            };
        },
        ({ x, y }) => {
            const c = camera.value;
            const cos = Math.cos((c.focus.w / 180) * Math.PI);
            const sin = Math.sin((c.focus.w / 180) * Math.PI);

            const dx = x - c.focus.x;
            const dy = y - c.focus.y;

            return {
                x: c.focus.x + dx * cos + dy * sin,
                y: c.focus.y + dx * -sin + dy * cos,
            };
        },
    );

    const cameraScaleLens = L.reread((c) => Math.exp(-c.focus.z));
    const cameraScale = read(cameraScaleLens, camera);
    const cameraOrientationLens = L.reread((c) => c.focus.w);
    const cameraOrientation = read(cameraOrientationLens, camera);
    const gridDistance = atom(128);

    const affineLens = (dim, xDim, yDim, angleDim) => {
        if (dim == xDim) {
            return L.lens(
                (o) => {
                    const rad = -Geo.degree2rad(o[angleDim]);
                    const cos = Math.cos(rad);
                    const sin = Math.sin(rad);
                    return cos * o[xDim] + sin * o[yDim];
                },
                (n, o) => {
                    const rad = -Geo.degree2rad(o[angleDim]);
                    const cos = Math.cos(rad);
                    const sin = Math.sin(rad);

                    const oldX = cos * o[xDim] + sin * o[yDim];
                    const delta = n - oldX;

                    return {
                        ...o,
                        [xDim]: cos * delta + o[xDim],
                        [yDim]: sin * delta + o[yDim],
                    };
                },
            );
        } else if (dim == yDim) {
            return L.lens(
                (o) => {
                    const rad = -Geo.degree2rad(o[angleDim]);
                    const cos = Math.cos(rad);
                    const sin = Math.sin(rad);
                    return -sin * o[xDim] + cos * o[yDim];
                },
                (n, o) => {
                    const rad = -Geo.degree2rad(o[angleDim]);
                    const cos = Math.cos(rad);
                    const sin = Math.sin(rad);

                    const oldY = -sin * o[xDim] + cos * o[yDim];
                    const delta = n - oldY;

                    return {
                        ...o,
                        [xDim]: -sin * delta + o[xDim],
                        [yDim]: cos * delta + o[yDim],
                    };
                },
            );
        } else {
            throw "dim must be xDim or yDim";
        }
    };

    const cameraZoom = view(["focus", "z", numberLens], camera);
    const cameraZoomMin = atom(-5);
    const cameraZoomFormatted = view([numberLens], cameraZoom);
    const cameraAutoPadding = view(["frame", "autoPadding"], camera);

    const cameraX = view(["focus", "x"], camera);
    const cameraY = view(["focus", "y"], camera);
    const cameraXFormatted = view([numberLens], cameraX);
    const cameraYFormatted = view([numberLens], cameraY);
    const cameraAngle = view(["focus", "w", numberLens], camera);
    const cameraAngleFormatted = view([numberLens], cameraAngle);
    const cameraXScreen = view(
        ["focus", affineLens("x", "x", "y", "w")],
        camera,
    );
    const cameraYScreen = view(
        ["focus", affineLens("y", "x", "y", "w")],
        camera,
    );

    const cameraXScreenFormatted = view(
        ["focus", affineLens("x", "x", "y", "w"), numberLens],
        camera,
    );
    const cameraYScreenFormatted = view(
        ["focus", affineLens("y", "x", "y", "w"), numberLens],
        camera,
    );

    const zoomDelta = view(
        ["focus", L.setter(CamNavigation.zoomWithPivot)],
        camera,
    );

    const cameraZoomFrameLens = [
        L.setter((frame, oldCamera) => {
            const rad = Geo.degree2rad(-frame.angle);
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);

            const oldFrameX = oldCamera.plane.x * Math.exp(-oldCamera.focus.z);
            const oldFrameY = oldCamera.plane.y * Math.exp(-oldCamera.focus.z);
            const dz = Math.log(
                Math.min(
                    oldFrameY / Math.abs(frame.size.y),
                    oldFrameX / Math.abs(frame.size.x),
                ),
            );

            return {
                ...oldCamera,
                focus: {
                    x:
                        frame.start.x +
                        (cos * frame.size.x + sin * frame.size.y) / 2,
                    y:
                        frame.start.y +
                        (-sin * frame.size.x + cos * frame.size.y) / 2,
                    z: R.clamp(-5, 5, oldCamera.focus.z + dz),
                    w: -frame.angle,
                },
            };
        }),
    ];

    const canvasDocumentHistory = view(
        [
            L.choose(({ current, docs }) => [
                "tabs",
                current || 0,
                "document",
                L.define(
                    H.init(HISTORY_SETTINGS, {
                        content: {
                            axis: undefined,
                            nodes: [],
                            textes: [],
                            drawings: [],
                        },
                    }),
                ),
            ]),
        ],
        allTabs,
    );

    const canvasDocument = view([H.present], canvasDocumentHistory);

    const canvasDocumentMut = view(H.presentMut, canvasDocumentHistory);

    const canvasUndoIndex = view(H.undoIndex, canvasDocumentHistory);

    const canvasRedoIndex = view(H.redoIndex, canvasDocumentHistory);

    const newTab = view(
        L.setter((n, prev) => ({
            tabs: [
                ...prev.tabs,
                {
                    document: H.init(HISTORY_SETTINGS, n),
                    camera: { x: 100, y: -50, z: 0, w: 20 },
                },
                {
                    document: H.init(HISTORY_SETTINGS, n),
                    camera: { x: 100, y: -50, z: 0, w: 20 },
                },
            ].slice(0, Math.max(prev.tabs.length, 1) + 1),
            current: Math.max(prev.tabs.length, 1),
        })),
        allTabs,
    );

    const tabIds = read(
        [
            "tabs",
            L.valueOr([0]),
            L.reread(R.compose(R.range(0), R.max(1), R.length)),
        ],
        allTabs,
    );

    const closeTab = view(
        L.setter((r, old) => ({
            current:
                old.current >= r ? Math.max(0, old.current - 1) : old.current,
            tabs: R.addIndex(R.filter)((v, i) => i !== r, old.tabs),
        })),
        allTabs,
    );

    const currentTabId = view("current", allTabs);

    const tool = atom("none");
    const currentDocumentContent = view(["content"], canvasDocument);
    const currentDocumentContentMut = view(["content"], canvasDocumentMut);

    const nodes = view(["nodes", L.define([])], currentDocumentContent);
    const edges = view(["edges", L.define([])], currentDocumentContent);
    const textes = view(["textes", L.defaults([])], currentDocumentContent);
    const textBoxes = view(
        ["textBoxes", L.defaults([])],
        currentDocumentContent,
    );
    const guides = view(["guides", L.defaults([])], currentDocumentContent);
    const axis = view(["axis"], currentDocumentContent);
    const drawings = view(["drawings", L.defaults([])], currentDocumentContent);
    const splines = view(["splines", L.defaults([])], currentDocumentContent);
    const shapes = view(["shapes", L.defaults([])], currentDocumentContent);
    const plots = view(["plots", L.defaults([])], currentDocumentContent);
    const alerts = view(["alerts", L.defaults([])], currentDocumentContent);
    const rubberBand = atom(undefined);

    const zLayers = view(
        [
            L.partsOf(
                L.branch({
                    shapes: [
                        L.defaults([]),
                        L.elems,
                        L.lens(
                            (s, i) => ({
                                id: "shape-" + i,
                                zIndex: s.zIndex,
                            }),
                            (newVal, old) => ({
                                ...old,
                                zIndex: newVal.zIndex,
                            }),
                        ),
                    ],
                    edges: [
                        L.defaults([]),
                        L.elems,
                        L.lens(
                            (s, i) => ({
                                id: "edge-" + i,
                                zIndex: s.zIndex,
                            }),
                            (newVal, old) => ({
                                ...old,
                                zIndex: newVal.zIndex,
                            }),
                        ),
                    ],
                    nodes: [
                        L.defaults([]),
                        L.elems,
                        L.lens(
                            (s, i) => ({
                                id: "node-" + i,
                                zIndex: s.zIndex,
                            }),
                            (newVal, old) => ({
                                ...old,
                                zIndex: newVal.zIndex,
                            }),
                        ),
                    ],
                    textes: [
                        L.defaults([]),
                        L.elems,
                        L.lens(
                            (s, i) => ({
                                id: "textline-" + i,
                                zIndex: s.zIndex,
                            }),
                            (newVal, old) => ({
                                ...old,
                                zIndex: newVal.zIndex,
                            }),
                        ),
                    ],
                    textBoxes: [
                        L.defaults([]),
                        L.elems,
                        L.lens(
                            (s, i) => ({
                                id: "textbox-" + i,
                                zIndex: s.zIndex,
                            }),
                            (newVal, old) => ({
                                ...old,
                                zIndex: newVal.zIndex,
                            }),
                        ),
                    ],
                    splines: [
                        L.defaults([]),
                        L.elems,
                        L.lens(
                            (s, i) => ({
                                id: "spline-" + i,
                                zIndex: s.zIndex,
                            }),
                            (newVal, old) => ({
                                ...old,
                                zIndex: newVal.zIndex,
                            }),
                        ),
                    ],
                    drawings: [
                        L.defaults([]),
                        L.elems,
                        L.lens(
                            (s, i) => ({
                                id: "drawing-" + i,
                                zIndex: s.zIndex,
                            }),
                            (newVal, old) => ({
                                ...old,
                                zIndex: newVal.zIndex,
                            }),
                        ),
                    ],
                }),
            ),
            L.lens(R.sortBy(R.propOr(Infinity, "zIndex")), (newZ, olds) => {
                if (newZ.length !== olds.length) {
                    return olds;
                }

                const sortedNew = R.sortBy(R.propOr(Infinity, "zIndex"), newZ);

                return R.map(
                    (o) => ({
                        id: o.id,
                        zIndex: R.findIndex(
                            R.compose(R.equals(o.id), R.prop("id")),
                            sortedNew,
                        ),
                    }),
                    olds,
                );
            }),
        ],
        currentDocumentContentMut,
    );

    // TODO FIX Layers
    const zValues = view(L.partsOf([L.elems, "zIndex"]), zLayers);
    const layerCount = $derived(zValues.value.length);
    let layerCountPrev = $state(0);

    $effect.pre(() => {
        if (layerCount !== layerCountPrev && canvasRedoIndex.value === 0) {
            zValues.value = R.range(0, layerCount);
            layerCountPrev = layerCount;
        }
    });

    const selectionInternal = atom([]);
    const selection = view(L.normalize(R.uniq), selectionInternal);

    const hitAreas = view(
        ({ scale, doc }) => {
            return L.get(
                [
                    L.partsOf(
                        L.branch({
                            nodes: [
                                L.elems,
                                L.reread((n, i) => ({
                                    type: "circle",
                                    cx: n.x,
                                    cy: n.y,
                                    r: 25 * Math.min(1, scale),
                                    id: "node-" + i,
                                    allowedTransform: {
                                        translation: true,
                                        scale: "multiple",
                                        rotate: "multiple",
                                    },
                                })),
                            ],
                            edges: [
                                L.elems,
                                L.reread((e, i) => ({
                                    type: "polyline",
                                    id: "edge-" + i,
                                    points: [
                                        {
                                            x: doc.nodes[e.source].x,
                                            y: doc.nodes[e.source].y,
                                        },
                                        {
                                            x: doc.nodes[e.target].x,
                                            y: doc.nodes[e.target].y,
                                        },
                                    ],
                                    allowedTransform: {
                                        translation: false,
                                        scale: false,
                                        rotate: false,
                                    },
                                })),
                            ],
                            shapes: [
                                L.elems,
                                L.reread((sp, i) => {
                                    const cos = Math.cos(
                                        (-sp.placement.angle / 180) * Math.PI,
                                    );
                                    const sin = Math.sin(
                                        (-sp.placement.angle / 180) * Math.PI,
                                    );

                                    return {
                                        type: "polygon",
                                        points: [
                                            {
                                                x: sp.placement.start.x,
                                                y: sp.placement.start.y,
                                            },
                                            {
                                                x:
                                                    sp.placement.start.x +
                                                    cos * sp.placement.size.x,
                                                y:
                                                    sp.placement.start.y +
                                                    -sin * sp.placement.size.x,
                                            },
                                            {
                                                x:
                                                    sp.placement.start.x +
                                                    cos * sp.placement.size.x +
                                                    sin * sp.placement.size.y,
                                                y:
                                                    sp.placement.start.y +
                                                    -sin * sp.placement.size.x +
                                                    cos * sp.placement.size.y,
                                            },
                                            {
                                                x:
                                                    sp.placement.start.x +
                                                    sin * sp.placement.size.y,
                                                y:
                                                    sp.placement.start.y +
                                                    cos * sp.placement.size.y,
                                            },
                                        ],
                                        id: "shape-" + i,
                                        allowedTransform: {
                                            translation: true,
                                            scale: false,
                                            rotate: true,
                                        },
                                    };
                                }),
                            ],
                            textBoxes: [
                                L.elems,
                                L.reread((sp, i) => {
                                    const cos = Math.cos(
                                        (-sp.angle / 180) * Math.PI,
                                    );
                                    const sin = Math.sin(
                                        (-sp.angle / 180) * Math.PI,
                                    );

                                    return {
                                        type: "polygon",
                                        points: [
                                            {
                                                x: sp.start.x,
                                                y: sp.start.y,
                                            },
                                            {
                                                x: sp.start.x + cos * sp.size.x,
                                                y:
                                                    sp.start.y +
                                                    -sin * sp.size.x,
                                            },
                                            {
                                                x:
                                                    sp.start.x +
                                                    cos * sp.size.x +
                                                    sin * sp.size.y,
                                                y:
                                                    sp.start.y +
                                                    -sin * sp.size.x +
                                                    cos * sp.size.y,
                                            },
                                            {
                                                x: sp.start.x + sin * sp.size.y,
                                                y: sp.start.y + cos * sp.size.y,
                                            },
                                        ],
                                        id: "textbox-" + i,
                                        allowedTransform: {
                                            translation: true,
                                            scale: true,
                                            rotate: true,
                                        },
                                    };
                                }),
                            ],
                            drawings: [
                                L.elems,
                                L.reread((drawing, i) => ({
                                    type: "polyline",
                                    id: "drawing-" + i,
                                    points: drawing.path,
                                    allowedTransform: {
                                        translation: true,
                                        scale: true,
                                        rotate: true,
                                    },
                                })),
                            ],
                        }),
                    ),
                ],
                doc,
            );
        },
        combine({ scale: cameraScale, doc: currentDocumentContent }),
    );

    const selectionExtension = view(
        ({ hit, sel }) => {
            let minX = +Infinity;
            let maxX = -Infinity;
            let minY = +Infinity;
            let maxY = -Infinity;
            let minXPadded = +Infinity;
            let maxXPadded = -Infinity;
            let minYPadded = +Infinity;
            let maxYPadded = -Infinity;
            let allowedTransform = {
                translation: true,
                scale: true,
                rotate: true,
            };

            for (let h = 0; h < hit.length; h++) {
                const ha = hit[h];
                if (sel.indexOf(ha.id) < 0) {
                    continue;
                }

                allowedTransform.translation &&=
                    ha.allowedTransform.translation === true ||
                    (ha.allowedTransform.translation === "multiple" &&
                        sel.length > 1);
                allowedTransform.scale &&=
                    ha.allowedTransform.scale === true ||
                    (ha.allowedTransform.scale === "multiple" &&
                        sel.length > 1);
                allowedTransform.rotate &&=
                    ha.allowedTransform.rotate === true ||
                    (ha.allowedTransform.rotate === "multiple" &&
                        sel.length > 1);

                switch (ha.type) {
                    case "circle":
                        // TODO
                        minX = Math.min(minX, ha.cx);
                        maxX = Math.max(maxX, ha.cx);
                        minY = Math.min(minY, ha.cy);
                        maxY = Math.max(maxY, ha.cy);
                        minXPadded = Math.min(minXPadded, ha.cx - ha.r);
                        maxXPadded = Math.max(maxXPadded, ha.cx + ha.r);
                        minYPadded = Math.min(minYPadded, ha.cy - ha.r);
                        maxYPadded = Math.max(maxYPadded, ha.cy + ha.r);
                        break;
                    case "polygon":
                        for (let p = 0; p < ha.points.length; p++) {
                            minX = Math.min(minX, ha.points[p].x);
                            maxX = Math.max(maxX, ha.points[p].x);
                            minY = Math.min(minY, ha.points[p].y);
                            maxY = Math.max(maxY, ha.points[p].y);
                            minXPadded = Math.min(minXPadded, ha.points[p].x);
                            maxXPadded = Math.max(maxXPadded, ha.points[p].x);
                            minYPadded = Math.min(minYPadded, ha.points[p].y);
                            maxYPadded = Math.max(maxYPadded, ha.points[p].y);
                        }
                        break;
                    case "polyline":
                        for (let p = 0; p < ha.points.length; p++) {
                            minX = Math.min(minX, ha.points[p].x);
                            maxX = Math.max(maxX, ha.points[p].x);
                            minY = Math.min(minY, ha.points[p].y);
                            maxY = Math.max(maxY, ha.points[p].y);
                            minXPadded = Math.min(minXPadded, ha.points[p].x);
                            maxXPadded = Math.max(maxXPadded, ha.points[p].x);
                            minYPadded = Math.min(minYPadded, ha.points[p].y);
                            maxYPadded = Math.max(maxYPadded, ha.points[p].y);
                        }
                        break;
                    default:
                        return false;
                }
            }

            if (isFinite(minX)) {
                return {
                    minX,
                    maxX,
                    minY,
                    maxY,
                    minXPadded,
                    maxXPadded,
                    minYPadded,
                    maxYPadded,
                    allowedTransform,
                };
            } else {
                return null;
            }
        },
        combine({ hit: hitAreas, sel: selection }),
    );

    const translators = {
        nodes: ({ dx, dy }, nodes, sel) =>
            nodes.map((n, i) =>
                sel.indexOf(`node-${i}`) < 0
                    ? n
                    : {
                          ...n,
                          x: n.x + dx,
                          y: n.y + dy,
                      },
            ),
        drawings: ({ dx, dy }, drawings, sel) =>
            drawings.map((d, i) =>
                sel.indexOf(`drawing-${i}`) < 0
                    ? d
                    : {
                          ...d,
                          path: d.path.map(({ x, y }) => ({
                              x: x + dx,
                              y: y + dy,
                          })),
                      },
            ),
        shapes: ({ dx, dy }, shapes, sel) =>
            shapes.map((s, i) =>
                sel.indexOf(`shape-${i}`) < 0
                    ? s
                    : L.modify(
                          ["placement", "start"],
                          ({ x, y }) => ({ x: x + dx, y: y + dy }),
                          s,
                      ),
            ),
    };

    function translateSelected(delta, transient = false) {
        const sel = selection.value;
        update(
            (doc) => {
                return R.mapObjIndexed((entries, key) => {
                    if (translators[key]) {
                        return translators[key](delta, entries, sel);
                    } else {
                        return entries;
                    }
                }, doc);
            },
            transient ? currentDocumentContentMut : currentDocumentContent,
        );
    }

    const scalers = {
        nodes: (factor, pivot, nodes, sel) =>
            nodes.map((n, i) =>
                sel.indexOf(`node-${i}`) < 0
                    ? n
                    : {
                          ...n,
                          x: (n.x - pivot.x) * factor.x + pivot.x,
                          y: (n.y - pivot.y) * factor.y + pivot.y,
                      },
            ),
        drawings: (factor, pivot, drawings, sel) =>
            drawings.map((d, i) =>
                sel.indexOf(`drawing-${i}`) < 0
                    ? d
                    : {
                          ...d,
                          path: d.path.map(({ x, y }) => ({
                              x: (x - pivot.x) * factor.x + pivot.x,
                              y: (y - pivot.y) * factor.y + pivot.y,
                          })),
                      },
            ),
        shapes: (factor, pivot, shapes, sel) =>
            shapes.map((s, i) => {
                return sel.indexOf(`shape-${i}`) < 0
                    ? s
                    : L.modify(
                          ["placement", "start"],
                          ({ x, y }) => ({
                              x: (x - pivot.x) * factor.x + pivot.x,
                              y: (y - pivot.y) * factor.y + pivot.y,
                          }),
                          L.modify(
                              ["placement", "size"],
                              ({ x, y }) => ({
                                  x: x * factor.x || 0.001,
                                  y: y * factor.y || 0.001,
                              }),
                              s,
                          ),
                      );
            }),
    };

    function scaleSelected(factor, pivot, transient = false) {
        const sel = selection.value;
        update(
            (doc) => {
                return R.mapObjIndexed((entries, key) => {
                    if (scalers[key]) {
                        return scalers[key](factor, pivot, entries, sel);
                    } else {
                        return entries;
                    }
                }, doc);
            },
            transient ? currentDocumentContentMut : currentDocumentContent,
        );
    }

    const rotators = {
        nodes: (angle, pivot, nodes, sel) =>
            nodes.map((n, i) =>
                sel.indexOf(`node-${i}`) < 0
                    ? n
                    : {
                          ...n,
                          ...Geo.rotatePivotDegree(pivot, angle, {
                              x: n.x,
                              y: n.y,
                          }),
                      },
            ),
        drawings: (angle, pivot, drawings, sel) =>
            drawings.map((d, i) =>
                sel.indexOf(`drawing-${i}`) < 0
                    ? d
                    : {
                          ...d,
                          path: d.path.map((p) =>
                              Geo.rotatePivotDegree(pivot, angle, p),
                          ),
                      },
            ),
        shapes: (angle, pivot, shapes, sel) =>
            shapes.map((s, i) => {
                return sel.indexOf(`shape-${i}`) < 0
                    ? s
                    : L.modify(
                          ["placement", "start"],
                          (p) => Geo.rotatePivotDegree(pivot, angle, p),
                          L.modify(["placement", "angle"], (a) => a + angle, s),
                      );
            }),
    };

    function rotateSelected(angle, pivot, transient = false) {
        const sel = selection.value;
        update(
            (doc) => {
                return R.mapObjIndexed((entries, key) => {
                    if (scalers[key]) {
                        return rotators[key](angle, pivot, entries, sel);
                    } else {
                        return entries;
                    }
                }, doc);
            },
            transient ? currentDocumentContentMut : currentDocumentContent,
        );
    }

    const newDrawing = view(
        [
            L.appendTo,
            L.removable("path"),
            "path",
            L.setter((n, o) => (n.length > 1 ? n : o)),
        ],
        drawings,
    );
    const newSpline = view([L.appendTo, "path"], splines);
    const newShape = view([L.appendTo], shapes);
    const newGuide = view([L.appendTo], guides);
    const newAxis = view(L.identity, axis);
    const newPlot = view([L.appendTo], plots);
    const newText = view(L.appendTo, textes);
    const newTextBox = view(L.appendTo, textBoxes);
    const newAlert = view([L.appendTo], alerts);
    const newNode = view([L.appendTo, L.required("x", "y")], nodes);
    const newEdge = view([L.appendTo, L.required("x", "y")], edges);
    const newEdgeNode = view(
        L.setter(({ source, newTarget }, content) => ({
            ...content,
            edges: [
                ...(content.edges ?? []),
                { source, target: content.nodes.length },
            ],
            nodes: [...(content.nodes ?? []), newTarget],
        })),
        currentDocumentContent,
    );

    const createDrawing = (val) => {
        newDrawing.value = val;
    };
    const createSpline = (val) => {
        newSpline.value = val;
    };
    const createShape = (val) => {
        newShape.value = val;
    };
    const createGuide = (val) => {
        newGuide.value = val;
    };
    const createAxis = (val) => {
        newAxis.value = val;
    };
    const createPlot = (val) => {
        newPlot.value = val;
    };
    const createText = (val) => {
        newText.value = val;
    };
    const createTextBox = (val) => {
        newTextBox.value = val;
    };
    const createAlert = (val) => {
        newAlert.value = val;
    };
    const createNode = (val) => {
        newNode.value = val;
    };
    const createEdge = (val) => {
        newEdge.value = val;
    };
    const createEdgeNode = (val) => {
        newEdgeNode.value = val;
    };

    function calculateBoundingBox(padding, allEntities, lens) {
        const branch = L.branch(lens);

        const minX = traverse([branch, "x"], L.minimum, allEntities).map(
            R.compose(R.subtract(R.__, padding), R.min(0), R.defaultTo(0)),
        );
        const maxX = traverse([branch, "x"], L.maximum, allEntities).map(
            R.compose(R.add(padding), R.max(0), R.defaultTo(0)),
        );
        const minY = traverse([branch, "y"], L.minimum, allEntities).map(
            R.compose(R.subtract(R.__, padding), R.min(0), R.defaultTo(0)),
        );
        const maxY = traverse([branch, "y"], L.maximum, allEntities).map(
            R.compose(R.add(padding), R.max(0), R.defaultTo(0)),
        );

        return combine({
            minX,
            maxX,
            minY,
            maxY,
        });
    }

    const extension = calculateBoundingBox(100, currentDocumentContent, {
        nodes: L.elems,
        alerts: L.elems,
        drawings: [L.partsOf(L.elems, "path"), L.elems],
        axis: [
            L.ifElse(
                R.is(Object),
                L.pick({
                    start: "start",
                    a: ({ start, size, angle }) =>
                        Geo.rotatePivotDegree(start, angle, {
                            x: start.x + size.x,
                            y: start.y + size.y,
                        }),
                    b: ({ start, size, angle }) =>
                        Geo.rotatePivotDegree(start, angle, {
                            x: start.x,
                            y: start.y + size.y,
                        }),
                    c: ({ start, size, angle }) =>
                        Geo.rotatePivotDegree(start, angle, {
                            x: start.x + size.x,
                            y: start.y,
                        }),
                }),
                R.always({}),
            ),
            L.values,
        ],
        textes: [L.elems, L.props("x", "y")],
        textBoxes: [
            L.elems,
            L.ifElse(
                R.is(Object),
                L.pick({
                    start: "start",
                    a: ({ start, size, angle }) =>
                        Geo.rotatePivotDegree(start, angle, {
                            x: start.x + size.x,
                            y: start.y + size.y,
                        }),
                    b: ({ start, size, angle }) =>
                        Geo.rotatePivotDegree(start, angle, {
                            x: start.x,
                            y: start.y + size.y,
                        }),
                    c: ({ start, size, angle }) =>
                        Geo.rotatePivotDegree(start, angle, {
                            x: start.x + size.x,
                            y: start.y,
                        }),
                }),
                R.always({}),
            ),
            L.values,
        ],
        shapes: [
            L.elems,
            L.ifElse(
                R.is(Object),
                [
                    "placement",
                    L.pick({
                        start: "start",
                        a: ({ start, size, angle }) =>
                            Geo.rotatePivotDegree(start, angle, {
                                x: start.x + size.x,
                                y: start.y + size.y,
                            }),
                        b: ({ start, size, angle }) =>
                            Geo.rotatePivotDegree(start, angle, {
                                x: start.x,
                                y: start.y + size.y,
                            }),
                        c: ({ start, size, angle }) =>
                            Geo.rotatePivotDegree(start, angle, {
                                x: start.x + size.x,
                                y: start.y,
                            }),
                    }),
                ],
                R.always({}),
            ),
            L.values,
        ],
        plots: [
            L.elems,
            L.ifElse(
                R.is(Object),
                L.pick({
                    start: "start",
                    a: ({ start, size, angle }) =>
                        Geo.rotatePivotDegree(start, angle, {
                            x: start.x + size.x,
                            y: start.y + size.y,
                        }),
                    b: ({ start, size, angle }) =>
                        Geo.rotatePivotDegree(start, angle, {
                            x: start.x,
                            y: start.y + size.y,
                        }),
                    c: ({ start, size, angle }) =>
                        Geo.rotatePivotDegree(start, angle, {
                            x: start.x + size.x,
                            y: start.y,
                        }),
                }),
                R.always({}),
            ),
            L.values,
        ],
        splines: [
            L.elems,
            "path",
            L.elems,
            L.ifElse(
                R.is(Object),
                L.pick({
                    point: "point",
                    front: "front",
                    back: "back",
                }),
                R.always({}),
            ),
            L.values,
        ],
    });

    function rotatedBounds(degree, rect) {
        const rectCenterX = (rect.maxX + rect.minX) / 2;
        const rectCenterY = (rect.maxY + rect.minY) / 2;
        const halfWidth = (rect.maxX - rect.minX) / 2;
        const halfHeight = (rect.maxY - rect.minY) / 2;

        const c1 = Geo.rotateDegree(degree, { x: halfWidth, y: halfHeight });
        const c2 = Geo.rotateDegree(degree, { x: -halfWidth, y: halfHeight });
        const c3 = Geo.rotateDegree(degree, { x: halfWidth, y: -halfHeight });
        const c4 = Geo.rotateDegree(degree, { x: -halfWidth, y: -halfHeight });

        const halfWidthRot = Math.max(
            Math.abs(c1.x),
            Math.abs(c2.x),
            Math.abs(c3.x),
            Math.abs(c4.x),
        );
        const halfHeightRot = Math.max(
            Math.abs(c1.y),
            Math.abs(c2.y),
            Math.abs(c3.y),
            Math.abs(c4.y),
        );

        return {
            angle: degree,
            minX: rectCenterX - halfWidthRot,
            maxX: rectCenterX + halfWidthRot,
            minY: rectCenterY - halfHeightRot,
            maxY: rectCenterY + halfHeightRot,
        };
    }

    function rotatedClamp(rect, pos, padding) {
        const rectCenterX = (rect.maxX + rect.minX) / 2;
        const rectCenterY = (rect.maxY + rect.minY) / 2;
        const halfWidthRot = (rect.maxX - rect.minX) / 2 + padding;
        const halfHeightRot = (rect.maxY - rect.minY) / 2 + padding;

        const posRelX = pos.x - rectCenterX;
        const posRelY = pos.y - rectCenterY;

        const posRot = Geo.rotateDegree(-rect.angle, {
            x: posRelX,
            y: posRelY,
        });
        const posRotClampedX = R.clamp(-halfWidthRot, +halfWidthRot, posRot.x);
        const posRotClampedY = R.clamp(
            -halfHeightRot,
            +halfHeightRot,
            posRot.y,
        );

        const posClamped = Geo.rotateDegree(rect.angle, {
            x: posRotClampedX,
            y: posRotClampedY,
        });

        return {
            x: rectCenterX + posClamped.x,
            y: rectCenterY + posClamped.y,
        };
    }

    const cameraBounds = read(
        ({ c, e }) => {
            return rotatedBounds(c.focus.w, e);
        },
        combine({ c: camera, e: extension }),
    );

    const zoomFrame = view(cameraZoomFrameLens, camera);
    const panMovement = view(panMovementLens, camera);
    const rotateMovement = view(rotateMovementLens, camera);
    const zoomMovement = view(zoomMovementLens, camera);
    const rotationState = atom({});
    const panState = atom({});
    const zoomState = atom({});
    const lockScroll = view(
        [
            L.choices(
                ["rot", "pivot"],
                ["zoom", "pivotWorld"],
                ["pan", "position"],
            ),
            R.compose(R.not, R.isNil),
        ],
        combine({
            rot: rotationState,
            zoom: zoomState,
            pan: panState,
        }),
    );

    const tools = {
        none: {
            name: "None",
            component: Blocker,
            parameters: {
                frameBoxPath,
            },
        },
        select: {
            name: "Select",
            component: RubberBand,
            parameters: {
                clientToCanvas,
                frameBoxPath,
                rotationTransform,
                cameraOrientation,
                cameraScale,
            },
        },
        createNode: {
            name: "Node",
            component: NodeCreator,
            parameters: {
                clientToCanvas,
                frameBoxPath,
                createNode,
                rotationTransform,
                cameraScale,
                cameraTow,
            },
        },
        createEdge: {
            name: "Edge",
            component: EdgeCreator,
            parameters: {
                clientToCanvas,
                frameBoxPath,
                rotationTransform,
                cameraScale,
                cameraTow,
                nodes,
                createEdge,
                createEdgeNode,
            },
        },
        text: {
            name: "Text Line",
            component: TextLineTyper,
            parameters: {
                createText,
                clientToCanvas,
                frameBoxPath,
                rotationTransform,
                cameraScale,
                cameraOrientation,
            },
        },
        text_box: {
            name: "Text Box",
            component: TextBoxTyper,
            parameters: {
                textes,
                clientToCanvas,
                frameBoxPath,
                rotationTransform,
                cameraScale,
                cameraOrientation,
                createTextBox,
            },
        },
        lasso: {
            name: "Lasso",
            component: Lasso,
            parameters: {
                clientToCanvas,
                frameBoxPath,
                cameraScale,
                rotationTransform,
            },
        },
        affineTansformer: {
            name: "Transform",
            component: AffineTansformer,
            parameters: {
                cameraScale,
                selectionExtension,
                rotationTransform,
                clientToCanvas,
                translateSelected,
                scaleSelected,
                rotateSelected,
                frameBoxPath,
            },
        },
        pen: {
            name: "Pen",
            component: Pen,
            parameters: {
                clientToCanvas,
                frameBoxPath,
                cameraScale,
                rotationTransform,
                createDrawing,
            },
        },
        polygon: {
            name: "Polygon",
            component: Polygon,
            parameters: {
                clientToCanvas,
                frameBoxPath,
                cameraScale,
                rotationTransform,
                createDrawing,
            },
        },
        spline: {
            name: "Spline",
            component: Spline,
            parameters: {
                clientToCanvas,
                frameBoxPath,
                cameraScale,
                rotationTransform,
                createSpline,
            },
        },
        shape: {
            name: "Shape",
            component: Shape,
            parameters: {
                clientToCanvas,
                frameBoxPath,
                cameraScale,
                rotationTransform,
                cameraOrientation,
                createShape,
            },
        },
        magnifier: {
            name: "Magnifier",
            component: Magnifier,
            parameters: {
                frameBoxPath,
                clientToCanvas,
                zoomDelta,
                zoomFrame,
                rotationTransform,
                cameraRotationLens,
                cameraOrientation,
                cameraScale,
            },
        },
        guides: {
            name: "Guides",
            component: GuideLiner,
            parameters: {
                frameBoxPath,
                clientToCanvas,
                rotationTransform,
                frameBoxObject,
                createGuide,
                cameraScale,
                cameraOrientation,
            },
        },
        axis: {
            name: "Axis",
            component: Axis,
            parameters: {
                frameBoxPath,
                clientToCanvas,
                rotationTransform,
                createAxis,
                cameraScale,
                cameraOrientation,
            },
        },
        plot: {
            name: "Plot",
            component: PlotCreator,
            parameters: {
                frameBoxPath,
                clientToCanvas,
                rotationTransform,
                createPlot,
                cameraScale,
                cameraOrientation,
            },
        },
        pan: {
            name: "Pan",
            component: Pan,
            parameters: {
                frameBoxPath,
                clientToCanvas,
                panMovement,
                state: panState,
            },
        },
        rotate: {
            name: "Rotate",
            component: Rotate,
            parameters: {
                frameBoxPath,
                clientToCanvas,
                rotateMovement,
                rotationTransform,
                cameraScale,
                state: rotationState,
            },
        },
        zoom: {
            name: "Zoom",
            component: Zoom,
            parameters: {
                frameBoxPath,
                clientToCanvas,
                zoomMovement,
                rotationTransform,
                cameraScale,
                state: zoomState,
            },
        },
    };

    const toolGroups = [
        ["select", "lasso", "affineTansformer"],
        ["magnifier", "pan", "rotate", "zoom"],
        ["pen", "polygon", "spline"],
        ["createNode", "createEdge"],
        ["text", "text_box", "shape"],
        ["axis", "plot", "guides"],
    ];

    const makeSquareLens = L.lens(R.identity, (n, o) => ({
        ...n,
        x: Math.min(n.x, n.y),
        y: Math.min(n.x, n.y),
    }));

    const keepAspectLens = (xprop, yprop) =>
        L.lens(R.identity, (n, o) => {
            const oldAspect = yprop(o) / xprop(o);

            return {
                ...n,
                x: xprop(n),
                y: xprop(n) * oldAspect,
            };
        });

    const makeXSquareLens = L.lens(R.identity, (n, o) => ({
        ...n,
        x: n.y,
        y: n.y,
    }));

    const aspect = view(
        [
            "frame",
            L.props("alignX", "alignY", "aspect"),
            "aspect",
            L.defaults("none"),
        ],
        camera,
    );
    const planeWidth = view(["plane", "x"], camera);
    const planeHeight = view(["plane", "y"], camera);
    const alignX = view(["frame", "alignX", L.normalize(U.capitalize)], camera);
    const alignY = view(["frame", "alignY", L.normalize(U.capitalize)], camera);
    const alignCombi = view(aspectRatioAlignLens, combine({ alignX, alignY }));
    const autosize = view(["plane", "autosize"], camera);
    const alignments = ["Min", "Mid", "Max"];

    const cameraJson = failableView(
        L.inverse([
            L.alternatives(
                L.dropPrefix(
                    "// Or try to edit this Json (only edits that keep the structure valid are possible)\n",
                ),
                L.identity,
            ),
            L.json({ space: "  " }),
            L.ifElse(
                U.isPlainObject,
                L.identity,
                L.getter(R.always(new Error("fooo"))),
            ),
        ]),
        camera,
    );

    const canvasJson = failableView(
        L.inverse([
            L.alternatives(
                L.dropPrefix(
                    "// Or try to edit this Json (only edits that keep the structure valid are possible)\n",
                ),
                L.identity,
            ),
            L.json({ space: "  " }),
            L.ifElse(
                U.isPlainObject,
                L.identity,
                L.getter(R.always(new Error("fooo"))),
            ),
        ]),
        canvasDocument,
    );

    const scrollWindowSize = view(
        [
            L.lens(R.prop("frame"), (newSize) => ({
                frame: newSize,
                plane: newSize,
            })),
        ],
        combine({
            plane: view(
                [
                    "plane",
                    L.ifElse(
                        R.prop("autosize"),
                        L.identity,
                        L.lens(R.identity, (_, o) => o),
                    ),
                    L.props("x", "y"),
                ],
                camera,
            ),
            frame: view(["frame", "size"], camera),
        }),
    );

    const cameraInBounds = view(
        L.lens(
            ({ x, y, s, w, b, ls }) => {
                const rot = Geo.rotatePivotXYDegree(
                    (b.minX + b.maxX) / 2,
                    (b.minY + b.maxY) / 2,
                    b.angle,
                    { x, y },
                );

                return {
                    x: (rot.x - b.minX) / s - w.x / 2,
                    y: (rot.y - b.minY) / s - w.y / 2,
                    ls,
                };
            },
            ({ x, y }, { s, w, b, ls }) => {
                const rot = Geo.rotatePivotXYDegree(
                    (b.minX + b.maxX) / 2,
                    (b.minY + b.maxY) / 2,
                    -b.angle,
                    {
                        x: (x + w.x / 2) * s + b.minX,
                        y: (y + w.y / 2) * s + b.minY,
                    },
                );

                return {
                    x: rot.x,
                    y: rot.y,
                    ls,
                };
            },
        ),
        combine(
            {
                x: cameraX,
                y: cameraY,
                s: cameraScale,
                w: scrollWindowSize,
                b: cameraBounds,
                ls: lockScroll,
            },
            { x: true, y: true },
        ),
    );

    const centerLens = L.reread(({ minX, maxX, minY, maxY }) => ({
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
    }));
    const boundsCenter = view(centerLens, cameraBounds);

    const scrollPosition = view(
        [
            L.pick({ x: ["x"], y: ["y"] }),
            L.setter((newScroll, old) =>
                old.ls
                    ? old
                    : {
                          x:
                              (newScroll.atMinX && old.x < newScroll.x) ||
                              (newScroll.atMaxX && old.x > newScroll.x)
                                  ? old.x
                                  : newScroll.x,
                          y:
                              (newScroll.atMinY && old.y < newScroll.y) ||
                              (newScroll.atMaxY && old.y > newScroll.y)
                                  ? old.y
                                  : newScroll.y,
                      },
            ),
        ],
        cameraInBounds,
    );

    const scrollContentSize = view(
        ({ s, w, b }) => ({
            x: (b.maxX - b.minX) / s,
            y: (b.maxY - b.minY) / s,
        }),
        combine({
            s: cameraScale,
            b: cameraBounds,
        }),
    );

    const camClient = view(["focus", L.props("x", "y"), worldPageIso], camera);
    const camClientX = view("x", camClient);
    const camClientY = view("y", camClient);

    $effect(() => {
        document.body.classList.toggle("noScroll", fullPageCanvas.value);
    });

    function requestFullScreen() {
        if (canFullScreen.value) {
            fullScreenContainer.value.requestFullscreen().catch((err) => {
                alert(
                    `Error attempting to enable fullscreen mode: ${err.message} (${err.name})`,
                );
            });
        }
    }

    const ToolComponent = $derived(tools[tool.value].component);
</script>

<div class="container">
    <div class="beside">
        <fieldset>
            <legend>Frame</legend>

            <div class="checkbox-list">
                <label class="checkbox-list-item"
                    ><input
                        class="checkbox-list-control"
                        type="checkbox"
                        bind:checked={autosize.value}
                    /><span class="checkbox-list-item-label">Autofit</span
                    ></label
                >

                <label class="checkbox-list-item"
                    ><input
                        class="checkbox-list-control"
                        type="checkbox"
                        value={true}
                        bind:checked={debugFrames.value}
                    />
                    <span class="checkbox-list-item-label"
                        >Show Debug Frames</span
                    ></label
                >

                <label class="checkbox-list-item"
                    ><input
                        class="checkbox-list-control"
                        type="checkbox"
                        value={true}
                        bind:checked={showBounds.value}
                    />
                    <span class="checkbox-list-item-label"
                        >Show Paper Bounds</span
                    ></label
                >
            </div>

            <div>
                <label class="number-picker"
                    ><span class="number-picker-label">Camera Width:</span
                    ><input
                        type="range"
                        min="100"
                        max="1500"
                        class="number-picker-slider"
                        bind:value={planeWidth.value}
                        disabled={autosize.value}
                    /></label
                >
                <label class="number-picker"
                    ><span class="number-picker-label">Camera Height:</span
                    ><input
                        type="range"
                        min="100"
                        max="1500"
                        class="number-picker-slider"
                        bind:value={planeHeight.value}
                        disabled={autosize.value}
                    /></label
                >
            </div>

            <div class="checkbox-list">
                <span class="checkbox-list-label">Aspect:</span>
                <label class="checkbox-list-item"
                    ><input
                        type="radio"
                        value="meet"
                        class="checkbox-list-control"
                        bind:group={aspect.value}
                        disabled={autosize.value}
                    /> <span class="checkbox-list-item-label">meet</span></label
                >
                <label class="checkbox-list-item"
                    ><input
                        type="radio"
                        value="slice"
                        class="checkbox-list-control"
                        bind:group={aspect.value}
                        disabled={autosize.value}
                    />
                    <span class="checkbox-list-item-label">slice</span></label
                >
                <label class="checkbox-list-item"
                    ><input
                        type="radio"
                        value="none"
                        class="checkbox-list-control"
                        bind:group={aspect.value}
                        disabled={autosize.value}
                    /> <span class="checkbox-list-item-label">none</span></label
                >
            </div>
            <!-- <div>
		Align-X:
		{#each alignments as a (a)}
			<label
				><input type="radio" value={a} bind:group={alignX.value} />
				{a}</label
			>
		{/each}
	</div>
	<div>
		Align-Y:
		{#each alignments as a (a)}
			<label
				><input type="radio" value={a} bind:group={alignY.value} />
				{a}</label
			>
		{/each}
	</div> -->

            Alignment:
            <div class="alignment-grid">
                {#each alignments as ay (ay)}
                    {#each alignments as ax (ax)}
                        <label tabindex="-1" class="alignment-grid-label"
                            ><input
                                disabled={autosize.value}
                                type="radio"
                                value={`x${ax}Y${ay}`}
                                bind:group={alignCombi.value}
                            />
                            x{ax}Y{ay}</label
                        >
                    {/each}
                {/each}
            </div>

            Auto-Padding:
            <div>
                <label
                    ><input
                        type="checkbox"
                        bind:checked={cameraAutoPadding.value}
                    /> Extend Scrollbars</label
                >
                <br />

                <div class={{ fullPageCorner: fullPageCanvas.value }}>
                    <label
                        ><input
                            type="checkbox"
                            bind:checked={fullPageCanvas.value}
                        /> Stretch to Page</label
                    >

                    <button
                        type="button"
                        disabled={!canFullScreen.value}
                        onclick={requestFullScreen}>Full Screen</button
                    >
                </div>
            </div>
        </fieldset>

        <fieldset>
            <legend>Focus</legend>

            <div>
                <label class="number-picker"
                    ><span class="number-picker-label">X:</span>
                    <input
                        class="number-picker-slider"
                        type="range"
                        bind:value={cameraXFormatted.value}
                        min={cameraBounds.value.minX}
                        max={cameraBounds.value.maxX}
                        step="0.1"
                    />
                    <button
                        type="button"
                        class="number-picker-button"
                        onclick={(_) => {
                            cameraXFormatted.value = 0;
                        }}>reset</button
                    >
                    <output class="number-picker-value"
                        >{cameraXFormatted.value}</output
                    >
                </label>
                <label class="number-picker"
                    ><span class="number-picker-label">Y:</span>
                    <input
                        class="number-picker-slider"
                        type="range"
                        bind:value={cameraYFormatted.value}
                        min={cameraBounds.value.minY}
                        max={cameraBounds.value.maxY}
                        step="0.1"
                    />
                    <button
                        type="button"
                        class="number-picker-button"
                        onclick={(_) => {
                            cameraYFormatted.value = 0;
                        }}>reset</button
                    >
                    <output class="number-picker-value"
                        >{cameraYFormatted.value}</output
                    >
                </label>
                <label class="number-picker"
                    ><span class="number-picker-label">Zoom:</span>
                    <input
                        class="number-picker-slider"
                        type="range"
                        bind:value={cameraZoomFormatted.value}
                        min="-5"
                        max="5"
                        step="0.01"
                    />
                    <button
                        type="button"
                        class="number-picker-button"
                        onclick={(_) => {
                            cameraZoomFormatted.value = 0;
                        }}>reset</button
                    >
                    <output class="number-picker-value"
                        >{cameraZoomFormatted.value}</output
                    >
                </label>
                <label class="number-picker"
                    ><span class="number-picker-label">Rotation:</span>
                    <input
                        class="number-picker-slider"
                        type="range"
                        bind:value={cameraAngleFormatted.value}
                        min="-180"
                        max="180"
                        step="0.01"
                    />
                    <button
                        type="button"
                        class="number-picker-button"
                        onclick={(_) => {
                            cameraAngleFormatted.value = 0;
                        }}>reset</button
                    >
                    <output class="number-picker-value"
                        >{cameraAngleFormatted.value}</output
                    >
                </label>

                <hr class="form-ruler" />
                <label class="number-picker"
                    ><span class="number-picker-label">Scroll X:</span>
                    <input
                        class="number-picker-slider"
                        type="range"
                        bind:value={cameraXScreenFormatted.value}
                        min={cameraBounds.value.minX - cameraBounds.value.maxX}
                        max={cameraBounds.value.maxX - cameraBounds.value.minX}
                        step="0.1"
                    />
                    <button
                        type="button"
                        class="number-picker-button"
                        onclick={(_) => {
                            cameraXScreenFormatted.value = 0;
                        }}>reset</button
                    >
                    <output class="number-picker-value"
                        >{cameraXScreenFormatted.value}</output
                    >
                </label>
                <label class="number-picker"
                    ><span class="number-picker-label">Scroll Y:</span>
                    <input
                        class="number-picker-slider"
                        type="range"
                        bind:value={cameraYScreenFormatted.value}
                        min={cameraBounds.value.minY - cameraBounds.value.maxY}
                        max={cameraBounds.value.maxY - cameraBounds.value.minY}
                        step="0.1"
                    />
                    <button
                        type="button"
                        class="number-picker-button"
                        onclick={(_) => {
                            cameraYScreenFormatted.value = 0;
                        }}>reset</button
                    >
                    <output class="number-picker-value"
                        >{cameraYScreenFormatted.value}</output
                    >
                </label>
            </div>

            <hr class="form-ruler" />
            <div class="button-bar">
                <button
                    type="button"
                    onclick={(_) => {
                        update(L.set(["focus", L.values], 0), camera);
                    }}>Reset all to zero</button
                ><button
                    type="button"
                    onclick={(_) => {
                        update(
                            L.set(["focus", L.props("x", "y")], { x: 0, y: 0 }),
                            camera,
                        );
                    }}>re-Center to Origin</button
                ><button
                    type="button"
                    onclick={(_) => {
                        update(
                            L.set(
                                ["focus", L.props("x", "y")],
                                boundsCenter.value,
                            ),
                            camera,
                        );
                    }}>re-Center Content</button
                ><button
                    type="button"
                    onclick={(_) => {
                        update(L.set(["focus", "w"], 0), camera);
                    }}>re-Orient Upwards</button
                ><button
                    type="button"
                    onclick={(_) => {
                        update(
                            L.set(["focus", L.props("z", "x", "y", "w")], {
                                x:
                                    (cameraBounds.value.maxX +
                                        cameraBounds.value.minX) /
                                    2,
                                y:
                                    (cameraBounds.value.maxY +
                                        cameraBounds.value.minY) /
                                    2,
                                z: -Math.max(
                                    Math.log(
                                        cameraBounds.value.maxX -
                                            cameraBounds.value.minX,
                                    ) - Math.log(camera.value.plane.x),
                                    Math.log(
                                        cameraBounds.value.maxY -
                                            cameraBounds.value.minY,
                                    ) - Math.log(camera.value.plane.y),
                                ),
                                w: cameraBounds.value.angle,
                            }),
                            camera,
                        );
                    }}>re-Fit to Content</button
                >
            </div>
            <hr class="form-ruler" />

            <div>
                <label class="number-picker"
                    ><span class="number-picker-label">Grid Size:</span>
                    <input
                        type="range"
                        class="number-picker-slider"
                        bind:value={gridDistance.value}
                        min={0}
                        max={512}
                        step="32"
                    />
                    <button
                        type="button"
                        class="number-picker-button"
                        onclick={(_) => {
                            gridDistance.value = 32;
                        }}>reset</button
                    >
                    <output class="number-picker-value"
                        >{gridDistance.value}</output
                    >
                </label>
            </div>
        </fieldset>
    </div>

    <Tabs {newTab} {tabIds} {closeTab} {currentTabId} {allTabs} />

    <History {canvasUndoIndex} {canvasRedoIndex} />

    <fieldset>
        <legend>Tools</legend>

        <div class="tool-bar">
            <button
                type="button"
                onclick={() => {
                    currentDocumentContent.value = {};

                    if (
                        currentToolElement.value &&
                        currentToolElement.value.cancel
                    ) {
                        currentToolElement.value.cancel();
                    }

                    update(
                        L.set(["focus", L.props("x", "y"), L.values], 0),
                        camera,
                    );
                }}>Clear</button
            >
            <hr class="tool-bar-sep" />
            <label class="button tool-button"
                ><input
                    class="tool-button-radio"
                    type="radio"
                    bind:group={tool.value}
                    value={"none"}
                />
                None</label
            >
            {#each toolGroups as g}
                <hr class="tool-bar-sep" />
                {#each g as t}
                    <label class="button tool-button"
                        ><input
                            class="tool-button-radio"
                            type="radio"
                            bind:group={tool.value}
                            value={t}
                        />
                        {tools[t].name}</label
                    >
                {/each}
            {/each}
            <button
                type="button"
                class="button tool-button"
                onclick={() =>
                    createAlert({
                        ...cameraFocus.value,
                        msg: "Test Error",
                    })}>Error</button
            >
        </div>
    </fieldset>

    <fieldset>
        <legend>{tools[tool.value].name}</legend>

        <div>
            {#if currentToolElement.value && currentToolElement.value.canCancel && currentToolElement.value.cancel}
                <button
                    type="button"
                    class="tool-action"
                    disabled={!currentToolElement.value.canCancel.value}
                    onpointerdown={(evt) => {
                        if (!evt.isPrimary) {
                            evt.currentTarget.click();
                        }
                    }}
                    onclick={() => {
                        currentToolElement.value.cancel();
                    }}>Cancel</button
                >
            {/if}
        </div>
    </fieldset>

    <Properties properties={defaultProperties} />

    <div
        class={[
            "prevent-selection",
            { fullPageFill: fullPageCanvas.value || isFullScreen.value },
        ]}
        bind:this={fullScreenContainer.value}
    >
        <Dropper
            {clientToCanvas}
            {cameraScale}
            {cameraOrientation}
            {createText}
            {createNode}
            {createShape}
        >
            <Scroller
                allowOverscroll={false}
                alignment="center"
                extraScrollPadding={cameraAutoPadding}
                {scrollPosition}
                contentSize={scrollContentSize}
                {scrollWindowSize}
            >
                <svg
                    class="canvas"
                    bind:this={svgElement.value}
                    viewBox={viewBox.value}
                    preserveAspectRatio={preserveAspectRatio.value}
                    tabindex="-1"
                    role="button"
                    onkeydown={(evt) => {
                        if (evt.key === "Escape") {
                            selection.value = [];
                        }
                    }}
                >
                    <Navigator
                        {camera}
                        {frameBoxPath}
                        {cameraTow}
                        errorHandler={createAlert}
                    >
                        <ClickPicker
                            {hitAreas}
                            {selection}
                            {rotationTransform}
                            {clientToCanvas}
                            {cameraScale}
                            {frameBoxPath}
                        >
                            <g
                                class={{ hidden: !debugFrames.value }}
                                pointer-events="none"
                            >
                                <path
                                    d={viewBoxPath.value}
                                    class="view-box"
                                    stroke-opacity="0.5"
                                    stroke="magenta"
                                    vector-effect="non-scaling-stroke"
                                    stroke-width="8px"
                                    fill="#ddffee"
                                />
                                <path
                                    d={frameBoxPath.value}
                                    stroke="#ff88cc"
                                    fill="none"
                                    vector-effect="non-scaling-stroke"
                                    stroke-width="14px"
                                    shape-rendering="crispEdges"
                                />
                            </g>

                            <g pointer-events="none">
                                <Bounds
                                    show={showBounds}
                                    {extension}
                                    {cameraBounds}
                                    {rotationTransform}
                                    {cameraScale}
                                />
                                <Grid
                                    {frameBoxPath}
                                    {frameBoxObject}
                                    {rotationTransform}
                                    {cameraScale}
                                    {gridDistance}
                                />
                                <EdgesDef
                                    {nodes}
                                    {edges}
                                    {rotationTransform}
                                    {cameraScale}
                                />
                                <NodesDef {nodes} {cameraScale} />

                                <DrawingsDef
                                    {drawings}
                                    {rotationTransform}
                                    {cameraScale}
                                />

                                <SplinesDef
                                    {splines}
                                    {rotationTransform}
                                    {cameraScale}
                                />

                                <TextBoxesDef
                                    {textBoxes}
                                    {clientToCanvas}
                                    {frameBoxPath}
                                    {rotationTransform}
                                    {cameraScale}
                                    {cameraOrientation}
                                />

                                <TextLinesDef
                                    {textes}
                                    {clientToCanvas}
                                    {frameBoxPath}
                                    {rotationTransform}
                                    {cameraScale}
                                    {cameraOrientation}
                                />

                                <Guides
                                    {guides}
                                    {frameBoxObject}
                                    {rotationTransform}
                                    {cameraScale}
                                />
                                <ShapesDef
                                    {shapes}
                                    {frameBoxObject}
                                    {rotationTransform}
                                    {cameraScale}
                                />
                                <ShowAxis
                                    {axis}
                                    {frameBoxObject}
                                    {rotationTransform}
                                    {cameraScale}
                                />
                                <ShowPlots
                                    {plots}
                                    {frameBoxObject}
                                    {rotationTransform}
                                    {cameraScale}
                                />

                                <!-- <NodesUse {nodes} {rotationTransform} />
							<ShapesUse {shapes} {rotationTransform} /> -->
                                <g
                                    pointer-events="none"
                                    transform={rotationTransform.value}
                                >
                                    <!-- <image
										x="-250"
										y="-250"
										width="500"
										height="500"
										xlink:href="https://renew-editor.laszlokorte.de/db_schema.svg"
									/> -->
                                    <LayeredUse {zLayers} {rotationTransform} />
                                </g>

                                <Origin {rotationTransform} {cameraScale} />
                            </g>

                            <ToolComponent
                                bind:this={currentToolElement.value}
                                {...tools[tool.value].parameters}
                            ></ToolComponent>

                            {#if currentToolElement.value?.allowAffineTransform}
                                <AffineTansformer
                                    {cameraScale}
                                    {selectionExtension}
                                    {rotationTransform}
                                    {clientToCanvas}
                                    {translateSelected}
                                    {scaleSelected}
                                    {rotateSelected}
                                    {frameBoxPath}
                                />
                            {/if}

                            <Ruler
                                {frameBoxPath}
                                {frameBoxObject}
                                {rotationTransform}
                                {cameraScale}
                            />

                            <ShowAlert
                                {alerts}
                                {frameBoxObject}
                                {rotationTransform}
                                {cameraOrientation}
                                {cameraScale}
                                {cameraFocus}
                            />
                        </ClickPicker>
                    </Navigator>
                </svg>
                <!--
		<canvas
			bind:this={bitmapCanvas.value}
			class="canvas bitmap-canvas"
			use:adjustSize={read(
				R.map(R.multiply(window.devicePixelRatio)),
				scrollWindowSize,
			)}
		></canvas>
 -->
                <div class="scroller-hud">
                    <input
                        type="range"
                        bind:value={cameraZoom.value}
                        min={cameraZoomMin.value}
                        max="5"
                        step="0.01"
                    />
                </div>

                <div class="scroller-hud-minimap">
                    <Minimap
                        {extension}
                        {frameBoxPath}
                        {cameraFocus}
                        {rotationInverseTransform}
                        {rotationTransform}
                    >
                        <LayeredUse {zLayers} {rotationTransform} />
                    </Minimap>
                </div>
            </Scroller>
        </Dropper>
    </div>

    <div class="beside">
        <Droppables properties={defaultProperties} />
        <Bookmarker current={cameraFocus} entries={bookmarks} />
    </div>

    {#if debugFrames.value}
        <div
            class="debug-dot"
            style:left="{Math.round(camClientX.value)}px"
            style:top="{Math.round(camClientY.value)}px"
        ></div>
    {/if}

    <div class="beside">
        <div>
            <h3>Camera Parameter</h3>
            <textarea use:bindValue={cameraJson.stableAtom}></textarea>
        </div>

        <div>
            <h3>Drawing</h3>
            <textarea use:bindValue={canvasJson.stableAtom}></textarea>
        </div>
    </div>
</div>

<style>
    .scroller-hud {
        grid-area: 1/1/1/1;
        place-self: end;
        z-index: 100;
        background: none;
        font-size: 0.7em;
        margin: 0.5em 1em;
        --accent-color: #aa4466;
        --accent-color-light: #cc4466;
        user-select: none;
        -webkit-user-select: none;
        touch-action: manipulation;

        -webkit-touch-callout: none;
        -webkit-user-callout: none;
        -webkit-user-select: none;
        -webkit-user-drag: none;
        -webkit-user-modify: none;
        -webkit-highlight: none;
    }

    .scroller-hud-minimap {
        position: absolute; /*needed for SVG overflow, not sure why yet*/
        grid-area: 1/1/1/1;
        align-self: start;
        justify-self: end;
        width: 30%;
        height: 30%;
        z-index: 100;
        background: none;
        font-size: 0.7em;
        margin: 0.5em;
        margin-top: 2em;
        user-select: none;
        -webkit-user-select: none;
        touch-action: manipulation;
        pointer-events: none;

        -webkit-touch-callout: none;
        -webkit-user-callout: none;
        -webkit-user-select: none;
        -webkit-user-drag: none;
        -webkit-user-modify: none;
        -webkit-highlight: none;
    }

    .prevent-selection {
        user-select: none;
        -webkit-user-select: none;
        touch-action: manipulation;
    }

    legend {
        user-select: none;
        -webkit-user-select: none;
        touch-action: manipulation;
    }

    .canvas {
        display: block;
        grid-area: 1/1/1/1;
        place-self: stretch;
        width: 100%;
        height: 100%;
        position: absolute;
        user-select: none;
        -webkit-user-select: none;
        touch-action: none;

        -webkit-touch-callout: none;
        -webkit-user-callout: none;
        -webkit-user-select: none;
        -webkit-user-drag: none;
        -webkit-user-modify: none;
        -webkit-highlight: none;
    }

    /*.bitmap-canvas {
		display: block;
		width: 100%;
		height: 100%;
		pointer-events: none;
		background: none;
		border: none;
	}*/

    textarea {
        min-height: 30em;
    }

    .alignment-grid {
        display: grid;
        grid-template-rows: 1fr 1fr 1fr;
        grid-template-columns: 1fr 1fr 1fr;
        width: max-content;
        gap: 2px;
        font-family: monospace;
        user-select: none;
    }

    .alignment-grid-label:has(:focus-visible) {
        outline: 2px solid #dd4e40;
    }

    .alignment-grid-label:hover {
        color: #888;
        background: #f8f8f8;
    }

    .alignment-grid-label:active {
        color: #666;
        background: #e0e0e0;
    }

    .alignment-grid-label:has(:checked) {
        background: #dd4e40;
        color: #fff;
    }

    .alignment-grid-label:has(:checked):hover {
        background: #ed5e50;
        color: #fff;
    }

    .alignment-grid-label:has(:checked):active {
        background: #cd3e30;
        color: #fff;
    }

    .alignment-grid-label:has(:disabled) {
        background: #ddd;
        color: #aaa;
        cursor: default;
    }

    .alignment-grid-label:has(:disabled):hover {
        background: #ddd;
        color: #aaa;
    }

    .alignment-grid-label {
        color: #666;
        background: #eee;
        padding: 4px;
        text-align: center;
        cursor: pointer;
    }

    .alignment-grid-label > input {
        background: transparent;
        color: transparent;
        border: none;
        opacity: 0;
        width: 0;
        height: 0;
        padding: 0;
        display: block;
        position: absolute;
    }

    .hidden {
        display: none;
    }

    output {
        font-size: 1em;
        font-family: monospace;
    }

    .tool-bar {
        display: flex;
        flex-wrap: wrap;
        gap: 2px;
        align-items: stretch;
        font-family: monospace;
        -webkit-user-select: none;
        user-select: none;
        --webkit-user-callout: none;
    }

    .button-bar {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5ex 1ex;
    }

    .tool-bar-sep {
        background: #aaa;
        flex: 2px 0 0;
        width: auto;
        height: auto;
        align-self: stretch;
        justify-self: start;
        border: none;
        margin: 2px;
    }

    .tool-button {
        background: #555;
        user-select: none;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
    }

    .tool-button:has(:checked):not(:disabled),
    .tool-button:has(:checked):not(:disabled):active,
    .tool-button:has(:checked):not(:disabled):focus-visible,
    .tool-button:has(:checked):not(:disabled):focus,
    .tool-button:has(:checked):disabled,
    .tool-button:has(:checked):disabled:active,
    .tool-button:has(:checked):disabled:focus-visible,
    .tool-button:has(:checked):disabled:focus {
        background: #cd3e30 !important;
        color: #fff;
    }

    .tool-button-radio {
        background: transparent;
        color: transparent;
        border: none;
        opacity: 0;
        width: 0;
        height: 0;
        padding: 0;
        display: block;
        position: absolute;
    }

    .tool-action:disabled,
    .tool-action:disabled:active,
    .tool-action:disabled:focus-visible,
    .tool-action:disabled:focus {
        background: #999;
    }

    .tool-action,
    .tool-action:active,
    .tool-action:focus-visible,
    .tool-action:focus {
        user-select: none;
        touch-action: manipulation;
        background: #333;
        color: #fff;
        -webkit-tap-highlight-color: transparent;
    }

    .debug-dot {
        z-index: 1000;
        pointer-events: none;
        opacity: 0.5;
        position: absolute;
        width: 6px;
        height: 6px;
        margin: -4px 0 0 -4px;
        background: magenta;
        border: 1px solid white;
    }
    .container {
        user-select: none;
        -webkit-user-select: none;
        touch-action: pan-x pan-y;
    }
    .fullPageCorner {
        position: fixed;
        top: 1em;
        left: 1em;
        z-index: 90000;
    }

    .fullPageFill {
        background: white;
        position: fixed;
        inset: 0;
        display: grid;
        place-content: stretch;
        place-items: stretch;
        z-index: 10000;
    }

    .fullPageFill :global(.scroller) {
        resize: none !important;
        height: 100% !important;
        width: 100% !important;
        border: 0;
    }

    :global(.noScroll) {
        overflow: hidden;
        touch-action: none;
    }
</style>
