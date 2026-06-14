import React, { useEffect } from 'react';
import { formatKeyForPlatform, isMac } from '../utils/platform';
import { useTerminalStore } from '../state/terminal-store';

interface ShortcutsHelpProps {
  onClose: () => void;
}

const DEFAULT_SHOW_WINDOW_HOTKEY = 'CommandOrControl+Shift+Space';

// Render an Electron accelerator (e.g. "CommandOrControl+Shift+Space") for
// display. The global show-window hotkey is stored in accelerator form, not
// the renderer "Ctrl+Shift+X" form formatKeyForPlatform expects (TASK-197).
function displayAccelerator(s: string): string {
  if (!s) return 'Disabled';
  const parts = s.split('+').map((p) => {
    if (p === 'CommandOrControl' || p === 'CmdOrCtrl') return isMac ? '⌘' : 'Ctrl';
    if (p === 'Command' || p === 'Cmd' || p === 'Meta' || p === 'Super') return isMac ? '⌘' : 'Win';
    if (p === 'Control' || p === 'Ctrl') return 'Ctrl';
    if (p === 'Alt' || p === 'Option') return isMac ? '⌥' : 'Alt';
    if (p === 'Shift') return isMac ? '⇧' : 'Shift';
    if (p === 'Return') return 'Enter';
    return p;
  });
  return parts.join(isMac ? '' : '+');
}

const shortcuts = [
  { category: 'Terminals', items: [
    { key: 'Ctrl+T', action: 'New terminal (also Ctrl+Shift+N)' },
    { key: 'Ctrl+Shift+W', action: 'Close terminal' },
    { key: 'Ctrl+Shift+R', action: 'Rename terminal' },
    { key: 'Ctrl+Shift+G', action: 'Jump to terminal by name' },
    { key: 'Ctrl+Shift+J', action: 'Pane hints (press letter to jump)' },
    { key: 'Ctrl+Shift+P', action: 'Command palette' },
    { key: 'Ctrl+Shift+M', action: 'Open tab menu' },
    { key: 'Ctrl+Shift+D', action: 'Go to directory (favorites & recent)' },
  ]},
  { category: 'Navigation', items: [
    { key: 'Shift+Arrow', action: 'Move focus between panes' },
    { key: 'Ctrl+Shift+Xrrow', action: 'Move/swap terminal in direction' },
  ]},
  { category: 'Layout', items: [
    { key: 'Ctrl+Alt+Arrow', action: 'Split in direction' },
    { key: 'Ctrl+Shift+F', action: 'Toggle float / dock' },
    { key: 'Ctrl+Shift+Xlt+Arrow', action: 'Resize pane' },
    { key: 'Ctrl+Shift+E', action: 'Equalize all pane sizes' },
  ]},
  { category: 'Zoom', items: [
    { key: 'Ctrl+ + / Ctrl+Scroll Up', action: 'Zoom in' },
    { key: 'Ctrl+ - / Ctrl+Scroll Down', action: 'Zoom out' },
    { key: 'Ctrl+0', action: 'Reset zoom' },
  ]},
  { category: 'AI', items: [
    { key: 'Ctrl+Shift+K', action: 'Jump to prompt in terminal' },
    { key: 'Ctrl+Alt+E', action: 'Open prompt editor' },
    { key: 'Ctrl+Shift+C', action: 'AI Sessions panel' },
    { key: 'Ctrl+Alt+T', action: 'Toggle session transcript' },
  ]},
  { category: 'Other', items: [
    { key: 'Ctrl+Shift+B', action: 'Hide / show tab bar' },
    { key: 'Ctrl+Shift+X', action: 'File explorer' },
    { key: 'Ctrl+Shift+?', action: 'Show this help' },
    { key: 'Double-click tab', action: 'Rename terminal' },
    { key: 'Right-click tab', action: 'Context menu' },
    { key: 'Drag tab', action: 'Rearrange / split / float' },
  ]},
];

const ShortcutsHelp: React.FC<ShortcutsHelpProps> = ({ onClose }) => {
  // TASK-197: surface the global (OS-level) show/hide-tmax hotkey so users can
  // discover it. It's editable in Settings > Terminal > System; here it's
  // documented read-only. Reads the configured accelerator (or the default).
  const rawShowWindowHotkey = useTerminalStore(
    (s) => (s.config as any)?.showWindowHotkey,
  );
  const showWindowHotkey =
    rawShowWindowHotkey === undefined ? DEFAULT_SHOW_WINDOW_HOTKEY : rawShowWindowHotkey;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKey, true);
    return () => document.removeEventListener('keydown', handleKey, true);
  }, [onClose]);

  return (
    <div className="shortcuts-backdrop" onClick={onClose}>
      <div className="shortcuts-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-header">
          <span>Keyboard Shortcuts</span>
          <button className="shortcuts-close" onClick={onClose}>&#10005;</button>
        </div>
        <div className="shortcuts-body">
          {shortcuts.map((group) => (
            <div key={group.category} className="shortcuts-group">
              <div className="shortcuts-category">{group.category}</div>
              {group.items.map((item) => (
                <div key={item.key} className="shortcuts-row">
                  <kbd className="shortcuts-key">{formatKeyForPlatform(item.key)}</kbd>
                  <span className="shortcuts-action">{item.action}</span>
                </div>
              ))}
            </div>
          ))}
          {/* TASK-197: global OS-level hotkey, shown separately because it
              works even when tmax isn't focused and is configured in Settings. */}
          <div className="shortcuts-group">
            <div className="shortcuts-category">Global (works anywhere)</div>
            <div className="shortcuts-row">
              <kbd className="shortcuts-key">{displayAccelerator(showWindowHotkey)}</kbd>
              <span className="shortcuts-action">
                Show / focus tmax from any app (change in Settings &rsaquo; Terminal &rsaquo; System)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsHelp;
