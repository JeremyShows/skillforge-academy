import type { CoursePackageDocument, CoursePackageManifest, PackageCapability } from "./packageTypes";
import { parseCoursePackage, serializeCoursePackage, validateCoursePackage, type PackageValidationReport } from "./packageValidation";

const REGISTRY_STORAGE_KEY = "skillforge-course-registry-v1";

export interface InstalledPackageRecord {
  document: CoursePackageDocument;
  installedAt: string;
  source: "local-import";
}

export interface RegistryInstallResult {
  installed: boolean;
  updated: boolean;
  errors: string[];
  unsupportedCapabilities: PackageCapability[];
  package?: CoursePackageDocument;
}

export interface RegistryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function storageOrUndefined(): RegistryStorage | undefined {
  try { return typeof localStorage === "undefined" ? undefined : localStorage; } catch { return undefined; }
}

function compareVersions(left: string, right: string): number {
  const parse = (value: string) => {
    const [core, prerelease = ""] = value.split("-", 2);
    return { core: core.split(".").map(Number), prerelease: prerelease ? prerelease.split(".") : [] };
  };
  const a = parse(left), b = parse(right);
  for (let index = 0; index < 3; index++) {
    const delta = (a.core[index] ?? 0) - (b.core[index] ?? 0);
    if (delta) return delta;
  }
  if (!a.prerelease.length && b.prerelease.length) return 1;
  if (a.prerelease.length && !b.prerelease.length) return -1;
  for (let index = 0; index < Math.max(a.prerelease.length, b.prerelease.length); index++) {
    const leftPart = a.prerelease[index], rightPart = b.prerelease[index];
    if (leftPart === undefined) return -1;
    if (rightPart === undefined) return 1;
    const leftNumber = /^\\d+$/.test(leftPart) ? Number(leftPart) : undefined;
    const rightNumber = /^\\d+$/.test(rightPart) ? Number(rightPart) : undefined;
    if (leftNumber !== undefined && rightNumber !== undefined && leftNumber !== rightNumber) return leftNumber - rightNumber;
    if (leftNumber !== undefined && rightNumber === undefined) return -1;
    if (leftNumber === undefined && rightNumber !== undefined) return 1;
    if (leftPart !== rightPart) return leftPart < rightPart ? -1 : 1;
  }
  return 0;
}

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

export class CourseRegistry {
  private readonly builtInPackages: CoursePackageDocument[];
  private readonly installedPackages = new Map<string, InstalledPackageRecord>();
  private readonly storage?: RegistryStorage;

  constructor(builtInPackages: CoursePackageDocument[], storage: RegistryStorage | undefined = storageOrUndefined()) {
    this.builtInPackages = builtInPackages.map(clone);
    this.storage = storage;
    const raw = storage?.getItem(REGISTRY_STORAGE_KEY);
    if (!raw) return;
    try {
      const values = JSON.parse(raw) as unknown;
      if (Array.isArray(values)) values.forEach(value => {
        const report = validateCoursePackage(value);
        if (!report.errors.length && value && typeof value === "object" && "manifest" in value) {
          const document = value as CoursePackageDocument;
          this.installedPackages.set(document.manifest.packageId, { document: clone(document), installedAt: new Date().toISOString(), source: "local-import" });
        }
      });
    } catch { /* malformed local registry is ignored; built-ins remain available */ }
  }

  private persist(): void {
    if (!this.storage) return;
    try { this.storage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify([...this.installedPackages.values()].map(record => record.document))); } catch { /* local storage can be unavailable */ }
  }

  packageById(packageId: string): CoursePackageDocument | undefined {
    const installed = this.installedPackages.get(packageId)?.document;
    return installed ? clone(installed) : clone(this.builtInPackages.find(item => item.manifest.packageId === packageId));
  }

  packages(): CoursePackageDocument[] {
    const builtInIds = new Set(this.builtInPackages.map(item => item.manifest.packageId));
    return [...this.builtInPackages, ...[...this.installedPackages.values()].map(record => record.document).filter(item => !builtInIds.has(item.manifest.packageId))].map(clone);
  }

  courses(): CoursePackageDocument["course"][] { return this.packages().map(item => clone(item.course)); }

  validate(input: unknown): PackageValidationReport { return validateCoursePackage(input); }

  install(input: string | CoursePackageDocument): RegistryInstallResult {
    const parsed = typeof input === "string" ? parseCoursePackage(input) : { document: input, report: validateCoursePackage(input) };
    if (!parsed.document || parsed.report.errors.length) return { installed: false, updated: false, errors: parsed.report.errors, unsupportedCapabilities: parsed.report.unsupportedCapabilities };
    if (parsed.report.unsupportedCapabilities.length) return { installed: false, updated: false, errors: [], unsupportedCapabilities: parsed.report.unsupportedCapabilities, package: clone(parsed.document) };
    const document = clone(parsed.document);
    const packageId = document.manifest.packageId;
    if (this.builtInPackages.some(item => item.manifest.packageId === packageId)) return { installed: false, updated: false, errors: [`${packageId} is already provided as a built-in package`], unsupportedCapabilities: [] };
    const existing = this.installedPackages.get(packageId)?.document;
    if (existing && compareVersions(document.manifest.packageVersion, existing.manifest.packageVersion) <= 0) return { installed: false, updated: false, errors: ["package update must have a higher packageVersion"], unsupportedCapabilities: [] };
    this.installedPackages.set(packageId, { document, installedAt: new Date().toISOString(), source: "local-import" });
    this.persist();
    return { installed: true, updated: Boolean(existing), errors: [], unsupportedCapabilities: [], package: clone(document) };
  }

  remove(packageId: string, hasLearnerProgress: boolean): { removed: boolean; archivedProgress: boolean; error?: string } {
    if (this.builtInPackages.some(item => item.manifest.packageId === packageId)) return { removed: false, archivedProgress: false, error: "built-in packages cannot be removed" };
    if (!this.installedPackages.has(packageId)) return { removed: false, archivedProgress: false, error: "package is not installed" };
    this.installedPackages.delete(packageId);
    this.persist();
    return { removed: true, archivedProgress: hasLearnerProgress };
  }

  export(packageId: string): string | undefined {
    const document = this.packageById(packageId);
    return document ? serializeCoursePackage(document) : undefined;
  }

  static storageKey(): string { return REGISTRY_STORAGE_KEY; }
}

