(() => {
	function updateEnabled() {
		chrome.storage.sync.get('enabled', ({ enabled }) => {
			document.body.classList.remove('blocker-enabled', 'blocker-disabled');
			document.body.classList.add(`blocker-${enabled ? 'enabled' : 'disabled'}`);

			document.getElementById('toggle-button').innerText = enabled ? 'Enabled' : 'Disabled';
		});
	}
	
	function loadFilters() {
		chrome.storage.sync.get('filters', ({ filters }) => {
			const textarea = document.getElementById('options--filters');
			textarea.value = filters ? filters.join('\n') : '';
		});
	}

	function updateFilters(inputValue) {
		const filters = inputValue.split('\n').filter(value => value.length > 0);
		chrome.runtime.sendMessage({ msg: 'setFilters', filters });
	}

	document.getElementById('toggle-button').addEventListener('click', event => {
		chrome.storage.sync.get('enabled', ({ enabled }) => {
			chrome.storage.sync.set({ 'enabled': !enabled }, () => {
				// Only notify the current active tab about the toggle event.
				// Other tabs will fetch the enabled status automatically when switching.
				chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
					const activeTab = tabs[0];
					chrome.tabs.sendMessage(activeTab.id, { msg: 'toggleEnabled' });
					updateEnabled();
				});
			});
		});
	});

	document.querySelector('[data-toggle-option]').addEventListener('click', e => {
		const option = e.target.getAttribute('data-toggle-option');
		document.querySelector(`[data-option="${option}"]`).classList.toggle('hidden');
	});
	document.getElementById('options--filters').addEventListener('input', e => updateFilters(e.target.value));

	updateEnabled();
	loadFilters();
})();