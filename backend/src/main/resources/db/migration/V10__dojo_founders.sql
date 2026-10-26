CREATE TABLE dojo_founder (
    dojo_id BIGINT NOT NULL,
    practitioner_id BIGINT NOT NULL,
    PRIMARY KEY (dojo_id, practitioner_id),
    CONSTRAINT fk_dojo_founder_dojo FOREIGN KEY (dojo_id) REFERENCES dojo (id) ON DELETE CASCADE,
    CONSTRAINT fk_dojo_founder_practitioner FOREIGN KEY (practitioner_id) REFERENCES practitioner (id) ON DELETE CASCADE
);

INSERT INTO dojo_founder (dojo_id, practitioner_id)
SELECT id, founder_id FROM dojo WHERE founder_id IS NOT NULL;

ALTER TABLE dojo DROP CONSTRAINT fk_dojo_founder;
ALTER TABLE dojo DROP COLUMN founder_id;
