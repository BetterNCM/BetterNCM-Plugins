const cachedFunctionMap: Map<string, Function> = new Map();

// https://github.com/Steve-xmh/LibSongInfo/blob/main/index.ts
export function callCachedSearchFunction<F extends (...args: any[]) => any>(
	searchFunctionName: string | ((func: Function) => boolean),
	args: Parameters<F>,
): ReturnType<F> {
	if (!cachedFunctionMap.has(searchFunctionName.toString())) {
		const findResult = betterncm.ncm.findApiFunction(searchFunctionName);
		if (findResult) {
			const [func, funcRoot] = findResult;
			cachedFunctionMap.set(searchFunctionName.toString(), func.bind(funcRoot));
		}
	}
	const cachedFunc = cachedFunctionMap.get(searchFunctionName.toString());
	if (cachedFunc) {
		return cachedFunc.apply(null, args);
	} else {
		throw new TypeError(`函数 ${searchFunctionName.toString()} 未找到`);
	}
}

export function getPlayingSong() {
    return callCachedSearchFunction("getPlaying", []);
}
