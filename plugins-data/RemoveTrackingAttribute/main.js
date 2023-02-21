plugin.onLoad(async () => {
	const _channalCall = channel.call;
	channel.call = (name, ...args) => {
		if (name === 'winhelper.setClipBoardData') {
			args[1][0] = args[1][0].replace(/&userid=\d+/, '');
		}
		_channalCall(name, ...args);
	};
});