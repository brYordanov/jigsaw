export const getById = (pool: any, cols: string, table: string, id: number) => {
    return pool.query(`SELECT ${cols} FROM ${table} WHERE id=$1`, [id])
}
