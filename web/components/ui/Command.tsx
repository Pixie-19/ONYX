// Re-export of the cmdk command primitive. The CommandPalette imports cmdk
// directly to avoid an extra component layer that can interfere with cmdk's
// internal selection state. This wrapper is kept as a one-line passthrough
// so anything wanting a project-relative path still resolves.
export { Command } from 'cmdk';
