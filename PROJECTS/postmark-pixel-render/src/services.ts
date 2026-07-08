// PostmarkServices — the adapter that replaces npcts's shell-execution model
// with a whitelisted action vocabulary. THIS FILE IS THE SECURITY BOUNDARY:
// the town repo merges resident PRs, resident content flows into the compiled
// world config, and nothing that arrives that way may ever reach a shell or
// an arbitrary origin. Commands here are verbs we mint, not strings we obey.
//
//   open:<path-or-url>   — open a page. Only same-origin paths and the two
//                          trusted hosts (the site, the town repo on GitHub)
//                          pass; anything else is refused loudly.
//
// saveConfig is disabled by design in this deploy: the walk is derived from
// the town, so shape changes happen as PRs in the town repo, never here.

import type {
  SpatialConfigClient,
  CommandExecutionClient,
  ImageUploadClient,
  SpatialWorldConfig,
  CommandResult,
  ImageUploadResult,
} from "npcts/core";

const TRUSTED_HOSTS = new Set(["starforge-atelier.online", "github.com", "raw.githubusercontent.com"]);

function openIsAllowed(target: string): boolean {
  if (target.startsWith("/")) return true; // same-origin path
  try {
    const u = new URL(target);
    return u.protocol === "https:" && TRUSTED_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

export const configClient: SpatialConfigClient = {
  async loadConfig(): Promise<SpatialWorldConfig | null> {
    const res = await fetch(`${import.meta.env.BASE_URL}world.json`);
    if (!res.ok) return null;
    return (await res.json()) as SpatialWorldConfig;
  },
  async saveConfig(): Promise<void> {
    // Derived world: the town repo is the only author. Refuse quietly but
    // visibly, so edit-mode experiments can't silently pretend to persist.
    console.warn("postmark-walk: saveConfig is disabled — the town repo is the source of truth");
  },
};

export const commandClient: CommandExecutionClient = {
  async executeCommand(command: string): Promise<CommandResult> {
    if (command.startsWith("enter:")) {
      // navigate into a room (a building on the outside). The verb is bridged
      // to SpatialContext by the Teleporter component in App.tsx — the command
      // layer itself never touches navigation state directly.
      const room = command.slice(6);
      window.dispatchEvent(new CustomEvent("postmark-enter", { detail: room }));
      return { stdout: `entering ${room}`, exitCode: 0 };
    }
    if (command.startsWith("open:")) {
      const target = command.slice(5);
      if (openIsAllowed(target)) {
        window.open(target, "_blank", "noopener");
        return { stdout: `opened ${target}`, exitCode: 0 };
      }
      return { error: `refused: ${target} is not a trusted destination`, exitCode: 1 };
    }
    return { error: `refused: unknown action verb in "${command}"`, exitCode: 1 };
  },
  async getRunningApps() {
    return [];
  },
};

export const imageClient: ImageUploadClient = {
  async uploadImage(): Promise<ImageUploadResult> {
    throw new Error("postmark-walk: image upload is disabled — images come from the town repo");
  },
};
