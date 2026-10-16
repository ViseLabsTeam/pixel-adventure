-- Preserve the previous save before upgrading demo rules; command receipts remain intact.
CREATE TABLE IF NOT EXISTS campaign_save_backups (
 campaign_id uuid NOT NULL, migration text NOT NULL, snapshot jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(campaign_id,migration)
);
INSERT INTO campaign_save_backups(campaign_id,migration,snapshot)
SELECT id,'0003-class-resources',snapshot FROM campaigns WHERE snapshot->>'saveSchemaVersion'='1'
ON CONFLICT DO NOTHING;
UPDATE campaigns c SET snapshot = c.snapshot || jsonb_build_object(
 'saveSchemaVersion',2,'rulesVersion','0.5-demo','contentVersion','prototype-content-0.2.0',
 'players',COALESCE((SELECT jsonb_agg(p || jsonb_build_object('resource',100,'hp',LEAST((p->>'hp')::int,CASE p->>'classId' WHEN 'paladin' THEN 60 WHEN 'warrior' THEN 48 ELSE 32 END),'stats',(p->'stats') || CASE p->>'classId'
 WHEN 'paladin' THEN '{"maxHp":60,"defense":6,"resistance":2,"damageMultiplier":0.65}'::jsonb
 WHEN 'warrior' THEN '{"maxHp":48,"defense":3,"resistance":1,"damageMultiplier":1}'::jsonb
 ELSE '{"maxHp":32,"defense":1,"resistance":6,"damageMultiplier":1.35}'::jsonb END) ORDER BY ord)
 FROM jsonb_array_elements(c.snapshot->'players') WITH ORDINALITY AS entries(p,ord)),'[]'::jsonb),
 'items',COALESCE((SELECT jsonb_object_agg(k,v || jsonb_build_object('restoreResource',CASE WHEN v->>'definitionId'='potion' THEN 100 ELSE 0 END)) FROM jsonb_each(c.snapshot->'items') AS items(k,v)),'{}'::jsonb)
) WHERE c.snapshot->>'saveSchemaVersion'='1';
