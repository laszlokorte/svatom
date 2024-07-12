export function* range(start, stop, step = 1, positive = false) {
	if(!positive && start < 0) return;
	
	for (let i = start; i < stop; i+=step) {
		yield i;
	}
}

export function* repeated(val) {
	while(true) {
		yield val
	}
}

export function* map(fn, seq) {
	for(const x of seq) {
		yield fn(x)
	}
}

export function* flatMap(fn, seq) {
	for(const x of seq) {
		yield* fn(x)
	}
}

export function* concat(seqA, seqB) {
	for(const x of seqA) {
		yield x
	}

	for(let y of seqB) {
		yield y
	}
}

export function* mapIndexed(fn, seq) {
	let i = 0;
	for(const x of seq) {
		yield fn(i++, sq)
	}
}

export function* filter(fn, seq) {
	for(const x of seq) {
		if(!fn(x)) {
			continue
		}
		yield x
	}
}

export function* reject(fn, seq) {
	for(const x of seq) {
		if(fn(x)) {
			continue
		}

		yield x
	}
}

export function reduce(fn, init, seq) {
	let acc = init

	for(const x of seq) {
		acc = fn(acc, x)
	}

	return acc
}

export function join(sep, seq) {
	return reduce((a,b) => a+sep+b, "", seq)
}

export function* scan(fn, init, seq) {
	let acc = init
	for(const x of seq) {
		yield acc

		acc = fn(acc, x)
	}
	
	yield acc
}


export function* skip(num, seq) {
	let i = num;
	for(const x of seq) {
		if(num > 0) {
			num--;
			continue
		}

		yield x
	}
}

export function* take(num, seq) {
	let i = num;
	
	for(const x of seq) {
		if(i <= 0) {
			return
		}

		i--;
		yield x
	}
}