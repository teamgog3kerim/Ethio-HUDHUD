import test from "node:test";
import assert from "node:assert/strict";
import { selectedCoursePlan } from "./billing-selection";
import { SelectCoursePlanBody } from "@workspace/api-zod";

test("only the three known learner preferences can be selected", () => {
  for (const plan of ["trial", "monthly", "six_month"]) {
    assert.equal(SelectCoursePlanBody.safeParse({ plan }).success, true);
    assert.equal(selectedCoursePlan({ selectedPlan: plan }), plan);
  }
  for (const plan of ["complimentary", "premium", "", null, 29, "https://other.example"]) {
    assert.equal(SelectCoursePlanBody.safeParse({ plan }).success, false);
    assert.equal(selectedCoursePlan({ selectedPlan: plan }), null);
  }
  for (const prefs of [null, undefined, {}, "monthly", []]) assert.equal(selectedCoursePlan(prefs), null);
});
