# Formal evaluation fail-closed evidence

Formal activity types (`mastery_check`, `module_assessment`, and `capstone_activity`) require a pass score in `(0, 1]`, a non-empty rubric, and a deterministic keyword or pattern signal for each required criterion. The canonical validator rejects missing, empty, invalid, and non-deterministic rubrics.

The runtime evaluator returns failed evidence when the semantic contract is invalid, when the response is blank or wrong, and when no required criterion is satisfied. It does not convert a formal activity into completion merely because it was opened or submitted. The public test suite exercises invalid package rejection, empty-response failure, wrong-response failure, remediation, and a valid evidence retry.
