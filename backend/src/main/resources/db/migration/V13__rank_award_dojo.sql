ALTER TABLE rank_award ADD COLUMN dojo_id BIGINT;
ALTER TABLE rank_award ADD CONSTRAINT fk_rank_award_dojo FOREIGN KEY (dojo_id) REFERENCES dojo (id) ON DELETE SET NULL;
