/**
 * Temporary script to workaround the following issues & protocol decisions:
 *
 * - https://github.com/neighbour-hoods/timetracking-applet/issues/13
 * - https://github.com/h-REA/hREA/issues/389
 * - https://lab.allmende.io/valueflows/vf-schemas/vf-graphql/-/merge_requests/115
 */

const fs = require('fs')
const path = require('path')

const REPLACEMENT_FILE_PATH = path.resolve(__dirname, './node_modules/.pnpm/@valueflows+vf-graphql-holochain@0.0.1-alpha.21/node_modules/@valueflows/vf-graphql-holochain/queries/unit.js')

const REPLACEMENT_FILE_CONTENTS = `/**
 * Top-level queries relating to Unit
 *
 * @package: HoloREA
 * @since:   2019-09-12
 */
import { mapZomeFn } from '../connection.js';
export default (dnaConfig, conductorUri) => {
    const readOne = mapZomeFn(dnaConfig, conductorUri, 'specification', 'unit', 'get_unit');
    const readOneBySymbol = mapZomeFn(dnaConfig, conductorUri, 'specification', 'unit', 'get_unit_by_symbol')
    const readAll = mapZomeFn(dnaConfig, conductorUri, 'specification', 'unit_index', 'read_all_units');
    return {
        unit: async (root, args) => {
          let res
          try {
            res = await readOne(args)
          } catch (e) {
            try {
              // attempt GUID-based read of Unit based on symbol
              res = await readOneBySymbol({ symbol: args.id })
            } catch (_retried) {
              // throw original (UUID-based) read error if both fail
              throw e
            }
          }
          return res.unit
        },
        units: async (root, args) => {
            return await readAll(args);
        },
    };
};
`

fs.writeFileSync(REPLACEMENT_FILE_PATH, REPLACEMENT_FILE_CONTENTS)
console.info(`Overwrote ${REPLACEMENT_FILE_PATH} with patched version for Units query workaround. Expect non-critical errors in conductor logs RE missing Unit records.`)
