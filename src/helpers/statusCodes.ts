export const HttpStatus = {
    // 2xx: Success
    OK: 200, // Standard success
    CREATED: 201, // Resource created
    NO_CONTENT: 204, // Success, nothing to return (e.g. DELETE)

    // 4xx: Client / Domain errors
    BAD_REQUEST: 400, // Malformed request (missing JSON, invalid syntax)
    UNAUTHORIZED: 401, // Missing/invalid auth (not logged in)
    FORBIDDEN: 403, // Authenticated, but not allowed
    NOT_FOUND: 404, // Resource not found
    CONFLICT: 409, // Conflict (e.g. optimistic lock / unique constraint)
    UNPROCESSABLE_ENTITY: 422, // Validation error (input is understood, but invalid)
} as const

export type HttpStatusCode = (typeof HttpStatus)[keyof typeof HttpStatus]
