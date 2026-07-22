UPDATE "ProviderKey"
SET "pricing" = CASE "defaultModel"
  WHEN 'gpt-5.6' THEN '{"inputPerMillion":5,"cachedInputPerMillion":0.5,"outputPerMillion":30}'::jsonb
  WHEN 'gpt-5.6-terra' THEN '{"inputPerMillion":2.5,"cachedInputPerMillion":0.25,"outputPerMillion":15}'::jsonb
  WHEN 'gpt-5.6-luna' THEN '{"inputPerMillion":1,"cachedInputPerMillion":0.1,"outputPerMillion":6}'::jsonb
  WHEN 'gpt-5' THEN '{"inputPerMillion":1.25,"cachedInputPerMillion":0.125,"outputPerMillion":10}'::jsonb
  WHEN 'gpt-5-mini' THEN '{"inputPerMillion":0.25,"cachedInputPerMillion":0.025,"outputPerMillion":2}'::jsonb
  WHEN 'claude-opus-4-1-20250805' THEN '{"inputPerMillion":15,"cachedInputPerMillion":1.5,"outputPerMillion":75}'::jsonb
  WHEN 'claude-sonnet-4-20250514' THEN '{"inputPerMillion":3,"cachedInputPerMillion":0.3,"outputPerMillion":15}'::jsonb
  WHEN 'claude-3-5-haiku-latest' THEN '{"inputPerMillion":0.8,"cachedInputPerMillion":0.08,"outputPerMillion":4}'::jsonb
  WHEN 'gemini-2.5-flash' THEN '{"inputPerMillion":0.3,"cachedInputPerMillion":0.03,"outputPerMillion":2.5}'::jsonb
  WHEN 'gemini-2.5-flash-lite' THEN '{"inputPerMillion":0.1,"cachedInputPerMillion":0.01,"outputPerMillion":0.4}'::jsonb
  ELSE "pricing"
END
WHERE "defaultModel" IN (
  'gpt-5.6', 'gpt-5.6-terra', 'gpt-5.6-luna', 'gpt-5', 'gpt-5-mini',
  'claude-opus-4-1-20250805', 'claude-sonnet-4-20250514', 'claude-3-5-haiku-latest',
  'gemini-2.5-flash', 'gemini-2.5-flash-lite'
);
