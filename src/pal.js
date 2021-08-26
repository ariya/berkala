/** PAL - Platform Abstraction Layer */
const os = require('os');
const child_process = require('child_process');

const which = require('which');
const say = require('say');

/**
 * Escape a string for PowerShell.
 * @param {string} str
 * @return {string}
 */
function psEscape(str) {
    let result = '';
    for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        if (ch.charCodeAt(0) === 39) {
            // single quote, escape it with another single quote
            result += ch;
        }
        result += ch;
    }
    return result;
}

/**
 * Send a desktop notification
 * @param {string} title
 * @param {string} message
 */
function platformNotify(title, message) {
    if (os.type() === 'Linux') {
        const resolved = which.sync('notify-send', { nothrow: true });
        if (resolved) {
            child_process.spawnSync('notify-send', ['-a', 'Berkala', title, message]);
        } else {
            console.error('notify: unable to locate notify-send');
            console.log(title + ':', message);
        }
    } else if (os.type() === 'Darwin') {
        const command = `display notification "${message}" with title "Berkala" subtitle "${title}"`;
        child_process.spawnSync('osascript', ['-e', command]);
    } else if (os.type() === 'Windows_NT') {
        const script = `
            [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null;
            $templateType = [Windows.UI.Notifications.ToastTemplateType]::ToastText02;
            $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent($templateType);
            $template.SelectSingleNode(\"//text[@id=1]\").InnerText = '${psEscape(title)}';
            $template.SelectSingleNode(\"//text[@id=2]\").InnerText = '${psEscape(message)}';
            $toast = [Windows.UI.Notifications.ToastNotification]::new($template);
            $notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Berkala');
            $notifier.Show($toast);`;

        child_process.execSync(script, { shell: 'powershell.exe' });
    } else {
        // FIXME what's this system?
        console.log(title, message);
    }
}

/**
 * Convert text to audible speech
 * @param {string} message
 */
function platformSay(message) {
    if (os.type() === 'Linux') {
        const resolved = which.sync('festival', { nothrow: true });
        if (resolved) {
            say.speak(message);
        } else {
            console.error('say: unable to locate Festival');
            platformNotify('Berkala', message);
        }
    } else if (os.type() === 'Windows_NT') {
        // TODO: check for Powershell first
        say.speak(psEscape(message));
    } else if (os.type() === 'Darwin') {
        say.speak(message, 'Samantha'); // Siri's voice
    } else {
        // unsupported
        console.error('say: unsupport system', os.type());
        platformNotify('Berkala', message);
    }
}

module.exports = {
    notify: platformNotify,
    say: platformSay
};
