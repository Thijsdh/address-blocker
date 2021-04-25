let filters: string[];
const ignoreTags = new Set(['br', 'head', 'link', 'meta', 'script', 'style']);

function parseNode(node: Node) {
	if (ignoreTags.has((node as HTMLElement).localName)) return;

	if (node.nodeType === node.TEXT_NODE) {
		if (ignoreTags.has(node.parentElement.localName)) return;
		for (const filter of filters) {
			if (node.textContent.toLowerCase().indexOf(filter.toLowerCase()) === -1) continue;
			const length = node.textContent.replace(/\s/g, '').length;

			// Floor the length to a multiple of the given floorFactor to prevent
			// guessing based on string length.
			const floorFactor = 5;
			const flooredLength = Math.floor(length / floorFactor) * floorFactor;
			node.textContent = "*".repeat(flooredLength);
		}
	} else if (node.nodeType === node.ELEMENT_NODE &&
		((node as HTMLElement).localName === 'input' || (node as HTMLElement).localName === 'textarea')) {
		const input = node as HTMLInputElement;
		for (const filter of filters) {
			if (input.value.toLowerCase().indexOf(filter.toLowerCase()) === -1) continue;
			input.style.visibility = 'hidden';
			break;
		}
	} else {
		for (let i = 0; i < node.childNodes.length; i++) {
			const childNode = node.childNodes[i];
			parseNode(childNode as HTMLElement);
		}
	}
}

function scan(nodes: NodeListOf<HTMLElement>) {
	for (let i = 0; i < nodes.length; i++) {
		const node = nodes.item(i);
		parseNode(node);
	}
}

function initObserver() {
	// Options for the observer (which mutations to observe)
	const config = { childList: true, subtree: true, attributes: true, characterData: true };

	// Callback function to execute when mutations are observed
	const callback = function (mutations: MutationRecord[], observer: MutationObserver) {
		for (const mutation of mutations) {
			if (mutation.type === 'childList') {
				scan(mutation.addedNodes as NodeListOf<HTMLElement>);
			}
			if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
				parseNode(mutation.target as HTMLElement);
			}
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

function getFilters(): Promise<string[]> {
	return new Promise(resolve => chrome.runtime.sendMessage({ msg: 'getFilters' }, resolve));
}

async function init(forceScan = false) {
	if (!(await getEnabled())) return;
	if (!filters) filters = await getFilters();
	if (forceScan) parseNode(document);
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