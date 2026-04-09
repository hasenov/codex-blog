export class ApplicationError extends Error {
    public readonly code: string;
    public readonly statusCode: number;

    public constructor(message: string, code: string, statusCode: number) {
        super(message);
        this.name = 'ApplicationError';
        this.code = code;
        this.statusCode = statusCode;
    }
}

export class ConflictError extends ApplicationError {
    public constructor(message: string, code = 'CONFLICT') {
        super(message, code, 409);
    }
}

export class UnauthorizedError extends ApplicationError {
    public constructor(message: string, code = 'UNAUTHORIZED') {
        super(message, code, 401);
    }
}

export class ForbiddenError extends ApplicationError {
    public constructor(message: string, code = 'FORBIDDEN') {
        super(message, code, 403);
    }
}

export class NotFoundError extends ApplicationError {
    public constructor(message: string, code = 'NOT_FOUND') {
        super(message, code, 404);
    }
}
