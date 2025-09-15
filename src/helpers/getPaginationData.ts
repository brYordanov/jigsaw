export const getPaginationData = ({
    limit,
    offset,
    total,
    filters,
}: {
    limit: number
    offset: number
    total: number
    filters: Record<string, any>
}) => {
    const toQueryString = (obj: Record<string, any>) =>
        '?' +
        Object.entries(obj)
            .filter(([_, v]) => v !== undefined && v !== null && v !== '')
            .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
            .join('&')

    const prevOffset = Math.max(0, offset - limit)
    const nextOffset = offset + limit < total ? offset + limit : null

    return {
        hasPrev: offset > 0,
        hasNext: nextOffset !== null,
        prevHref: offset > 0 ? toQueryString({ ...filters, limit, offset: prevOffset }) : null,
        nextHref:
            nextOffset !== null ? toQueryString({ ...filters, limit, offset: nextOffset }) : null,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(total / limit),
    }
}
