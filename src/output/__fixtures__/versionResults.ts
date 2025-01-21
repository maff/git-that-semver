import type { VersionResult } from "../../version/versionResolver";

export const releaseVersionResult: VersionResult = {
  isSnapshotVersion: false,
  isTaggedVersion: true,
  isSemVerVersion: true,
  isReleaseSemVerVersion: true,
  isHighestSemVerVersion: true,
  isHighestSemVerReleaseVersion: true,
  isHighestSameMajorReleaseVersion: true,
  isHighestSameMinorReleaseVersion: true,
  strategies: {
    docker: {
      version: "1.0.0",
      tags: ["1.0.0", "1.0", "1", "latest"],
    },
    java: {
      version: "1.0.0",
      tags: [],
    },
  },
};

export const snapshotVersionResult: VersionResult = {
  isSnapshotVersion: true,
  isTaggedVersion: false,
  isSemVerVersion: false,
  isReleaseSemVerVersion: false,
  isHighestSemVerVersion: false,
  isHighestSemVerReleaseVersion: false,
  isHighestSameMajorReleaseVersion: false,
  isHighestSameMinorReleaseVersion: false,
  strategies: {
    docker: {
      version: "1.1.0-20240712221812.d382a736cbc1",
      tags: [
        "1.1.0-20240712221812.d382a736cbc1",
        "d382a736cbc13965792a331af59144f357e5669e",
        "main",
      ],
    },
    java: {
      version: "1.1.0-20240712221812.d382a736cbc1-SNAPSHOT",
      tags: [],
    },
  },
};
