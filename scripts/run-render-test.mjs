/** test-render.tsx 를 esbuild 로 묶어 Node 에서 실행한다. */
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const bundle = join(tmpdir(), 'sokoban-render-test.cjs')

execFileSync(
  'npx',
  [
    'esbuild',
    join(here, 'test-render.tsx'),
    '--bundle',
    '--platform=node',
    '--format=cjs',
    '--jsx=automatic',
    '--loader:.json=json',
    '--loader:.css=empty',
    `--outfile=${bundle}`,
    '--log-level=error',
  ],
  { stdio: 'inherit', cwd: join(here, '..') },
)

execFileSync('node', [bundle], { stdio: 'inherit' })
