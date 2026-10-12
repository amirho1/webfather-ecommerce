import * as migration_20261001_150704_initial_schema from './20261001_150704_initial_schema'
import * as migration_20261011_141933_moftkhar_storefront_otp_toman from './20261011_141933_moftkhar_storefront_otp_toman'
import * as migration_20261012_103444_price_sort_index from './20261012_103444_price_sort_index'

export const migrations = [
  {
    up: migration_20261001_150704_initial_schema.up,
    down: migration_20261001_150704_initial_schema.down,
    name: '20261001_150704_initial_schema',
  },
  {
    up: migration_20261011_141933_moftkhar_storefront_otp_toman.up,
    down: migration_20261011_141933_moftkhar_storefront_otp_toman.down,
    name: '20261011_141933_moftkhar_storefront_otp_toman',
  },
  {
    up: migration_20261012_103444_price_sort_index.up,
    down: migration_20261012_103444_price_sort_index.down,
    name: '20261012_103444_price_sort_index',
  },
]
