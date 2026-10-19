-- Keep every campaign identity, receipt and revision while enlarging the demo world.
INSERT INTO campaign_save_backups(campaign_id,migration,snapshot)
SELECT id,'0004-explorable-courtyard',snapshot FROM campaigns
WHERE snapshot->>'contentVersion'='prototype-content-0.2.0'
ON CONFLICT DO NOTHING;

UPDATE campaigns c SET snapshot = c.snapshot || jsonb_build_object(
  'contentVersion','prototype-content-0.3.0',
  'map',(c.snapshot->'map') || '{"minX":-21,"minY":-21,"width":58,"height":70}'::jsonb,
  'enemies',CASE WHEN c.snapshot->>'status' IN ('WON','LOST') OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(c.snapshot->'enemies') AS e(value)
    WHERE e.value->>'id'='goblin'
  ) THEN c.snapshot->'enemies' ELSE c.snapshot->'enemies' ||
    '{"id":"goblin","name":"Goblin de las ruinas","x":12,"y":6,"hp":20,"maxHp":20,"defense":1,"resistance":1,"accuracy":5,"dodge":4,"agility":4,"range":1,"movement":1}'::jsonb
  END
) WHERE c.snapshot->>'contentVersion'='prototype-content-0.2.0';
