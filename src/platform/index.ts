import { GitlabAdapter } from "./gitlab";

export interface PlatformAdapter {
  type: string;

  isSupported(): boolean;
}

export const adapters = Object.fromEntries(
  [new GitlabAdapter()].map((a) => [a.type, a])
);

export const adapterTypes = Object.keys(adapters);
