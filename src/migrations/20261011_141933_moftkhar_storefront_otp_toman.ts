import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`_categories_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_title\` text,
  	\`version_subtitle\` text,
  	\`version_icon_key\` text,
  	\`version_generate_slug\` integer DEFAULT true,
  	\`version_slug\` text,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`categories\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_categories_v_parent_idx\` ON \`_categories_v\` (\`parent_id\`);`)
  await db.run(
    sql`CREATE INDEX \`_categories_v_version_version_slug_idx\` ON \`_categories_v\` (\`version_slug\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_categories_v_version_version_updated_at_idx\` ON \`_categories_v\` (\`version_updated_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_categories_v_version_version_created_at_idx\` ON \`_categories_v\` (\`version_created_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_categories_v_version_version__status_idx\` ON \`_categories_v\` (\`version__status\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_categories_v_created_at_idx\` ON \`_categories_v\` (\`created_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_categories_v_updated_at_idx\` ON \`_categories_v\` (\`updated_at\`);`,
  )
  await db.run(sql`CREATE INDEX \`_categories_v_latest_idx\` ON \`_categories_v\` (\`latest\`);`)
  await db.run(sql`CREATE TABLE \`otp_events\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`phone_number\` text NOT NULL,
  	\`ip_hash\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(
    sql`CREATE INDEX \`otp_events_phone_number_idx\` ON \`otp_events\` (\`phone_number\`);`,
  )
  await db.run(sql`CREATE INDEX \`otp_events_ip_hash_idx\` ON \`otp_events\` (\`ip_hash\`);`)
  await db.run(sql`CREATE INDEX \`otp_events_updated_at_idx\` ON \`otp_events\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`otp_events_created_at_idx\` ON \`otp_events\` (\`created_at\`);`)
  await db.run(
    sql`CREATE INDEX \`otp_events_phone_created_idx\` ON \`otp_events\` (\`phone_number\`, \`created_at\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`otp_events_ip_created_idx\` ON \`otp_events\` (\`ip_hash\`, \`created_at\`);`,
  )

  await db.run(sql`ALTER TABLE \`users\` ADD COLUMN \`phone_number\` text;`)
  await db.run(sql`ALTER TABLE \`users\` ADD COLUMN \`phone_verified\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`users\` ADD COLUMN \`otp\` text;`)
  await db.run(sql`ALTER TABLE \`users\` ADD COLUMN \`otp_expires_at\` text;`)
  await db.run(sql`ALTER TABLE \`users\` ADD COLUMN \`otp_attempts\` numeric DEFAULT 0;`)
  await db.run(sql`ALTER TABLE \`users\` ADD COLUMN \`otp_last_sent_at\` text;`)
  await db.run(sql`ALTER TABLE \`users\` ADD COLUMN \`session_version\` numeric DEFAULT 0;`)
  await db.run(sql`ALTER TABLE \`users\` ADD COLUMN \`username\` text;`)
  await db.run(
    sql`UPDATE \`users\` SET \`username\` = COALESCE(\`email\`, 'legacy-' || \`id\`) WHERE \`username\` IS NULL;`,
  )
  await db.run(sql`CREATE UNIQUE INDEX \`users_phone_number_idx\` ON \`users\` (\`phone_number\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`users_username_idx\` ON \`users\` (\`username\`);`)
  await db.run(sql`ALTER TABLE \`categories\` ADD COLUMN \`subtitle\` text;`)
  await db.run(sql`ALTER TABLE \`categories\` ADD COLUMN \`icon_key\` text;`)
  await db.run(sql`ALTER TABLE \`categories\` ADD COLUMN \`_status\` text DEFAULT 'published';`)
  await db.run(sql`CREATE INDEX \`categories__status_idx\` ON \`categories\` (\`_status\`);`)
  await db.run(sql`ALTER TABLE \`variants\` ADD COLUMN \`price_in_t_o_m_a_n_enabled\` integer;`)
  await db.run(sql`ALTER TABLE \`variants\` ADD COLUMN \`price_in_t_o_m_a_n\` numeric;`)
  await db.run(
    sql`ALTER TABLE \`_variants_v\` ADD COLUMN \`version_price_in_t_o_m_a_n_enabled\` integer;`,
  )
  await db.run(sql`ALTER TABLE \`_variants_v\` ADD COLUMN \`version_price_in_t_o_m_a_n\` numeric;`)
  await db.run(sql`ALTER TABLE \`products\` ADD COLUMN \`short_description\` text;`)
  await db.run(
    sql`ALTER TABLE \`products\` ADD COLUMN \`brand_logo_id\` integer REFERENCES media(id);`,
  )
  await db.run(sql`ALTER TABLE \`products\` ADD COLUMN \`badge_color\` text DEFAULT '#f1f4ff';`)
  await db.run(sql`ALTER TABLE \`products\` ADD COLUMN \`featured\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`products\` ADD COLUMN \`price_in_t_o_m_a_n_enabled\` integer;`)
  await db.run(sql`ALTER TABLE \`products\` ADD COLUMN \`price_in_t_o_m_a_n\` numeric;`)
  await db.run(sql`CREATE INDEX \`products_brand_logo_idx\` ON \`products\` (\`brand_logo_id\`);`)
  await db.run(sql`ALTER TABLE \`_products_v\` ADD COLUMN \`version_short_description\` text;`)
  await db.run(
    sql`ALTER TABLE \`_products_v\` ADD COLUMN \`version_brand_logo_id\` integer REFERENCES media(id);`,
  )
  await db.run(
    sql`ALTER TABLE \`_products_v\` ADD COLUMN \`version_badge_color\` text DEFAULT '#f1f4ff';`,
  )
  await db.run(
    sql`ALTER TABLE \`_products_v\` ADD COLUMN \`version_featured\` integer DEFAULT false;`,
  )
  await db.run(
    sql`ALTER TABLE \`_products_v\` ADD COLUMN \`version_price_in_t_o_m_a_n_enabled\` integer;`,
  )
  await db.run(sql`ALTER TABLE \`_products_v\` ADD COLUMN \`version_price_in_t_o_m_a_n\` numeric;`)
  await db.run(
    sql`CREATE INDEX \`_products_v_version_version_brand_logo_idx\` ON \`_products_v\` (\`version_brand_logo_id\`);`,
  )
  await db.run(
    sql`ALTER TABLE \`payload_locked_documents_rels\` ADD COLUMN \`otp_events_id\` integer REFERENCES otp_events(id);`,
  )
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_otp_events_id_idx\` ON \`payload_locked_documents_rels\` (\`otp_events_id\`);`,
  )
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX IF EXISTS \`payload_locked_documents_rels_otp_events_id_idx\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`_products_v_version_version_brand_logo_idx\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`products_brand_logo_idx\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`categories__status_idx\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`users_username_idx\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`users_phone_number_idx\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`otp_events_ip_created_idx\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`otp_events_phone_created_idx\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`otp_events_created_at_idx\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`otp_events_updated_at_idx\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`otp_events_ip_hash_idx\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`otp_events_phone_number_idx\`;`)
  await db.run(sql`DROP TABLE IF EXISTS \`otp_events\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`_categories_v_latest_idx\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`_categories_v_updated_at_idx\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`_categories_v_created_at_idx\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`_categories_v_version_version__status_idx\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`_categories_v_version_version_created_at_idx\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`_categories_v_version_version_updated_at_idx\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`_categories_v_version_version_slug_idx\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`_categories_v_parent_idx\`;`)
  await db.run(sql`DROP TABLE IF EXISTS \`_categories_v\`;`)
}
