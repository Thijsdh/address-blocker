let filters: string[];
const ignoreTags = new Set(['br', 'head', 'link', 'meta', 'script', 'style']);

function parseNode(node: HTMLElement) {
	if (ignoreTags.has(node.localName)) return;

	let x = '';
	for (let i = 0; i < node.childNodes.length; i++) {
		const childNode = node.childNodes[i];
		x += childNode.textContent;
		if (childNode.nodeType !== childNode.TEXT_NODE) {
			if (childNode.nodeType === childNode.ELEMENT_NODE) parseNode(childNode as HTMLElement);
			continue;
		}
		for (const filter of filters) {
			if (childNode.textContent.toLowerCase().indexOf(filter) === -1) continue;
			const length = childNode.textContent.replace(/\s/g, '').length;

			// Floor the length to a multiple of the given floorFactor to prevent
			// guessing based on string length.
			const floorFactor = 5;
			const flooredLength = Math.floor(length / floorFactor) * floorFactor;
			childNode.textContent = "*".repeat(flooredLength);
		}
	}

	if (node.localName === 'input' || node.localName === 'textarea') {
		const input = node as HTMLInputElement;
		for (const filter of filters) {
			if (input.value.toLowerCase().indexOf(filter) === -1) continue;
			input.style.visibility = 'hidden';
			break;
		}
	}

	if (typeof node.setAttribute === 'function') node.setAttribute('data-address-blocker-processed-value', x);
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
	observer.observe(document.body, config);
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
	if (forceScan) scan(document.body.querySelectorAll('*'));
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

window.addEventListener('loaded', () => init(true));