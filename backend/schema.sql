-- FreeBoard schema — MySQL 8+
CREATE DATABASE IF NOT EXISTS freeboard CHARACTER SET utf8mb4;
USE freeboard;

CREATE TABLE users (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  google_sub      VARCHAR(255) NOT NULL UNIQUE,   -- Google's stable user id
  email           VARCHAR(255) NOT NULL UNIQUE,
  username        VARCHAR(30)  NOT NULL UNIQUE,   -- chosen once at signup, searchable
  display_name    VARCHAR(100) NOT NULL,
  avatar_url      VARCHAR(500) DEFAULT NULL,
  privacy         ENUM('public','connections','private') NOT NULL DEFAULT 'connections',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_username (username)
) ENGINE=InnoDB;

CREATE TABLE timetable_entries (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      BIGINT UNSIGNED NOT NULL,
  day          ENUM('Monday','Tuesday','Wednesday','Thursday','Friday') NOT NULL,
  slot_index   TINYINT UNSIGNED NOT NULL,          -- 0..7, matches the 8 daily periods
  label        VARCHAR(80) NOT NULL DEFAULT 'Class',
  is_free      BOOLEAN NOT NULL DEFAULT FALSE,
  source       ENUM('manual','ocr') NOT NULL DEFAULT 'manual',
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_slot (user_id, day, slot_index),
  CONSTRAINT fk_tt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- "owner adds other to their board" — People/Together only show accounts you've added
CREATE TABLE connections (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  owner_user_id  BIGINT UNSIGNED NOT NULL,
  other_user_id  BIGINT UNSIGNED NOT NULL,
  status         ENUM('pending','accepted','declined') NOT NULL DEFAULT 'pending',
  nickname       VARCHAR(100) DEFAULT NULL,  -- owner's private label for other_user; only owner sees it
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_edge (owner_user_id, other_user_id),
  CONSTRAINT fk_conn_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_conn_other FOREIGN KEY (other_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_not_self CHECK (owner_user_id <> other_user_id)
) ENGINE=InnoDB;

