import { db, deleteLegacyData, readLegacyData } from './db'
import { checkBackup } from './importer/validate'
import { replaceAll } from './store'
import { buildShowcase } from './demo'
import { companyDay } from './dates'

/**
 * Optional local demo data. The dataset file (src/data/dataset-2024.json) is kept out of the
 * repository; when it is absent — e.g. on Vercel — there is no demo data.
 */
const local = import.meta.glob<unknown>('./data/dataset-2024.json', { eager: true, import: 'default' })
export const DEMO_DATA: unknown = Object.values(local)[0]

/**
 * Local-only mode start-up: if this device is empty, bring over data from the previous app
 * version, or else load the local demo data. (With cloud sync, data comes from the cloud and
 * old-version data is imported by an admin instead.)
 */
export async function prepareLocalData() {
  if ((await db.packages.count()) > 0) return
  const legacy = await readLegacyData()
  const source = legacy ?? DEMO_DATA
  if (!source) return
  const { data, errors } = checkBackup(source)
  if (!data) throw new Error(`Could not load existing data: ${errors[0]}`)
  await replaceAll(data)
  if (legacy) await deleteLegacyData()
}

/** "Reset to demo data" (local-only mode with the demo file present). */
export async function loadDemoData() {
  const { data, errors } = checkBackup(DEMO_DATA)
  if (!data) throw new Error(errors[0])
  await replaceAll(data)
}

/** Made-up presentation data (see demo.ts), worked out from today so it always looks current. */
export async function loadShowcaseData() {
  const { data, errors } = checkBackup(buildShowcase(companyDay()))
  if (!data) throw new Error(errors[0])
  await replaceAll(data)
}
