import type { AcademicCatalog } from "../academic/types";
import type { Course, CourseActivity, CourseAssessment, CourseModule } from "../course/types";
import type { InstructorMode } from "../instructor/types";
import type { LabCatalog } from "../labs/types";
import type { LectureCatalog } from "../lecture/types";

/** The package boundary is a transport envelope around the authored runtime model. */
export const COURSE_PACKAGE_FORMAT = "skillforge-course" as const;
export const COURSE_PACKAGE_FORMAT_VERSION = 1 as const;

export const PACKAGE_CAPABILITIES = [
  "lecture-delivery", "instructor", "readings", "assignments", "assessments", "remediation",
  "deterministic-labs", "executable-rust-lab", "disposable-linux-runtime", "network-simulation"
] as const;

export type PackageCapability = typeof PACKAGE_CAPABILITIES[number];
export type SupportedPackageCapability = Exclude<PackageCapability, "executable-rust-lab" | "disposable-linux-runtime" | "network-simulation">;
export type PackageJsonValue = string | number | boolean | null | PackageJsonValue[] | { [key: string]: PackageJsonValue };

export interface CoursePackageManifest {
  format: typeof COURSE_PACKAGE_FORMAT;
  formatVersion: typeof COURSE_PACKAGE_FORMAT_VERSION;
  packageId: string;
  packageVersion: string;
  courseId: string;
  courseVersion: string;
  contentVersion: string;
  title: string;
  description: string;
  publisher?: string;
  authors?: string[];
  license?: string;
  minimumSkillForgeVersion?: string;
  capabilities: PackageCapability[];
  visibilityMetadata?: { audience: "public" | "private" | "local" | "enterprise"; builtIn?: boolean };
  createdAt?: string;
  provenance?: { source?: "built-in" | "local-import" | "private-conformance"; sha256?: string; signatureStatus?: "unsigned" | "verified" | "unverified"; sourceRevision?: string };
  extensionMetadata?: Record<string, PackageJsonValue>;
}

/** Retained only for package assets and authored cross-references outside Course. */
export interface PackageLocation { unitId: string; lessonId?: string; activityId?: string; }

/** Canonical authored aliases. These names ease package call sites without creating a second model. */
export type CoursePackageActivity = CourseActivity;
export type CoursePackageAssessment = CourseAssessment;
export type CoursePackageUnit = CourseModule;

export interface CoursePackageInstructorProfile {
  id: string;
  displayRole: string;
  subjectScope: string;
  pedagogicalInstructions: string[];
  allowedModes: InstructorMode[];
  fallbackLanguage: string;
  fallbackContext?: string;
}

export interface CoursePackageAsset { id: string; kind: "image" | "diagram" | "text"; label: string; mediaType: string; byteLength: number; }
export interface CoursePackageMigration { fromCourseVersion: string; toCourseVersion: string; strategy: "preserve" | "reset-required" | "manual-review"; notes: string; }

export interface CoursePackageDocument {
  manifest: CoursePackageManifest;
  /** The exact authored Course object consumed by CourseProgress and Classroom. */
  course: Course;
  /** These catalogs are already the runtime-authoritative authored catalogs. */
  lectures?: LectureCatalog;
  instructor?: CoursePackageInstructorProfile;
  academic?: AcademicCatalog;
  labs?: LabCatalog;
  assets?: CoursePackageAsset[];
  migrations?: CoursePackageMigration[];
  extensionMetadata?: Record<string, PackageJsonValue>;
}
