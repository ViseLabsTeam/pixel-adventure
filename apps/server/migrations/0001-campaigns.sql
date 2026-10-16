CREATE TABLE campaigns (
  id uuid PRIMARY KEY, code text NOT NULL UNIQUE, recovery_hash text NOT NULL UNIQUE,
  revision integer NOT NULL, snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE campaign_players (
  id uuid PRIMARY KEY, campaign_id uuid NOT NULL REFERENCES campaigns(id),
  slot integer NOT NULL CHECK (slot BETWEEN 0 AND 3), UNIQUE(campaign_id, slot)
);
CREATE TABLE sessions (
  token_hash text PRIMARY KEY, campaign_id uuid NOT NULL REFERENCES campaigns(id),
  role text NOT NULL CHECK (role IN ('PLAYER','DISPLAY','COORDINATOR')),
  player_id uuid REFERENCES campaign_players(id),
  CHECK ((role = 'PLAYER') = (player_id IS NOT NULL))
);
CREATE TABLE command_receipts (
  campaign_id uuid NOT NULL REFERENCES campaigns(id), actor_id text NOT NULL,
  command_id uuid NOT NULL, payload_hash text NOT NULL, result jsonb NOT NULL,
  PRIMARY KEY(campaign_id,actor_id,command_id)
);
CREATE TABLE campaign_events (
  event_id text PRIMARY KEY, campaign_id uuid NOT NULL REFERENCES campaigns(id),
  revision integer NOT NULL, event jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
