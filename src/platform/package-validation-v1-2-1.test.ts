import { describe, expect, it } from "vitest";
import type { GateActivity } from "../course/types";
import { fixture } from "./semantic-parity-v1-2.test";
import { parseCoursePackage, validateCoursePackage } from "./packageValidation";

function cloneFixture() { return structuredClone(fixture); }
function gate(document: ReturnType<typeof cloneFixture>) { return document.course.modules[0].lessons[0].activities.find(item => item.type === "mastery_check") as GateActivity; }

describe("V1.3 canonical package validation", () => {
  it.each([
    ["missing rubric", (document: ReturnType<typeof cloneFixture>) => { delete (gate(document) as unknown as Record<string, unknown>).rubric; }],
    ["empty rubric", (document: ReturnType<typeof cloneFixture>) => { gate(document).rubric = { requiredConcepts: [] }; }],
    ["invalid passScore", (document: ReturnType<typeof cloneFixture>) => { gate(document).passScore = 0; }],
    ["required criterion without signal", (document: ReturnType<typeof cloneFixture>) => { gate(document).rubric = { requiredConcepts: [{ id: "silent", label: "No signal", required: true, keywords: [] }] }; }]
  ])("rejects formal contract: %s", (_name, mutate) => {
    const document = cloneFixture(); mutate(document);
    expect(validateCoursePackage(document).errors.join(" ")).toMatch(/rubric|passScore|signal|criterion/i);
  });

  it("accepts valid formal and stage rubrics", () => {
    const document = cloneFixture();
    gate(document).rubric = { requiredConcepts: [{ id: "evidence", label: "Evidence", required: true, keywords: ["evidence"] }] };
    document.course.capstone.stages = [{ number: 1, title: "Stage", prompt: "Respond", rubric: { requiredConcepts: [{ id: "stage", label: "Stage evidence", required: true, keywords: ["evidence"] }] } }];
    expect(validateCoursePackage(document).errors).toEqual([]);
  });

  it("accepts canonical lecture interaction values and only migrates aliases at parse boundary", () => {
    for (const expectedInteraction of ["none", "free-response", "prediction", "question"] as const) {
      const document = cloneFixture(); document.lectures!.lectures[0].segments[0].expectedInteraction = expectedInteraction;
      expect(validateCoursePackage(document).errors).toEqual([]);
    }
    const unknown = cloneFixture(); (unknown.lectures!.lectures[0].segments[0] as unknown as Record<string, unknown>).expectedInteraction = "choice";
    expect(validateCoursePackage(unknown).errors.join(" ")).toContain("expectedInteraction is unknown");
    const migrated = parseCoursePackage(JSON.stringify(unknown));
    expect(migrated.report.errors).toEqual([]);
    expect(migrated.document?.lectures?.lectures[0].segments[0].expectedInteraction).toBe("question");
  });
});
