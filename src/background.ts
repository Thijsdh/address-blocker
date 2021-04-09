(() => {
	function getEnabled() {
		return new Promise((resolve, reject) => {
			chrome.storage.sync.get('enabled', ({ enabled }) => {
				resolve(typeof enabled === 'boolean' ? enabled : true);
				chrome.browserAction.setIcon({ path: `../icons/icon-${enabled ? 'enabled' : 'disabled'}-48.png` });
			});
		});
	}

	chrome.tabs.onUpdated.addListener(function (tabID, changeInfo, tab) {
		if (!('url' in changeInfo)) return;
		chrome.tabs.sendMessage(tab.id, { msg: 'urlChanged', data: changeInfo });
	});

	chrome.tabs.onActivated.addListener(tab => {
		console.log(tab.tabId);
		chrome.tabs.sendMessage(tab.tabId, { msg: 'tabActivated' });
	});

	chrome.browserAction.onClicked.addListener(tab => {
		chrome.storage.sync.get('enabled', res => {
			chrome.storage.sync.set({ 'enabled': !res.enabled });
			chrome.tabs.sendMessage(tab.id, { msg: 'toggleEnabled' });
		});
	});

	chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
		if (typeof msg.msg === 'undefined') return;

		if (msg.msg === 'setStatus') {
			chrome.tabs.query({ active: true, windowType: "normal", currentWindow: true }, function (d) {
				var tabId = d[0].id;
				chrome.browserAction.setIcon({ path: `../icons/icon-${msg.status}-48.png`, tabId });
			});
			if (msg.status !== 'inactive') chrome.storage.sync.set({ 'enabled': msg.status }, () => sendResponse());
			return true;
		} else if (msg.msg === 'getEnabled') {
			getEnabled().then(sendResponse);
			return true;
		}
	});
})();