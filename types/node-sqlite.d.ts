declare module 'node:sqlite' {
  export class DatabaseSync {
    constructor(path: string)
    isTransaction: boolean
    exec(sql: string): void
    prepare(sql: string): StatementSync
    close(): void
  }

  export class StatementSync {
    all(...params: unknown[]): Record<string, unknown>[]
    get(...params: unknown[]): Record<string, unknown> | undefined
    run(...params: unknown[]): { lastInsertRowid: number | bigint; changes: number | bigint }
  }
}
