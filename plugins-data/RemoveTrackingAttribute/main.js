plugin.onLoad(() => {
	const _channalCall = channel.call;
	channel.call = (name, ...args) => {
		if (name === 'winhelper.setClipBoardData') {
			const replacedString = args[1][0];
			if (replacedString.includes('&')) {
				args[1][0] = replacedString.replace(/&userid=\d+/, '');
			} else {
				args[1][0] = replacedString.replace(/userid=\d+/, '');
			}
		}
		_channalCall(name, ...args);
	};
});
