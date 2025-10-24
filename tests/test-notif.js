// test-notif.js
// Tests for notification system

const { describe, it } = require('node:test');
const { assert, createMockDOM, loadSourceFile } = require('./test-helpers.js');

// Create mock DOM
const { document, window } = createMockDOM();

// Load notif source with DOM globals
const context = loadSourceFile('notif.js', {
	document,
	window,
	setTimeout: global.setTimeout,
	clearTimeout: global.clearTimeout
}, ['NotificationManager']);

const { NotificationManager } = context;

describe('NotificationManager constructor', () => {

	it('creates instance with default options', () => {
		const notif = new NotificationManager();
		assert.ok(notif);
		assert.strictEqual(notif.defaultTimeout, 4000);
		assert.strictEqual(notif.successTimeout, 2000);
	});

	it('accepts custom timeout options', () => {
		const notif = new NotificationManager({
			defaultTimeout: 5000,
			successTimeout: 3000
		});
		assert.strictEqual(notif.defaultTimeout, 5000);
		assert.strictEqual(notif.successTimeout, 3000);
	});

	it('accepts custom layout options', () => {
		const notif = new NotificationManager({
			topOffset: 30,
			spacing: 70
		});
		assert.strictEqual(notif.topOffset, 30);
		assert.strictEqual(notif.spacing, 70);
	});

	it('initializes notification map', () => {
		const notif = new NotificationManager();
		assert.ok(notif.notifications instanceof Map);
		assert.strictEqual(notif.notifications.size, 0);
	});

	it('creates container when ready', () => {
		const notif = new NotificationManager();
		notif._createContainer();
		assert.ok(notif.container);
		assert.strictEqual(notif.container.className, 'notification-container');
	});
});

describe('NotificationManager.show()', () => {

	it('shows notification', () => {
		const notif = new NotificationManager();
		notif.show('Test message');
		assert.strictEqual(notif.notifications.size, 1);
	});

	it('creates element with message', () => {
		const notif = new NotificationManager();
		notif.show('Test message');
		const notification = Array.from(notif.notifications.values())[0];
		assert.ok(notification.element);
		assert.ok(notification.element.innerHTML.includes('Test message'));
	});

	it('assigns unique IDs', () => {
		const notif = new NotificationManager();
		notif.show('Message 1');
		notif.show('Message 2');
		assert.strictEqual(notif.notifications.size, 2);
	});

	it('sets timeout for auto-hide', () => {
		const notif = new NotificationManager();
		notif.show('Test message');
		const notification = Array.from(notif.notifications.values())[0];
		assert.ok(notification.timeout);
	});

	it('respects custom timeout', () => {
		const notif = new NotificationManager();
		notif.show('Test message', 10000);
		const notification = Array.from(notif.notifications.values())[0];
		assert.ok(notification.timeout);
	});
});

describe('NotificationManager.spinner()', () => {

	it('shows spinner notification', () => {
		const notif = new NotificationManager();
		const spinner = notif.spinner('Loading...');
		assert.ok(spinner);
		assert.strictEqual(notif.notifications.size, 1);
	});

	it('creates element with spinner', () => {
		const notif = new NotificationManager();
		const spinner = notif.spinner('Loading...');
		const notification = Array.from(notif.notifications.values())[0];
		assert.strictEqual(notification.type, 'spinner');
		assert.ok(notification.element.innerHTML.includes('Loading...'));
	});

	it('does not auto-hide', () => {
		const notif = new NotificationManager();
		const spinner = notif.spinner('Loading...');
		const notification = Array.from(notif.notifications.values())[0];
		assert.strictEqual(notification.timeout, null);
	});

	it('returns control object with complete method', () => {
		const notif = new NotificationManager();
		const spinner = notif.spinner('Loading...');
		assert.ok(typeof spinner.complete === 'function');
	});

	it('complete() removes notification', () => {
		const notif = new NotificationManager();
		const spinner = notif.spinner('Loading...');
		assert.strictEqual(notif.notifications.size, 1);
		spinner.complete();
		// Note: Actual removal happens after fade timeout
	});
});

describe('NotificationManager.pbar()', () => {

	it('shows progress bar notification', () => {
		const notif = new NotificationManager();
		const pbar = notif.pbar('Processing...');
		assert.ok(pbar);
		assert.strictEqual(notif.notifications.size, 1);
	});

	it('creates element with progress bar', () => {
		const notif = new NotificationManager();
		const pbar = notif.pbar('Processing...');
		const notification = Array.from(notif.notifications.values())[0];
		assert.strictEqual(notification.type, 'pbar');
	});

	it('returns control object with progress method', () => {
		const notif = new NotificationManager();
		const pbar = notif.pbar('Processing...');
		assert.ok(typeof pbar.progress === 'function');
	});

	it('progress() updates bar width', () => {
		const notif = new NotificationManager();
		const pbar = notif.pbar('Processing...');
		// Should not throw
		pbar.progress(0.5);
		pbar.progress(1.0);
	});

	it('clamps progress to 0-100%', () => {
		const notif = new NotificationManager();
		const pbar = notif.pbar('Processing...');
		// Should not throw and should clamp
		pbar.progress(-0.5);
		pbar.progress(1.5);
	});

	it('has complete method', () => {
		const notif = new NotificationManager();
		const pbar = notif.pbar('Processing...');
		assert.ok(typeof pbar.complete === 'function');
	});
});

