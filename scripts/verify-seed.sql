-- Verify table record counts
SELECT 
  (SELECT count(*) FROM universities) as universities_count,
  (SELECT count(*) FROM patterns) as patterns_count,
  (SELECT count(*) FROM branches) as branches_count,
  (SELECT count(*) FROM semesters) as semesters_count,
  (SELECT count(*) FROM subjects) as subjects_count,
  (SELECT count(*) FROM units) as units_count,
  (SELECT count(*) FROM syllabus_items) as syllabus_items_count,
  (SELECT count(*) FROM learning_topics) as learning_topics_count,
  (SELECT count(*) FROM resources) as resources_count;

-- Verify breakdown by subject and semester
SELECT 
  sem.semester_number,
  s.course_code,
  s.subject_name,
  count(DISTINCT u.id) as unit_count,
  count(si.id) as syllabus_item_count
FROM subjects s
JOIN semesters sem ON sem.id = s.semester_id
JOIN units u ON u.subject_id = s.id
JOIN syllabus_items si ON si.unit_id = u.id
GROUP BY sem.semester_number, s.course_code, s.subject_name
ORDER BY sem.semester_number, s.course_code;

-- Verify unit ordering per subject
SELECT 
  s.course_code,
  u.unit_number,
  u.unit_order,
  u.unit_name,
  count(si.id) as item_count
FROM subjects s
JOIN units u ON u.subject_id = s.id
JOIN syllabus_items si ON si.unit_id = u.id
GROUP BY s.course_code, u.unit_number, u.unit_order, u.unit_name
ORDER BY s.course_code, u.unit_order;
