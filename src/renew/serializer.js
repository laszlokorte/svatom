import {kindKey, refKey, selfKey} from './symbols.js'

export function makeSerializer(grammar) {
	return function serializer(sourceRefMap, metaKeys) {
		const output = []
		const outputRefMap = []
		let indent = 0;

		const decimalFormat =  new Intl.NumberFormat('en-US', { minimumFractionDigits: 1 })

		function tryDeref(refOrObject, sourceRefMap, path = []) {
			const selfId = refOrObject ? refOrObject[metaKeys.self || selfKey] : undefined;
			const object = (refOrObject && refOrObject[metaKeys.ref || refKey] !== undefined) ? sourceRefMap[refOrObject.ref] : selfId!==undefined ? sourceRefMap[selfId] : refOrObject

			return path.reduce((o, k) => o ? tryDeref(o[k], sourceRefMap) : null, object)
		}

		function writeSelfAndSuper(out, object, rule) {
			const syn = grammar.rules[rule];
			if(!syn) {
				throw new Error(`Unknown grammar rule '${rule}'. Can not serialize.`)
			}
			if(syn.super && !syn.skipSuper) {
				writeSelfAndSuper(out, object, syn.super)
			}

			if(syn.writer) {
				syn.writer(object, context)
			}
			
		}

		const context = {
			get version() {
				return grammar.version
			},
			get sourceRefMap() {
				return sourceRefMap;
			},
			get kindKey() {
				return kindKey;
			},
			writeStorable(object)  {
				context.writeIndents()

				const actualObject = tryDeref(object, sourceRefMap)

				if(actualObject === null) {
					context.writeNull()
				} else {
					const prevRef = outputRefMap.indexOf(actualObject)
					if(prevRef > -1) {
						output.push(`REF ${prevRef}`)
					} else {
						outputRefMap.push(actualObject)

						output.push(actualObject[metaKeys.kind || kindKey])
						indent++
						writeSelfAndSuper(output, actualObject, actualObject[metaKeys.kind || kindKey])
						indent--
					}

				}
			},
			writeImplicitStorable(kind, object)  {
				const actualObject = tryDeref(object, sourceRefMap)
				
				if(actualObject === null) {
					context.writeNull()
				} else {
					writeSelfAndSuper(output, actualObject, kind)
				}
			},
			writeIndents() {
				for(let i=0;i<indent;i++) {
					output.push("\t");
				}
			},
			writeLine() {
				output.push("\n")
			},
			writeInt(int) {
				output.push(int.toString(10))
			},
			writeString(str) {
				output.push(`"${str.replace(/(\\|")/g,"\\$1").replace(/\n/g,'\\n')}"`)
			},
			writeDouble(num) {
				output.push(decimalFormat.format(num))
			},
			writeFloat(num) {
				output.push(decimalFormat.format(num))
			},
			writeBoolean(b) {
				output.push(b?'true':'false')
			},
			writeNull(b) {
				output.push('NULL')
			},
			writeVersion() {
				output.push(`${grammar.version}`)
			}
		}

		return {
			context,
			output,
		}
	}
}