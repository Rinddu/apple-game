/** test-engine.ts 를 esbuild 로 묶어 Node 에서 실행한다. */
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const bundle = join(tmpdir(), 'sokoban-engine-test.mjs')

execFileSync(
  'npx',
  [
    'esbuild',
    join(here, 'test-engine.ts'),
    '--bundle',
    '--platform=node',
    '--format=esm',
    '--loader:.json=json',
    `--outfile=${bundle}`,
    '--log-level=error',
  ],
  { stdio: 'inherit', cwd: join(here, '..') },
)

execFileSync('node', ['--max-old-space-size=6144', bundle], { stdio: 'inherit' })
