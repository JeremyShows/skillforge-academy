# Platform Architecture V1.1

The Academy shell is a course library and launcher. The generic course, classroom planner, lecture runtime, instructor fallback, academic model, lab runtime, and CourseProgress authority live in reusable domain modules under `src/course`, `src/classroom`, `src/lecture`, `src/instructor`, `src/academic`, and `src/labs`.

Public certification adapters expose only authored capabilities. A+, Network+, and Security+ built-ins currently provide instructor and readings; they do not fabricate lecture delivery, academic assessments, mastery authority, or labs. A package can opt into those surfaces only when the corresponding authored contract is present.

