CREATE TABLE IF NOT EXISTS regions (
    code VARCHAR(20) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    level ENUM('province', 'city', 'district', 'village') NOT NULL,
    parent_code VARCHAR(20) NULL,
    latitude DECIMAL(10, 7) NULL,
    longitude DECIMAL(10, 7) NULL,
    INDEX idx_regions_parent (parent_code),
    INDEX idx_regions_level (level),
    CONSTRAINT fk_regions_parent FOREIGN KEY (parent_code) REFERENCES regions(code) ON UPDATE CASCADE ON DELETE RESTRICT
);

ALTER TABLE training_data
ADD COLUMN region_code VARCHAR(20) NULL AFTER volunteer_id,
ADD INDEX idx_training_data_region (region_code),
ADD CONSTRAINT fk_training_data_region FOREIGN KEY (region_code) REFERENCES regions(code) ON UPDATE CASCADE ON DELETE SET NULL;
