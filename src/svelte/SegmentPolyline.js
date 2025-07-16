import {
		Renderer,
		Camera,
		Transform,
		Box,
		Program,
		Mesh,
		Geometry,
		Vec3,
		Vec2,
		Mat4,
		Polyline,
		Color,
	} from "ogl";
	
const defaultVertex = /* glsl */ `
    precision highp float;

    attribute vec3 position;
    attribute vec3 next;
    attribute vec3 prev;
    attribute vec2 uv;
    attribute float side;

    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    uniform vec2 uResolution;
    uniform float uDPR;
    uniform float uThickness;
    uniform float uMiter;
    uniform float uZOffset;

    varying vec2 vUv;

    vec4 getPosition() {
        mat4 mvp = projectionMatrix * modelViewMatrix;
        vec4 current = mvp * vec4(position, 1);
        vec4 nextPos = mvp * vec4(next, 1);
        vec4 prevPos = mvp * vec4(prev, 1);

        vec2 aspect = vec2(uResolution.x / uResolution.y, 1);    
        vec2 currentScreen = current.xy / current.w * aspect;
        vec2 nextScreen = nextPos.xy / nextPos.w * aspect;
        vec2 prevScreen = prevPos.xy / prevPos.w * aspect;
    
        vec2 dir1 = normalize(currentScreen - prevScreen);
        vec2 dir2 = normalize(nextScreen - currentScreen);
        vec2 dir = normalize(dir1 + dir2);
    
        vec2 normal = vec2(-dir.y, dir.x);
        normal /= mix(1.0, max(0.3, dot(normal, vec2(-dir1.y, dir1.x))), uMiter);
        normal /= aspect;

        float pixelWidthRatio = 1.0 / (uResolution.y / uDPR);
        float pixelWidth = current.w * pixelWidthRatio;
        normal *= pixelWidth * uThickness;
        current.xy -= normal * side;
    
        return current;
    }

    void main() {
        vUv = uv;
        gl_Position = getPosition();
        gl_Position.z -= uZOffset;
    }
`;

const defaultFragment = /* glsl */ `
    precision highp float;

    uniform vec3 uColor;
    
    varying vec2 vUv;

    void main() {
        gl_FragColor.rgb = uColor;
        gl_FragColor.a = 1.0;
    }
`;

export class SegmentPolyline {
	constructor(
		gl,
		{
			points, // Array of Vec3s
			vertex = defaultVertex,
			fragment = defaultFragment,
			uniforms = {},
			attributes = {}, // For passing in custom attribs
		},
	) {
		this.gl = gl;
		this.points = points;
		this.count = points.length;

		const segmentCount = Math.floor(this.count / 2);
		const vertCount = segmentCount * 4; // 4 vertices per segment

		// Create buffers
		this.position = new Float32Array(vertCount * 3);
		this.prev = new Float32Array(vertCount * 3);
		this.next = new Float32Array(vertCount * 3);
		const side = new Float32Array(vertCount);
		const uv = new Float32Array(vertCount * 2);
		const index = new Uint16Array(segmentCount * 6); // 2 triangles per segment

		// Set static buffers
		for (let i = 0; i < segmentCount; i++) {
			const base = i * 4;

			// Side: alternate left/right
			side.set([-1, 1, -1, 1], base);

			// UVs (optional layout)
			uv.set([0, 0, 1, 0, 0, 1, 1, 1], base * 2); // 4 verts * 2 floats each

			// Indices for 2 triangles
			index.set(
				[
					base + 0,
					base + 2,
					base + 1,
					base + 2,
					base + 3,
					base + 1,
				],
				i * 6,
			);
		}

		const geometry = (this.geometry = new Geometry(
			gl,
			Object.assign(attributes, {
				position: { size: 3, data: this.position },
				prev: { size: 3, data: this.prev },
				next: { size: 3, data: this.next },
				side: { size: 1, data: side },
				uv: { size: 2, data: uv },
				index: { size: 1, data: index },
			}),
		));

		// Populate dynamic buffers with segment data
		this.updateGeometry();

		// Default uniforms
		if (!uniforms.uResolution)
			this.resolution = uniforms.uResolution = { value: new Vec2() };
		if (!uniforms.uDPR) this.dpr = uniforms.uDPR = { value: 1 };
		if (!uniforms.uThickness)
			this.thickness = uniforms.uThickness = { value: 1 };
		if (!uniforms.uColor)
			this.color = uniforms.uColor = { value: new Color("#000") };
		if (!uniforms.uMiter) this.miter = uniforms.uMiter = { value: 1 };
		if (!uniforms.uZOffset)
			this.miter = uniforms.uZOffset = { value: 0 };

		// Set resolution-based uniforms
		this.resize();

		const program = (this.program = new Program(gl, {
			vertex,
			fragment,
			uniforms,
		}));

		this.mesh = new Mesh(gl, { geometry, program });
	}

	updateGeometry() {
		const pointCount = Math.floor(this.points.length / 2); // One segment per 2 points
		for (let i = 0; i < pointCount; i++) {
			const a = this.points[i * 2];
			const b = this.points[i * 2 + 1];
			const next = new Vec3(
				b[0] + 2 * (a[0] - b[0]),
				b[1] + 2 * (a[1] - b[1]),
				b[2] + 2 * (a[2] - b[2]),
			);

			const prev = new Vec3(
				a[0] + 2 * (b[0] - a[0]),
				a[1] + 2 * (b[1] - a[1]),
				a[2] + 2 * (b[2] - a[2]),
			);

			// Each segment creates 4 vertices (quad)
			// a-side+1, a-side-1, b-side+1, b-side-1

			const i4 = i * 4;

			// Positions
			a.toArray(this.position, (i4 + 0) * 3);
			a.toArray(this.position, (i4 + 1) * 3);
			b.toArray(this.position, (i4 + 2) * 3);
			b.toArray(this.position, (i4 + 3) * 3);

			// Prev & Next for direction vectors
			prev.toArray(this.prev, (i4 + 0) * 3);
			prev.toArray(this.prev, (i4 + 1) * 3);
			prev.toArray(this.prev, (i4 + 2) * 3);
			prev.toArray(this.prev, (i4 + 3) * 3);

			next.toArray(this.next, (i4 + 0) * 3);
			next.toArray(this.next, (i4 + 1) * 3);
			next.toArray(this.next, (i4 + 2) * 3);
			next.toArray(this.next, (i4 + 3) * 3);
		}

		this.geometry.attributes.position.needsUpdate = true;
		this.geometry.attributes.prev.needsUpdate = true;
		this.geometry.attributes.next.needsUpdate = true;
	} // Only need to call if not handling resolution uniforms manually
	resize() {
		// Update automatic uniforms if not overridden
		if (this.resolution)
			this.resolution.value.set(
				this.gl.canvas.width,
				this.gl.canvas.height,
			);
		if (this.dpr) this.dpr.value = this.gl.renderer.dpr;
	}
}
