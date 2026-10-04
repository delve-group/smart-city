-- Operations copy no longer says "demo" (D074). Rewrites stored labels written by earlier seeds and code.
UPDATE institutions SET name = 'Electricity Service' WHERE id = 'demo-electricity' AND name = 'Demo Electricity Service';
UPDATE institutions SET name = 'Water Service' WHERE id = 'demo-water' AND name = 'Demo Water Service';

UPDATE action_proposals
SET created_by = replace(created_by, 'Rule-based proposer (demo)', 'Rule-based proposer'),
    explanation = replace(explanation, 'configured demo responsibility rule', 'configured responsibility rule'),
    payload = replace(payload::text, '(demo identities, unverified)', '(unverified identities)')::jsonb
WHERE created_by LIKE '%(demo)%' OR explanation LIKE '%demo%' OR payload::text LIKE '%demo identities%';

UPDATE incident_evidence
SET source = replace(replace(source, 'Demo utility feed (fictional)', 'Utility feed'), 'Resident report (demo identity, unverified)', 'Resident report (unverified identity)'),
    label = replace(label, ' (demo reading)', ''),
    note = replace(note, 'No demo feed is configured', 'No feed is configured')
WHERE source LIKE '%demo%' OR source LIKE '%Demo%' OR label LIKE '%(demo reading)%' OR note LIKE '%demo feed%';

UPDATE incident_report_links SET reason = 'Explicit initial data link' WHERE reason = 'Explicit demo fixture link';
