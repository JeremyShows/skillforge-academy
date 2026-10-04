# Persistence authority

PlatformHub writes course progress only through the versioned platform learner
envelope. The legacy `skillforge-course-progress-v1` key remains a migration
read source. Package identity metadata is updated on CourseRegistry install,
update, and removal, and envelope backup tests retain both identity and course
state.
