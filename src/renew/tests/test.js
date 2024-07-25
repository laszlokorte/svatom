
const dirs = [
	{dir: 'all', skip: {
		"CSexample.rnw": "file cut at end",
		"dining-fair+safe.rnw": "de.uni_hamburg.tgi.renew.marianets.QueryFigure?",
		"dining.rnw": "de.uni_hamburg.tgi.renew.marianets.QueryFigure?",
		"mutex (2).rnw": "de.uni_hamburg.tgi.renew.marianets.QueryFigure?",
		//"service.rnw": "de.renew.sdnet.gui.SDNDrawing?",
		//"FSsample.rnw": "fs.TypeFigure?",
	}, ignore: false},
	{dir: 'aips', skip: {
	}, ignore: false}
]

for (const {dir, skip, ignore} of dirs) {
	if(ignore) continue;

	for await (const dirEntry of Deno.readDir(join('.', dir))) {
		if (dirEntry.isFile) {
			if(skip[dirEntry.name]) {
				console.log("Skipping file " + dirEntry.name + ", because: " + skip[dirEntry.name]);
				continue;
			}
			const testFile =  join('.', dir, dirEntry.name)
			
			const text = await Deno.readTextFile(testFile);


			let prevIndex = 0
			for(let tok of renewTokens(text)) {
				prevIndex = tok.end
			}

			if(prevIndex !== text.length) {
				console.error("failed:" + testFile)
				console.error(text.slice(prevIndex, prevIndex+100))
				break;
			}

			const tokenStream = renewTokens(text);
			const version = reader.readAny(["int","className"], false);
			if(version.type == 'int') {
				try {
					const parser = makeParser(reader, makeSyntax(version.value))

					const p = parser(tokenStream)
					const fig = p.parseStorable();
					const fileContent = {version: version.value, content: fig}
					const jsonFile =  join('.', "json_out", dirEntry.name + '.json')

					try {
						const existingJson = await Deno.readTextFile(jsonFile);
						const rereadJson = retrocycle(JSON.parse(existingJson))

						if(!isDeepEqual(rereadJson, fileContent)) {
							throw new Error("Reread of JSON failed");
						} else {
							console.log("ok")
						}
					} catch(err) {
						if (!(err instanceof Deno.errors.NotFound)) {
						    throw err;
						}

						const decycled = decycle(fileContent)
						const decycledJson = JSON.stringify(decycled, null, 2)

						await Deno.writeTextFile(jsonFile, decycledJson);
					}

				} catch(e) {
					console.error(testFile)
					console.error(version.value)
					console.error(e)
					throw e
				}
			} else {
				try {
					const parser = makeParser(reader, makeSyntax(-1))

					const p = parser(tokenStream)
					const fig = p.parseImplicitStorable(version.value);

					const fileContent = {version: null, content: fig}
					const jsonFile =  join('.', "json_out", dirEntry.name + '.json')

					try {
						const existingJson = await Deno.readTextFile(jsonFile);
						const rereadJson = retrocycle(JSON.parse(existingJson))

						if(!isDeepEqual(rereadJson, fileContent)) {
							throw new Error("Reread of JSON failed");
						} else {
							console.log("ok")
						}
					} catch(err) {
						if (!(err instanceof Deno.errors.NotFound)) {
						    throw err;
						}

						const decycled = decycle(fileContent)
						const decycledJson = JSON.stringify(decycled, null, 2)

						await Deno.writeTextFile(jsonFile, decycledJson);
					}
				} catch(e) {
					console.error(testFile)
					console.error("no version")
					console.error(e)
					throw e

				}
			}

			//break;
			// console.log(p.refMap)
		}
	}

}
