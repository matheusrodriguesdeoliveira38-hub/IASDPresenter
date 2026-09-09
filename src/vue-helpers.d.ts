import "vue";

declare module "vue" {
  interface ComponentCustomProperties {
    $userdata: typeof import("./helpers/UserData").default;
    $appdata: typeof import("./helpers/AppData").default;
    $modules: typeof import("./helpers/Modules").default;
    $dev: typeof import("./helpers/Dev").default;
    $string: typeof import("./helpers/String").default;
    $datetime: typeof import("./helpers/DateTime").default;
    $theme: typeof import("./helpers/Theme").default;
    $path: typeof import("./helpers/Path").default;
    $media: typeof import("./helpers/Media").default;
    $alert: typeof import("./helpers/Alert").default;
    $popup: typeof import("./helpers/Popup").default;
    $database: typeof import("./helpers/Database").default;
    $history: typeof import("./helpers/History").default;
    $localFile: typeof import("./helpers/LocalFile").default;
    $performance: typeof import("./helpers/Performance").default;
    $automation: typeof import("./helpers/Automation").default;
  }
}
