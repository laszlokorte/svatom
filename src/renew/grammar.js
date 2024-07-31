export function makeGrammar(version) {
	return {
		get version() {
			return version
		},
		
		aliases: {
			"de.renew.gui.fs.AssocArrowTip": "de.renew.gui.AssocArrowTip",
	        "de.renew.gui.fs.IsaArrowTip": "de.renew.gui.IsaArrowTip",
	        "de.renew.diagram.AssocArrowTip": "de.renew.gui.AssocArrowTip",
	        "de.renew.fa.figures.AssocArrowTip": "de.renew.gui.AssocArrowTip",
	        "CH.ifa.draw.cpn.DeclarationFigure": "de.renew.gui.DeclarationFigure",
			"CH.ifa.draw.cpn.CPNDrawing": "de.renew.gui.CPNDrawing",
			"CH.ifa.draw.cpn.PlaceFigure": "de.renew.gui.PlaceFigure",
			"CH.ifa.draw.cpn.TransitionFigure": "de.renew.gui.TransitionFigure",
			"CH.ifa.draw.cpn.ArcConnection": "de.renew.gui.ArcConnection",
			"CH.ifa.draw.cpn.CPNTextFigure": "de.renew.gui.CPNTextFigure",
		},

		rules: {
			"CH.ifa.draw.standard.AbstractFigure": {
				super: null,
				interfaces: ['CH.ifa.draw.framework.Figure',"CH.ifa.draw.framework.ParentFigure"],
			},
			"CH.ifa.draw.standard.CompositeFigure": {
				super: "CH.ifa.draw.standard.AbstractFigure",
				interfaces: ['CH.ifa.draw.framework.Figure'],
				parser: (context) => {
					const o = {
						figures: []
					}
					const size = context.parseInt();
			        for (let i = 0; i < size; i++) {
			            o.figures.push(context.parseStorable('CH.ifa.draw.framework.Figure', true))
			        }

			        return o
				},

				writer: (object, context) => {
					context.writeInt(object.figures.length)
			        for (let i = 0; i < object.figures.length; i++) {
			            context.writeStorable(object.figures[i])
			            context.writeLine()
			        }
				},
			},
			"CH.ifa.draw.figures.GroupFigure": {
				super: "CH.ifa.draw.standard.CompositeFigure",
				interfaces: [],
			},
			"CH.ifa.draw.standard.StandardDrawing": {
				super: "CH.ifa.draw.standard.CompositeFigure",
				interfaces: ['CH.ifa.draw.framework.Figure'],
			},
			"CH.ifa.draw.figures.FigureAttributes": {
				interfaces: [],
				parser: (context) => {
					if(context.parseString() !== "attributes") {
						throw new Error("Attributes expected")
					}

					const numAttributes = context.parseInt();
					const o = {attrs: {}, attrTypes: {}}

					for(let i =0;i<numAttributes;i++) {
						const key = context.parseString()
						const type = context.parseString()
						let val;

						if (type === "Color") {
							if(version < 11) {
			                 	val = {[context.kindKey]:"color", r:context.parseInt(), g:context.parseInt(), b:context.parseInt()};
							} else {
			                	val = {[context.kindKey]:"color", r:context.parseInt(), g:context.parseInt(), b:context.parseInt(), a:context.parseInt()};
							}
			            } else if (type === "Boolean") {
			                val = context.parseString().toLowerCase() === "true";
			            } else if (type === "String") {
			                val = context.parseString();
			            } else if (type === "Int") {
			                val = context.parseInt()
			            } else if (type === "Storable") {
			                val = context.parseStorable();
			            } else if (type === "UNKNOWN") {
			                continue;
			            }

			            o.attrs[key] = val
			            o.attrTypes[key] = type
					}

					return o
				},


				writer: (object, context) => {
					const keys = Object.keys(object.attrs)

					context.writeString("attributes");
					context.writeInt(keys.length)

			        for (let i = 0; i < keys.length; i++) {
			            const key = keys[i]
			            const val = object.attrs[key]
			            const type = object.attrTypes[key]

			            context.writeString(key);
			            context.writeString(type);

			            if (type === "Color") {
							if(version < 11) {
			                 	context.writeInt(val.r)
			                 	context.writeInt(val.g)
			                 	context.writeInt(val.b)
							} else {
			                 	context.writeInt(val.r)
			                 	context.writeInt(val.g)
			                 	context.writeInt(val.b)
			                 	context.writeInt(val.a ?? 255)
							}
			            } else if (type === "Boolean") {
		                 	context.writeString(val ? "true" : "false")
			            } else if (type === "String") {
			            	context.writeString(val)
			            } else if (type === "Int") {
			            	context.writeInt(val)
			            } else if (type === "Storable") {
			            	context.writeStorable(val)
			            } else {
			            	context.writeStorable(val)
			            }
			        }
				},
			},
			"CH.ifa.draw.figures.AttributeFigure": {
				super: "CH.ifa.draw.standard.AbstractFigure",
				interfaces: [],
				parser: (context) => {
					const o = {}
					
					if(context.parseString() === "attributes") {
						o.attributes = context.parseImplicitStorable("CH.ifa.draw.figures.FigureAttributes", false)
					}

					return o
				},
				writer: (object, context) => {
					if(object.attributes) {
						context.writeString("attributes")
						context.writeImplicitStorable("CH.ifa.draw.figures.FigureAttributes", object.attributes);
					}
				},
			},
			"CH.ifa.draw.figures.RectangleFigure": {
				super: "CH.ifa.draw.figures.AttributeFigure",
				interfaces: [],
				parser: (context) => {
					return {
						x: context.parseInt(),
						y: context.parseInt(),
						w: context.parseInt(),
						h: context.parseInt(),
					}
				},
				writer: (object, context) => {
					context.writeInt(object.x)
					context.writeInt(object.y)
					context.writeInt(object.w)
					context.writeInt(object.h)
				},
			},
			"CH.ifa.draw.contrib.DiamondFigure": {
				super: "CH.ifa.draw.figures.RectangleFigure",
				interfaces: [],
			},
			"de.renew.hierarchicalworkflownets.gui.HNViewDrawing": {
				super: "de.renew.gui.CPNDrawing",
				skipSuper: true,
				interfaces: [],
				parser: (context) => {
					const o = {
						figures: []
					}
					
					function readNode() {
						const n = context.parseInt();

				        for (let i = 0; i < n; ++i) {
				            const name = context.parseString();
				            const figure = context.parseStorable("CH.ifa.draw.framework.Figure");
				           
				            readNode();
				        }
					}
					readNode()
					const n1 = context.parseInt();
			        for (let i = 0; i < n1; ++i) {
			            const ac = context.parseStorable("de.renew.gui.ArcConnection");
			            // Node f = nodesByFigures_.get(ac.startFigure());
			            // Node t = nodesByFigures_.get(ac.endFigure());
			            // Arc a = new Arc(f, t);
			            // hn_.add(a);
			            // arcConnectionsByArcs_.put(a, ac);
			            // drawing_.add(ac);
			        }

			        const n2 = context.parseInt();
			        for (let i = 0; i < n2; ++i) {
			            o.figures.push(context.parseStorable("CH.ifa.draw.framework.Figure"))
			        }

			        return o
				},
				writer: (object, context) => {
					//TODO

					throw new Exception("Not yet implemented!")
				},
			},
			"de.renew.hierarchicalworkflownets.gui.HNPlaceFigure": {
				super: "de.renew.gui.PlaceFigure",
				interfaces: [],
			},
			"de.renew.workflow.TaskFigure": {
				super: "de.renew.gui.TransitionFigure",
				interfaces: [],
			},
			"de.renew.wfnet.TaskFigure": {
				super: "de.renew.gui.TransitionFigure",
				interfaces: [],
			},
			"CH.ifa.draw.contrib.PolygonFigure": {
				super: "CH.ifa.draw.figures.AttributeFigure",
				interfaces: ["CH.ifa.draw.figures.PolyLineable"],
				parser: (context) => {
					const o = {points: []}
					const size = context.parseInt()
			        for (let i = 0; i < size; i++) {
			            o.points.push({
			            	x: context.parseInt(),
			            	y: context.parseInt(),
			            })
			        }

			        return o
				},
				writer: (object, context) => {
					context.writeInt(object.points.length)

					for (let i = 0; i < object.points.length; i++) {
			            context.writeInt(object.points[i].x)
			            context.writeInt(object.points[i].y)
			        }
				},
			},
			"de.renew.hierarchicalworkflownets.gui.HNTransitionFigure": {
				super: "de.renew.gui.TransitionFigure",
				interfaces: [],
			},
			"de.renew.hierarchicalworkflownets.gui.layout.Vec2d": {
				super: false,
				interfaces: [],
				parser: (context) => {
					return {
						x: context.parseFloat(),
						y: context.parseFloat(),
					}
				},
				writer: (object, context) => {
					context.writeFloat(object.x)
					context.writeFloat(object.y)
				},
			},
			"CH.ifa.draw.figures.EllipseFigure": {
				super: "CH.ifa.draw.figures.AttributeFigure",
				interfaces: [],
				parser: (context) => {
					return {
						x: context.parseInt(),
						y: context.parseInt(),
						w: context.parseInt(),
						h: context.parseInt(),
					}
				},
				writer: (object, context) => {
					context.writeInt(object.x)
					context.writeInt(object.y)
					context.writeInt(object.w)
					context.writeInt(object.h)
				},
			},
			"CH.ifa.draw.figures.RoundRectangleFigure": {
				super: "CH.ifa.draw.figures.AttributeFigure",
				interfaces: [],
				parser: (context) => {
					return {
						x: context.parseInt(),
						y: context.parseInt(),
						w: context.parseInt(),
						h: context.parseInt(),
						arcWidth: context.parseInt(),
						arcHeight: context.parseInt(),
					}
				},
				writer: (object, context) => {
					context.writeInt(object.x)
					context.writeInt(object.y)
					context.writeInt(object.w)
					context.writeInt(object.h)
					context.writeInt(object.arcWidth)
					context.writeInt(object.arcHeight)
				},
			},
			"de.renew.gui.TransitionFigure": {
				super: "CH.ifa.draw.figures.RectangleFigure",
				interfaces: ["CH.ifa.draw.framework.Figure","de.renew.gui.InscribableFigure", "CH.ifa.draw.framework.ParentFigure"],
				parser: (context) => {
					if(version >= 4) {
						return {
							highlightFigure: context.parseStorable("CH.ifa.draw.framework.Figure"),
						}
					} else {
						return {}
					}
				},
				writer: (object, context) => {
					if(version >= 4) {
						context.writeStorable(object.highlightFigure);
					}
				},
			},
			"de.renew.gui.PlaceFigure": {
				super: "CH.ifa.draw.figures.EllipseFigure",
				interfaces: ["CH.ifa.draw.framework.Figure","de.renew.gui.InscribableFigure", "CH.ifa.draw.framework.ParentFigure"],
				parser: (context) => {
					if(version >= 3) {
						return {
							highlightFigure: context.parseStorable("CH.ifa.draw.framework.Figure"),
						}
					} else {
						return {}
					}
				},
				writer: (object, context) => {
					if(version >= 3) {
						context.writeStorable(object.highlightFigure);
					}
				},
			},
			"de.renew.gui.VirtualPlaceFigure": {
				super: "de.renew.gui.PlaceFigure",
				interfaces: [],
				parser: (context) => {
					return {
						placeFigure: context.parseStorable("de.renew.gui.PlaceFigure"),
					}
				},
				writer: (object, context) => {
					context.writeStorable(object.placeFigure);
				},
			},
			"de.renew.gui.ArcConnection": {
				super: "CH.ifa.draw.figures.LineConnection",
				interfaces: ["CH.ifa.draw.framework.Figure","de.renew.gui.InscribableFigure", "CH.ifa.draw.framework.ParentFigure"],
			},
			"de.renew.gui.DoubleArcConnection": {
				super: "de.renew.gui.ArcConnection",
				interfaces: [],
			},
			"de.renew.gui.HollowDoubleArcConnection": {
				super: "de.renew.gui.ArcConnection",
				interfaces: [],
			},
			"de.renew.gui.InhibitorConnection": {
				super: "de.renew.gui.ArcConnection",
				interfaces: [],
			},
			"de.renew.gui.fs.ConceptConnection": {
				super: "CH.ifa.draw.figures.LineConnection",
				interfaces: ["CH.ifa.draw.framework.Figure"],
			},
			"de.renew.gui.fs.IsaConnection": {
				super: "de.renew.gui.fs.ConceptConnection",
				interfaces: [],
				parser: (context) => {
					return {
						isDisjunctive: context.parseBoolean(),
					}
				},
				writer: (object, context) => {
					context.writeBoolean(object.isDisjunctive);
				},
			},
			"fs.IsaConnection": {
				super: "de.renew.gui.fs.ConceptConnection",
				interfaces: [],
			},
			"de.renew.gui.IsaArrowTip": {
				super: "CH.ifa.draw.figures.ArrowTip",
				interfaces: [],
			},
			"de.renew.gui.fs.IsaArrowTip": {
				super: "CH.ifa.draw.figures.ArrowTip",
				interfaces: [],
			},
			"fs.IsaArrowTip": {
				super: "CH.ifa.draw.figures.ArrowTip",
				interfaces: [],
			},
			"de.renew.gui.DoubleArrowTip": {
				super: "CH.ifa.draw.figures.ArrowTip",
				interfaces: [],
			},
			"CH.ifa.draw.figures.AbstractLocator": {
				super: null,
				interfaces: ["CH.ifa.draw.framework.Locator"],
			},
			"de.renew.gui.fs.ConceptFigure": {
				super: "CH.ifa.draw.figures.TextFigure",
				interfaces: ["CH.ifa.draw.framework.Locator"],
			},
			"fs.ConceptFigure": {
				super: "CH.ifa.draw.figures.TextFigure",
				interfaces: ["CH.ifa.draw.framework.Locator"],
				parser: (context) => {
					if(version < 0) {
						return  {
							type: context.parseInt()
						}
					} else {
						return {}
					}
				},
				writer: (object, context) => {
					if(version < 0) {
						context.writeInt(object.type)
					}
				},
			},
			"fs.PartitionFigure": {
				super: "CH.ifa.draw.figures.AttributeFigure",
				interfaces: ["CH.ifa.draw.framework.Locator"],
				parser: (context) => {
					return {
						x: context.parseInt(),
						y: context.parseInt(),
						w: context.parseInt(),
						h: context.parseInt(),
					}
				},
				writer: (object, context) => {
					context.writeInt(object.x)
					context.writeInt(object.y)
					context.writeInt(object.w)
					context.writeInt(object.h)
				},
			},
			"de.renew.gui.fs.FSNodeFigure": {
				super: "CH.ifa.draw.figures.TextFigure",
				interfaces: ["CH.ifa.draw.framework.Locator"],
			},
			"CH.ifa.draw.contrib.ChopPolygonConnector": {
				super: "CH.ifa.draw.standard.ChopBoxConnector",
				interfaces: [],
			},
			"CH.ifa.draw.figures.ShortestDistanceConnector": {
				super: "CH.ifa.draw.standard.AbstractConnector",
				interfaces: [],
			},
			"CH.ifa.draw.figures.ElbowConnection": {
				super: "CH.ifa.draw.figures.LineConnection",
				interfaces: [],
			},
			"de.renew.gui.fs.FeatureConnection": {
				super: "CH.ifa.draw.figures.LineConnection",
				interfaces: [],
			},
			"CH.ifa.draw.figures.ChopRoundRectangleConnector": {
				super: "CH.ifa.draw.standard.ChopBoxConnector",
				interfaces: [],
			},
			"de.renew.gui.fs.UMLNoteFigure": {
				super: "CH.ifa.draw.figures.TextFigure",
				interfaces: [],
			},
			"de.renew.wfnet.TaskFigure": {
				super: "de.renew.gui.TransitionFigure",
				interfaces: [],
			},
			"de.renew.gui.fs.AssocConnection": {
				super: "de.renew.gui.fs.ConceptConnection",
				interfaces: [],
			},
			"de.renew.gui.AssocArrowTip": {
				super: "CH.ifa.draw.figures.ArrowTip",
				interfaces: [],
			},
			"de.renew.gui.fs.AssocArrowTip": {
				super: "CH.ifa.draw.figures.ArrowTip",
				interfaces: [],
			},
			"de.renew.bpmn.roundtrip.RoundtripNetComponentFigure": {
				super: "de.renew.netcomponents.NetComponentFigure",
				interfaces: [],
				parser: (context) => {
					context.skipAny(["ref", "string"])
					return {
						
					}
				},
				writer: (object, context) => {
					context.writeString("NOT SURE WHAT THIS IS")
				},
			},
			"CH.ifa.draw.standard.OffsetLocator": {
				super: "CH.ifa.draw.figures.AbstractLocator",
				interfaces: ["CH.ifa.draw.framework.Locator"],
				parser: (context) => {
					return {
						fOffsetX: context.parseInt(),
				        fOffsetY: context.parseInt(),
				        fBase: context.parseStorable("CH.ifa.draw.framework.Locator"),
					}
				},
				writer: (object, context) => {
					context.writeInt(object.fOffsetX)
					context.writeInt(object.fOffsetY)
					context.writeStorable(object.fBase)
				},
			},
			"CH.ifa.draw.standard.RelativeLocator": {
				super: "CH.ifa.draw.figures.AbstractLocator",
				interfaces: ["CH.ifa.draw.framework.Locator"],
				parser: (context) => {
					return {
						fOffsetX: context.parseDouble(),
				        fOffsetY: context.parseDouble(),
					}
				},
				writer: (object, context) => {
					context.writeInt(object.fOffsetX)
					context.writeInt(object.fOffsetY)
				},
			},
			"CH.ifa.draw.figures.PolyLineFigure": {
				super: version >= 1 ? "CH.ifa.draw.figures.AttributeFigure" : null,
				interfaces: ["CH.ifa.draw.figures.PolyLineable"],
				parser: (context) => {
					const size = context.parseInt()
					const o = {
						points: [],
					}

					for (let i = 0; i < size; i++) {
		            	const x = context.parseInt();
			            const y = context.parseInt();
			            o.points.push({x,y});
			        }

			        o.startDecoration =  context.parseStorable("CH.ifa.draw.figures.LineDecoration");
			        o.endDecoration = context.parseStorable("CH.ifa.draw.figures.LineDecoration");

			        if(version >= 8) {
			            o.arrowName = context.parseString();
			        }

			        if(version === -1) {
			        	o.frameColor = {r:context.parseInt(), g:context.parseInt(), b:context.parseInt()}
			        }

					return o;
				},
				writer: (object, context) => {
					context.writeInt(object.points.length)

					for (let i = 0; i < object.points.length; i++) {
			            context.writeInt(object.points[i].x)
			            context.writeInt(object.points[i].y)
			        }

					context.writeStorable(object.startDecoration)
					context.writeStorable(object.endDecoration)

					if(version >= 8) {
			            context.writeString("CH.ifa.draw.figures.ArrowTip");
			        }

			        if(version === -1) {
			            context.writeInt(object.frameColor.r??0)
			            context.writeInt(object.frameColor.g??0)
			            context.writeInt(object.frameColor.b??0)
			        }
				},
			},
			"CH.ifa.draw.figures.LineConnection": {
				super: "CH.ifa.draw.figures.PolyLineFigure",
				interfaces: [],
				parser: (context) => {
					return {
						start: context.parseStorable('CH.ifa.draw.framework.Connector'),
						end: context.parseStorable('CH.ifa.draw.framework.Connector'),
					}
				},
				writer: (object, context) => {
					context.writeStorable(object.start)
					context.writeStorable(object.end)
				},
			},
			"CH.ifa.draw.figures.ArrowTip": {
				super: null,
				interfaces: ["CH.ifa.draw.figures.LineDecoration"],
				parser: (context) => {
					if(version >= 5) {
						return {
							Angle : context.parseDouble(),
				            fOuterRadius : context.parseDouble(),
				            fInnerRadius : context.parseDouble(),
				            fFilled : context.parseBoolean(),
						}
					} else {
						return {}
					}
					
				},
				writer: (object, context) => {
					if(version >= 5) {
						context.writeDouble(object.Angle)
			            context.writeDouble(object.fOuterRadius)
			            context.writeDouble(object.fInnerRadius)
			            context.writeBoolean(object.fFilled)
					}				
				},
			},
			"de.renew.gui.CircleDecoration": {
				super: null,
				interfaces: ["CH.ifa.draw.figures.LineDecoration"],
			},
			"CH.ifa.draw.standard.ChopBoxConnector": {
				super: "CH.ifa.draw.standard.AbstractConnector",
				interfaces: ["CH.ifa.draw.framework.Connector"],
			},
			"CH.ifa.draw.figures.ChopEllipseConnector": {
				super: "CH.ifa.draw.standard.ChopBoxConnector",
				interfaces: ["CH.ifa.draw.framework.Connector"],
			},
			"CH.ifa.draw.standard.AbstractConnector": {
				super: null,
				interfaces: ["CH.ifa.draw.framework.Connector"],
				parser: (context) => {
					return {
						owner : context.parseStorable("CH.ifa.draw.framework.Figure"),
					}
				},

				writer: (object, context) => {
			        context.writeStorable(object.owner)				
				},
			},
			"de.renew.gui.DeclarationFigure": {
				super: "de.renew.gui.CPNTextFigure",
				interfaces: [],
			},
			"fs.FSFigure": {
				super: "de.renew.gui.fs.FSFigure",
				interfaces: [],
			},
			"de.renew.gui.fs.FSFigure": {
				super:  version >-1 && version <= 5 ? "CH.ifa.draw.figures.TextFigure" :  "de.renew.gui.CPNTextFigure",
				interfaces: [],
				parser: (context) => {
					const o = {paths: []}
					if (version <= 5) {
			            o.fType = 1
			        } else if(version > 6) {
			        	o.frameColor = "black"
			            if (version > 6) {
			                // read list of paths for open nodes:
			                const paths = context.parseInt();
			                for(let i=0;i<paths;i++) {
			                	o.paths.push(context.parseString())
			                }
			            }
			        }

			        return o;
				},
				writer: (object, context) => {
			        if (version > 6) {
			        	context.writeInt(object.paths.length)
		                const paths = context.parseInt();
		                for(let i=0;i<object.paths.length;i++) {
		                	context.writeString(object.paths[i])
		                }
		            }
				},
			},
			"CH.ifa.draw.figures.TextFigure": {
				super: "CH.ifa.draw.figures.AttributeFigure",
				interfaces: [],
				parser: (context) => {
					const text= {
						fOriginX: context.parseInt(),
						fOriginY: context.parseInt(),
						text: context.parseString(),
						fCurrentFontName: context.parseString(),
						fCurrentFontStyle: context.parseInt(),
						fCurrentFontSize: context.parseInt(),
						fIsReadOnly: context.parseBoolean(),
						fParent: context.parseStorable("CH.ifa.draw.framework.ParentFigure"),
						fLocator: context.parseStorable("CH.ifa.draw.standard.OffsetLocator"),
					}

					text.lines = text.text.split("\n").filter(x=>x)

					return text
				},
				writer: (object, context) => {
					context.writeInt(object.fOriginX);
					context.writeInt(object.fOriginY);
					context.writeString(object.lines ? object.lines.join("\n") : object.text);
					context.writeString(object.fCurrentFontName);
					context.writeInt(object.fCurrentFontStyle);
					context.writeInt(object.fCurrentFontSize);
					context.writeBoolean(object.fIsReadOnly);
					context.writeStorable(object.fParent);
					context.writeStorable(object.fLocator);
				},
			},
			"de.renew.gui.CPNTextFigure": {
				super: "CH.ifa.draw.figures.TextFigure",
				interfaces: [],
				parser: (context) => {
					return {
						fType: context.parseInt(),
					}
				},
				writer: (object, context) => {
					context.writeInt(object.fType);
				},
			},
			"CH.ifa.draw.figures.ImageFigure": {
				super: "CH.ifa.draw.figures.AttributeFigure",
				interfaces: [],
				parser: (context) => {
					return {
						x: context.parseInt(),
						y: context.parseInt(),
						w: context.parseInt(),
						h: context.parseInt(),
						name: context.parseString(),
					}
				},
				writer: (object, context) => {
					context.writeInt(object.x)
					context.writeInt(object.y)
					context.writeInt(object.w)
					context.writeInt(object.h)
					context.writeString(object.name)
				},
			},
			"fs.TypeFigure": {
				super: "CH.ifa.draw.figures.TextFigure",
				interfaces: [],
				parser: (context) => {
					return {
						type: context.parseInt(),
					}
				},
				writer: (object, context) => {
					context.writeInt(object.type)
				},
			},
			"CH.ifa.draw.figures.LineFigure": {
				super: "CH.ifa.draw.figures.PolyLineFigure",
				interfaces: [],
			},
			"CH.ifa.draw.contrib.TriangleFigure": {
				super: "CH.ifa.draw.figures.RectangleFigure",
				interfaces: [],
				parser: (context) => {
					return {
						rotation: context.parseInt(),
					}
				},
				writer: (object, context) => {
					context.writeInt(object.rotation)
				},
			},
			"CH.ifa.draw.figures.CompositeAttributeFigure": {
				super: version > 9 ? "CH.ifa.draw.figures.AttributeFigure" : null,
				interfaces: [],
				parser: (context) => {
					const o = {figures: []}

					const size = context.parseInt();

			        for (let i = 0; i < size; i++) {
		                o.figures.push(context.parseStorable('CH.ifa.draw.framework.Figure'))
		            }

		            return o
				},
				writer: (object, context) => {
					context.writeInt(object.figures.length)

					for (let i = 0; i < object.figures.length; i++) {
		                context.writeStorable(object.figures[i])
		                context.writeLine()
		            }
				},
			},
			"de.renew.netcomponents.NetComponentFigure": {
				super: "CH.ifa.draw.figures.CompositeAttributeFigure",
				interfaces: [],
			},
			"de.renew.gui.CPNDrawing": {
				super: "CH.ifa.draw.standard.StandardDrawing",
				interfaces: ['CH.ifa.draw.framework.Figure'],
				parser: (context) => {
					if(version >= 2) {
						return {
							icon: context.parseStorable("CH.ifa.draw.standard.AbstractFigure")
						}
					} else {
						return {}
					}
				},
				writer: (object, context) => {
					if(version >= 2) {
						context.writeStorable(object.icon)
					}
				},
			},
			"de.renew.sdnet.gui.SDNDrawing": {
				super: "de.renew.gui.CPNDrawing",
				interfaces: ['CH.ifa.draw.framework.Figure'],
			},
			"de.renew.sdnet.gui.figure.SDNPlaceTextFigure": {
				super: "de.renew.gui.CPNTextFigure",
				interfaces: ['CH.ifa.draw.framework.Figure'],
			},
			"de.renew.diagram.drawing.DiagramDrawing": {
				super: "CH.ifa.draw.standard.StandardDrawing",
				interfaces: [],
			},
			"de.renew.diagram.RoleDescriptorFigure": {
				super: "de.renew.diagram.TailFigure",
				interfaces: ["RepresentableRoleFigure"],
			},
			"de.renew.diagram.DiagramFigure": {
				super: "CH.ifa.draw.figures.AttributeFigure",
				interfaces: ["de.renew.diagram.RepresentableDiagramFigure"],
				parser: (context) => {
					return {
						displayBox: {
							x: context.parseInt(),
							y: context.parseInt(),
							w: context.parseInt(),
							h: context.parseInt(),
						}
					}
				},
				writer: (object, context) => {
					context.writeInt(object.displayBox.x)
					context.writeInt(object.displayBox.y)
					context.writeInt(object.displayBox.w)
					context.writeInt(object.displayBox.h)
				},
			},
			"de.renew.diagram.TailFigure": {
				super: "de.renew.diagram.DiagramFigure",
				interfaces: ["de.renew.diagram.RepresentableTailFigure"],
			},
			"de.renew.diagram.LifeLineLogicFigure": {
				super: "de.renew.diagram.TailFigure",
				interfaces: ["de.renew.diagram.RepresentableLifeLineLogicFigure","de.renew.diagram.ISplitFigure"],
				parser: (context) => {
					const decoration = context.parseStorable("de.renew.diagram.FigureDecoration");
					const _skip = context.parseString()

					return {
						decoration
					}
				},
				writer: (object, context) => {
					context.writeStorable(object.decoration)
					context.writeString("de.renew.diagram.FigureDecoration")
				},
			},
			"de.renew.diagram.VSplitFigure": {
				super: "de.renew.diagram.LifeLineLogicFigure",
				interfaces: [],
			},
			"de.renew.diagram.VJoinFigure": {
				super: "de.renew.diagram.LifeLineLogicFigure",
				interfaces: [],
			},
			"de.renew.diagram.HSplitFigure": {
				super: "de.renew.diagram.DiagramFigure",
				interfaces: [],
				parser: (context) => {
					const decoration = context.parseStorable("de.renew.diagram.FigureDecoration");
					context.parseString()

					return {
						decoration
					}
				},
				writer: (object, context) => {
					context.writeStorable(object.decoration)
					context.writeString("de.renew.diagram.FigureDecoration")
				},
			},
			"de.renew.diagram.VSplitCenterConnector": {
				super: "CH.ifa.draw.standard.AbstractConnector",
				interfaces: [],
			},
			"de.renew.diagram.HSplitCenterConnector": {
				super: "CH.ifa.draw.standard.AbstractConnector",
				interfaces: [],
			},
			"de.renew.diagram.SplitDecoration": {
				super: null,
				interfaces: ["de.renew.diagram.FigureDecoration"],
				parser: (context) => {
					return {
						size : context.parseInt(),
	        			halfSize : context.parseInt(),
					}
				},
				writer: (object, context) => {
					context.writeInt(object.size)
					context.writeInt(object.halfSize)
				},
			},
			"de.renew.diagram.XORDecoration": {
				super: "de.renew.diagram.SplitDecoration",
				interfaces: [],
			},
			"de.renew.diagram.ANDDecoration": {
				super: "de.renew.diagram.SplitDecoration",
				interfaces: [],
			},
			"de.renew.diagram.LifeLineConnection": {
				super: "CH.ifa.draw.figures.LineConnection",
				interfaces: [],
			},
			"de.renew.diagram.VerticalConnector": {
				super: "CH.ifa.draw.standard.AbstractConnector",
				interfaces: [],
			},
			"de.renew.diagram.HorizontalConnector": {
				super: "CH.ifa.draw.standard.AbstractConnector",
				interfaces: [],
			},
			"de.renew.diagram.TopConnector": {
				super: "CH.ifa.draw.standard.AbstractConnector",
				interfaces: [],
			},
			"de.renew.diagram.RightConnector": {
				super: "CH.ifa.draw.standard.AbstractConnector",
				interfaces: [],
			},
			"de.renew.diagram.HTopConnector": {
				super: "CH.ifa.draw.standard.AbstractConnector",
				interfaces: [],
			},
			"de.renew.diagram.HBottomConnector": {
				super: "CH.ifa.draw.standard.AbstractConnector",
				interfaces: [],
			},
			"de.renew.diagram.DiagramTextFigure": {
				super: "CH.ifa.draw.figures.TextFigure",
				interfaces: [],
			},
			"de.renew.diagram.DCServiceTextFigure": {
				super: "CH.ifa.draw.figures.TextFigure",
				interfaces: [],
			},
			"de.renew.diagram.ActionTextFigure": {
				super: "CH.ifa.draw.figures.TextFigure",
				interfaces: [],
			},
			"de.renew.diagram.BottomConnector": {
				super: "CH.ifa.draw.standard.AbstractConnector",
				interfaces: [],
			},
			"de.renew.diagram.LeftConnector": {
				super: "CH.ifa.draw.standard.AbstractConnector",
				interfaces: [],
			},
			"de.renew.diagram.TaskFigure": {
				super: "de.renew.diagram.TailFigure",
				interfaces: [],
			},
			"de.renew.diagram.DestructionFigure": {
				super: "de.renew.diagram.TailFigure",
				interfaces: [],
			},
			"de.renew.diagram.AbstractMessageConnection": {
				super: "CH.ifa.draw.figures.LineConnection",
				interfaces: [],
			},
			"de.renew.diagram.MessageConnection": {
				super: "de.renew.diagram.AbstractMessageConnection",
				interfaces: [],
			},
			"de.renew.diagram.SynchronousMessageConnection": {
				super: "de.renew.diagram.AbstractMessageConnection",
				interfaces: [],
			},
			"de.renew.diagram.SynchronousMessageArrowTip": {
				super: "CH.ifa.draw.figures.ArrowTip",
				interfaces: [],
			},
			"de.renew.diagram.SynchronousReplyConnection": {
				super: "de.renew.diagram.AbstractMessageConnection",
				interfaces: [],
			},
			"de.renew.diagram.DiagramFrameFigure": {
				super: "CH.ifa.draw.figures.RoundRectangleFigure",
				interfaces: [],
			},
			"de.renew.diagram.AssocArrowTip": {
				super: "de.renew.gui.AssocArrowTip",
				interfaces: [],
			},
		}
	}
}
