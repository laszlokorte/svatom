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
	for(let x of seq) {
		yield fn(x)
	}
}

export function* mapIndexed(fn, seq) {
	let i = 0;
	for(let x of seq) {
		yield fn(i++, sq)
	}
}

export function* filter(fn, seq) {
	for(let x of seq) {
		if(fn(x)) {
			yield x
		}
	}
}

export function* reduce(fn, init, seq) {
	let acc = init
	for(let x of seq) {
		acc = fn(acc, x)
	}

	return acc
}

export function* scan(fn, init, seq) {
	let acc = init
	for(let x of seq) {
		yield acc
		acc = fn(acc, x)
	}
	
	yield acc
}


export function* skip(num, seq) {
	let i = num;
	for(let x of seq) {
		if(num > 0) {
			num--;
		} else {
			yield x
		}
	}
}

export function* take(num, seq) {
	let i = num;
	for(let x of seq) {
		if(num > 0) {
			num--;
			yield x
		} else {
			return
		}
	}
}