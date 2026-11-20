ALTER TABLE change_request ADD COLUMN submitter_token VARCHAR(64);
CREATE INDEX idx_change_request_token ON change_request (submitter_token);
