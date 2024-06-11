import * as R from "ramda";	

export const Psi = R.curry((a, b, c, d) => R.curry(a)(b(c))(b(d)));
export const Phi = R.curry((a, b, c, d) => R.curry(a)(b(d))(c(d)));
export const Phi1 = R.curry((a, b, c, d) => (e) => R.curry(a)(b(d)(e))(c(d)(e)));