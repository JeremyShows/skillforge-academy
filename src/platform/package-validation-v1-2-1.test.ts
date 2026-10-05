import { describe, expect, it } from "vitest";
import { fixture } from "./semantic-parity-v1-2.test";
import { parseCoursePackage, validateCoursePackage } from "./packageValidation";

function cloneFixture() { return structuredClone(fixture); }
function gate(document: ReturnType<typeof cloneFixture>) { return document.course.units[0].lessons[0].activities.find(item => item.type === "mastery_check")!; }

describe("V1.2.1 package contract validation", () => {
  it.each([
    ["missing rubric", (document: ReturnType<typeof cloneFixture>) => { delete gate(document).masteryRubric; }],
    ["empty rubric", (document: ReturnType<typeof cloneFixture>) => { gate(document).masteryRubric = []; }],
    ["invalid passScore", (document: ReturnType<typeof cloneFixture>) => { gate(document).passScore = 0; }],
    ["required criterion without signal", (document: ReturnType<typeof cloneFixture>) => { gate(document).masteryRubric = [{ id: "silent", description: "No signal", required: true, evidence: "self-assessed" }]; }]
  ])("rejects formal contract: %s", (_name, mutate) => {
    const document = cloneFixture(); mutate(document);
    expect(validateCoursePackage(document).errors.join(" ")).toMatch(/formal|rubric|passScore|signal/i);
  });

  it("accepts valid formal and stage rubrics", () => {
    const document = cloneFixture();
    gate(document).stages = [{ number: 1, title: "Stage", prompt: "Respond", required: true, rubric: [{ id: "stage", description: "Stage evidence", required: true, evidence: "self-assessed", keywords: ["evidence"] }] }];
    expect(validateCoursePackage(document).errors).toEqual([]);
  });

  it("accepts all four canonical lecture interaction values and rejects unknown values", () => {
    for (const responseType of ["none", "free-response", "prediction", "question"] as const) {
      const document = cloneFixture(); document.lectures!.lectures[0].segments[0].interaction = { responseType };
      expect(validateCoursePackage(document).errors).toEqual([]);
    }
    const unknown = cloneFixture(); (unknown.lectures!.lectures[0].segments[0].interaction as { responseType: string }).responseType = "choice";
    expect(validateCoursePackage(unknown).errors.join(" ")).toContain("responseType is unknown");
    const migrated = parseCoursePackage(JSON.stringify(unknown));
    expect(migrated.report.errors).toEqual([]);
    expect(migrated.document?.lectures?.lectures[0].segments[0].interaction?.responseType).toBe("question");
  });
});
