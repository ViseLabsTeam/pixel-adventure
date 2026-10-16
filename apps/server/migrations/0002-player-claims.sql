CREATE TABLE player_claims (
 code_hash text PRIMARY KEY,
 campaign_id uuid NOT NULL REFERENCES campaigns(id),
 player_id uuid NOT NULL REFERENCES campaign_players(id),
 expires_at timestamptz NOT NULL,
 UNIQUE(campaign_id, player_id)
);
