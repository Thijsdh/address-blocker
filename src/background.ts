(() => {
	let filters: string[];

	function getEnabled() {
		return new Promise((resolve, reject) => {
			chrome.storage.sync.get('enabled', ({ enabled }) => {
				resolve(typeof enabled === 'boolean' ? enabled : true);
				chrome.browserAction.setIcon({ path: `../icons/icon${enabled ? '' : '-disabled'}-48.png` });
			});
		});
	}

	function loadFilters() {
		return new Promise((resolve, reject) => {
			chrome.storage.sync.get('filters', ({ filters: storedFilters }) => {
				filters = typeof storedFilters === 'object' ? storedFilters : [];
				resolve(filters);
			});
		});
	}

	chrome.tabs.onUpdated.addListener(function (tabID, changeInfo, tab) {
		if (!('url' in changeInfo)) return;
		chrome.tabs.sendMessage(tab.id, { msg: 'urlChanged', data: changeInfo });
	});

	chrome.tabs.onActivated.addListener(tab => {
		chrome.tabs.sendMessage(tab.tabId, { msg: 'tabActivated' });
	});

	chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
		if (typeof msg.msg === 'undefined') return;

		if (msg.msg === 'getEnabled') {
			getEnabled().then(sendResponse);
			return true;
		}

		if (msg.msg === 'getFilters') {
			sendResponse(filters);
			return true;
		}

		if (msg.msg === 'setFilters') {
			chrome.storage.sync.set({ filters: msg.filters });
			filters = msg.filters;
			return true;
		}
	});

	loadFilters();
})();