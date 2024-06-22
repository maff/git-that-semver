import { Liquid } from "liquidjs";
import semver from "semver";
import { semVerVersionString } from "util/semVer";

const templateEngine = new Liquid();

// only allow alphanumeric characters at start and end
templateEngine.registerFilter("trim_alphanumeric", (v) =>
  v.replace(/^[^a-zA-Z0-9]/g, "").replace(/[^a-zA-Z0-9]$/g, ""),
);

templateEngine.registerFilter(
  "semver_inc",
  (version: string, releaseType: semver.ReleaseType) => {
    const parsed = semver.parse(version);
    if (!parsed) {
      throw new Error(`Invalid semver version: ${version}`);
    }

    return semVerVersionString(parsed.inc(releaseType));
  },
);

export { templateEngine };
