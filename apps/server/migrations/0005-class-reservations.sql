CREATE TABLE class_reservations (
  campaign_id uuid NOT NULL REFERENCES campaigns(id),
  class_id text NOT NULL CHECK (class_id IN ('paladin', 'warrior', 'mage')),
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (campaign_id, class_id),
  UNIQUE (campaign_id, token_hash)
);
