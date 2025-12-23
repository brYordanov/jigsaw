import { promisify } from 'util'
import { execFile } from 'child_process'
import { ShellConfigDto } from '../../jobs/dtos/shell-config.dto'

const execFileAsync = promisify(execFile)
export const runShellJob = async (config: ShellConfigDto, signal?: AbortSignal) => {
    const { command, cwd, args, env } = config

    if (signal?.aborted) return { ok: false, error: 'aborted' }

    const envString: NodeJS.ProcessEnv = Object.fromEntries(
        Object.entries(env).map(([k, v]) => [k, v == null ? undefined : String(v)])
    )

    try {
        const { stdout, stderr } = await execFileAsync(command, args, {
            cwd,
            env: { ...process.env, ...envString },
            signal,
            encoding: 'utf8',
            maxBuffer: 10 * 1024 * 1024,
        })

        return {
            ok: true,
            result: stdout.toString().trim(),
            err: stderr.toString().trim(),
        }
    } catch (err: any) {
        const msg = err.name === 'AbortError' ? 'aborted' : (err.message ?? String(err))

        return {
            ok: false,
            error: msg,
            result: err?.stdout,
            err: err?.stderr,
        }
    }
}
