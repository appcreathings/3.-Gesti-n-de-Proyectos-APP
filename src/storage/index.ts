import { DownloadAdapter } from "./DownloadAdapter";
import { FileSystemAdapter } from "./FileSystemAdapter";
import type { StorageAdapter } from "./StorageAdapter";

export * from "./StorageAdapter";
export { FileSystemAdapter } from "./FileSystemAdapter";
export { DownloadAdapter } from "./DownloadAdapter";

/** Pick the best adapter for the current browser. */
export function createStorageAdapter(): StorageAdapter {
  return FileSystemAdapter.isSupported()
    ? new FileSystemAdapter()
    : new DownloadAdapter();
}
