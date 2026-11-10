INSERT INTO polls (id, slug, title, question, currency, participation_fee_minor, is_active)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'sautiya-main-poll',
  'Featured poll',
  'Which perspective do you support?',
  'KES',
  1700,
  TRUE
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  question = EXCLUDED.question,
  currency = EXCLUDED.currency,
  participation_fee_minor = EXCLUDED.participation_fee_minor,
  is_active = EXCLUDED.is_active;

INSERT INTO poll_options (id, poll_id, code, label, position)
VALUES
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', 'WANTAM', 'WANTAM', 1),
  ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000001', 'TUTAM', 'TUTAM', 2)
ON CONFLICT (poll_id, code) DO UPDATE SET
  label = EXCLUDED.label,
  position = EXCLUDED.position;
