import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

/** Adds indexed catalog prices and backfills existing products. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`products\` ADD \`sort_price\` numeric;`)
  await db.run(sql`ALTER TABLE \`products\` ADD \`has_price\` integer;`)
  await db.run(sql`CREATE INDEX \`products_sort_price_idx\` ON \`products\` (\`sort_price\`);`)
  await db.run(sql`CREATE INDEX \`products_has_price_idx\` ON \`products\` (\`has_price\`);`)
  await db.run(sql`ALTER TABLE \`_products_v\` ADD \`version_sort_price\` numeric;`)
  await db.run(sql`ALTER TABLE \`_products_v\` ADD \`version_has_price\` integer;`)
  await db.run(
    sql`CREATE INDEX \`_products_v_version_version_sort_price_idx\` ON \`_products_v\` (\`version_sort_price\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_products_v_version_version_has_price_idx\` ON \`_products_v\` (\`version_has_price\`);`,
  )
  await db.run(sql`UPDATE \`products\` AS p
    SET \`sort_price\` = COALESCE(
      (SELECT MIN(COALESCE(v.\`price_in_t_o_m_a_n\`, p.\`price_in_t_o_m_a_n\`))
       FROM \`variants\` AS v
       WHERE p.\`enable_variants\` = 1 AND v.\`product_id\` = p.\`id\` AND v.\`_status\` = 'published'),
      p.\`price_in_t_o_m_a_n\`
    );`)
  await db.run(sql`UPDATE \`products\` SET \`has_price\` = (\`sort_price\` IS NOT NULL);`)
}

/** Removes the catalog price indexes and fields. */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`products_sort_price_idx\`;`)
  await db.run(sql`DROP INDEX \`products_has_price_idx\`;`)
  await db.run(sql`ALTER TABLE \`products\` DROP COLUMN \`sort_price\`;`)
  await db.run(sql`ALTER TABLE \`products\` DROP COLUMN \`has_price\`;`)
  await db.run(sql`DROP INDEX \`_products_v_version_version_sort_price_idx\`;`)
  await db.run(sql`DROP INDEX \`_products_v_version_version_has_price_idx\`;`)
  await db.run(sql`ALTER TABLE \`_products_v\` DROP COLUMN \`version_sort_price\`;`)
  await db.run(sql`ALTER TABLE \`_products_v\` DROP COLUMN \`version_has_price\`;`)
}