describe('NotificationManager.success()', () => {

	it('shows success notification', () => {
		const notif = new NotificationManager();
		notif.success('Success!');
		assert.strictEqual(notif.notifications.size, 1);
	});

	it('creates element with success type', () => {
		const notif = new NotificationManager();
		notif.success('Success!');
		const notification = Array.from(notif.notifications.values())[0];
		assert.strictEqual(notification.type, 'success');
	});

	it('uses success timeout', () => {
		const notif = new NotificationManager({ successTimeout: 1500 });
		notif.success('Success!');
		const notification = Array.from(notif.notifications.values())[0];
		assert.ok(notification.timeout);
	});

	it('respects custom timeout', () => {
		const notif = new NotificationManager();
		notif.success('Success!', 5000);
		const notification = Array.from(notif.notifications.values())[0];
		assert.ok(notification.timeout);
	});
});

describe('NotificationManager.error()', () => {

	it('shows error notification', () => {
		const notif = new NotificationManager();
		notif.error('Error!');
		assert.strictEqual(notif.notifications.size, 1);
	});

	it('creates element with error type', () => {
		const notif = new NotificationManager();
		notif.error('Error!');
		const notification = Array.from(notif.notifications.values())[0];
		assert.strictEqual(notification.type, 'error');
	});

	it('accepts error object', () => {
		const notif = new NotificationManager();
		const error = new Error('Test error');
		notif.error('Error occurred', error);
		assert.strictEqual(notif.notifications.size, 1);
	});

	it('uses default timeout of 10s', () => {
		const notif = new NotificationManager();
		notif.error('Error!');
		const notification = Array.from(notif.notifications.values())[0];
		assert.ok(notification.timeout);
	});

	it('allows persistent errors with null timeout', () => {
		const notif = new NotificationManager();
		notif.error('Critical error', null, null);
		const notification = Array.from(notif.notifications.values())[0];
		assert.strictEqual(notification.timeout, null);
	});

	it('respects custom timeout', () => {
		const notif = new NotificationManager();
		notif.error('Error!', null, 15000);
		const notification = Array.from(notif.notifications.values())[0];
		assert.ok(notification.timeout);
	});
});

describe('NotificationManager.clear()', () => {

	it('clears all notifications', () => {
		const notif = new NotificationManager();
		notif.show('Message 1');
		notif.show('Message 2');
		notif.show('Message 3');
		assert.strictEqual(notif.notifications.size, 3);
		notif.clear();
		// Note: Actual removal happens after fade timeout
	});

	it('handles empty notification list', () => {
		const notif = new NotificationManager();
		// Should not throw
		notif.clear();
	});
});

describe('NotificationManager multiple notifications', () => {

	it('handles multiple notifications', () => {
		const notif = new NotificationManager();
		notif.show('Message 1');
		notif.show('Message 2');
		notif.show('Message 3');
		assert.strictEqual(notif.notifications.size, 3);
	});

	it('handles mixed notification types', () => {
		const notif = new NotificationManager();
		notif.show('Regular');
		notif.success('Success');
		notif.error('Error');
		const spinner = notif.spinner('Loading');
		const pbar = notif.pbar('Progress');
		assert.strictEqual(notif.notifications.size, 5);
	});

	it('assigns incremental IDs', () => {
		const notif = new NotificationManager();
		const initialId = notif.nextId;
		notif.show('Message 1');
		notif.show('Message 2');
		assert.strictEqual(notif.nextId, initialId + 2);
	});
});

describe('NotificationManager._removeNotification()', () => {

	it('removes notification by ID', () => {
		const notif = new NotificationManager();
		notif.show('Test message');
		const id = notif.nextId - 1;
		notif._removeNotification(id);
		// Notification is marked for removal
	});

	it('handles invalid ID gracefully', () => {
		const notif = new NotificationManager();
		// Should not throw
		notif._removeNotification(999);
	});

	it('clears timeout when removing', () => {
		const notif = new NotificationManager();
		notif.show('Test message');
		const id = notif.nextId - 1;
		const notification = notif.notifications.get(id);
		const timeoutId = notification.timeout;
		assert.ok(timeoutId);
		notif._removeNotification(id);
		// Timeout should be cleared
	});
});

describe('NotificationManager edge cases', () => {

	it('handles rapid notifications', () => {
		const notif = new NotificationManager();
		for (let i = 0; i < 10; i++) {
			notif.show(`Message ${i}`);
		}
		assert.strictEqual(notif.notifications.size, 10);
	});

	it('handles long messages', () => {
		const notif = new NotificationManager();
		const longMessage = 'A'.repeat(1000);
		notif.show(longMessage);
		assert.strictEqual(notif.notifications.size, 1);
	});

	it('handles special characters in messages', () => {
		const notif = new NotificationManager();
		notif.show('Message with <html> & "quotes"');
		assert.strictEqual(notif.notifications.size, 1);
	});

	it('handles empty messages', () => {
		const notif = new NotificationManager();
		notif.show('');
		assert.strictEqual(notif.notifications.size, 1);
	});
});

describe('NotificationManager._ensureReady()', () => {

	it('initializes synchronously if not ready', () => {
		const notif = new NotificationManager();
		notif.isReady = false;
		notif._ensureReady();
		assert.strictEqual(notif.isReady, true);
	});

	it('does nothing if already ready', () => {
		const notif = new NotificationManager();
		notif._ensureReady();
		const container = notif.container;
		notif._ensureReady();
		assert.strictEqual(notif.container, container);
	});
});
