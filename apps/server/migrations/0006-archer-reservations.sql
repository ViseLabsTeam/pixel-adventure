ALTER TABLE class_reservations
  DROP CONSTRAINT class_reservations_class_id_check;
ALTER TABLE class_reservations
  ADD CONSTRAINT class_reservations_class_id_check
  CHECK (class_id IN ('paladin', 'warrior', 'mage', 'archer'));
