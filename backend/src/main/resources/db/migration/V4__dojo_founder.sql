ALTER TABLE dojo ADD COLUMN founded_date DATE;
ALTER TABLE dojo ADD COLUMN founder_id BIGINT;

UPDATE dojo SET founded_date = CAST(CAST(founded_year AS VARCHAR(4)) || '-01-01' AS DATE)
WHERE founded_year IS NOT NULL;

ALTER TABLE dojo DROP COLUMN founded_year;
ALTER TABLE dojo ADD CONSTRAINT fk_dojo_founder FOREIGN KEY (founder_id) REFERENCES practitioner (id) ON DELETE SET NULL;
