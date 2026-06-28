// Module augmentation exposing Obsidian internal API members used by e2e tests.
// These members are not part of Obsidian's public API. They exist at runtime
// but are intentionally undocumented. Keep this surface minimal — add a member
// only when an e2e test demonstrably needs it, with a comment explaining why.
import 'obsidian'

declare module 'obsidian' {
  interface PluginsRegistry {
    readonly plugins: Record<string, unknown>
  }

  interface SettingManager {
    readonly pluginTabs: readonly { readonly id: string }[]
  }

  interface BasesPluginInstance {
    readonly registrations: Record<string, unknown>
  }

  interface BasesInternalPlugin {
    readonly instance?: BasesPluginInstance
  }

  interface InternalPluginsRegistry {
    readonly plugins: {
      readonly bases?: BasesInternalPlugin
    }
  }

  interface App {
    readonly plugins: PluginsRegistry
    readonly setting: SettingManager
    readonly internalPlugins: InternalPluginsRegistry
  }
}
