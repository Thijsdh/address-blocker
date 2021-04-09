import filters from './filters';

const ignoreTags = new Set([ 'br', 'head', 'link', 'meta', 'script', 'style' ]);

function scan(element: HTMLElement) {
	// TODO: change this into an exclusive filter instead of an inclusive one.
	const children = element.querySelectorAll('*') as NodeListOf<HTMLElement>;
	for (let i = 0; i < children.length; i++) {
		const child = children.item(i);
		if (ignoreTags.has(child.localName)) continue;

		for (let i = 0; i < child.childNodes.length; i++) {
			const childNode = child.childNodes[i];
  			if (childNode.nodeType !== childNode.TEXT_NODE) continue;
			for (const filter of filters) {
				if (childNode.textContent.toLowerCase().indexOf(filter) === -1) continue;
				const length = childNode.textContent.replace(/\s/g,'').length;
				childNode.textContent = "*".repeat(length);
			}
		}

		if (child.localName === 'input') {
			for (const filter of filters) {
				if ((child as HTMLInputElement).value.toLowerCase().indexOf(filter) === -1) continue;
				child.style.visibility = 'hidden';
			}
		}
	}
}


function initObserver() {
	// Options for the observer (which mutations to observe)
	const config = { childList: true, subtree: true };

	// Callback function to execute when mutations are observed
	const callback = function (mutations: MutationRecord[], observer: MutationObserver) {
		for (const mutation of mutations) {
			if (!mutation.target || mutation.target.nodeType !== mutation.target.ELEMENT_NODE) continue;
			scan(mutation.target as HTMLElement);
		}
	};

	// Create an observer instance linked to the callback function
	const observer = new MutationObserver(callback);

	// Start observing the target node for configured mutations
	observer.observe(document, config);
}

function getEnabled(): Promise<boolean> {
	return new Promise(resolve => chrome.runtime.sendMessage({ msg: 'getEnabled' }, resolve));
}

async function init(forceScan = false) {
	if (!(await getEnabled())) return;
	if (forceScan) scan(document.body);
	initObserver();
}

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
	if (typeof msg.msg === 'undefined') return;

	if (msg.msg === 'toggleEnabled' || msg.msg === 'tabActivated') {
		const enabled = await getEnabled();
		if (enabled) await init(true);
		else window.location.reload();
		return;
	}
});

init();
