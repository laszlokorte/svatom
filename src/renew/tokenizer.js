export function makeTokenizer(tokens) {
	const tokenReg = new RegExp(`(${tokens.map((t) => `${t.prefix?t.prefix.source:''}(?<${t.name}>${t.pattern.source})`).join("|")})`, "my")
	const casts = Object.fromEntries(tokens.map(t => [t.name, t.cast]))


	return function* tokenize(string) {
		tokenReg.lastIndex = 0
		
		let prevIndex = 0
		
		for(let m = tokenReg.exec(string);m!==null;m=tokenReg.exec(string)) {
			const tokenType = Object.entries(m.groups).find((e) => e[1])
			yield {
				type: tokenType[0],
				raw: tokenType[1],
				value: casts[tokenType[0]](tokenType[1]),
				start: prevIndex,
				end: tokenReg.lastIndex,
			}
			prevIndex = tokenReg.lastIndex
		}

		if(prevIndex !== string.length) {
			throw new Error(`Expected EOF, but found "${string.slice(prevIndex, prevIndex+10)}"`)
		}

		return prevIndex
	}
}