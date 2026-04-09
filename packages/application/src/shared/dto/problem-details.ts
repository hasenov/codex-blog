export interface ProblemDetailsDto {
    type: string;
    title: string;
    status: number;
    detail: string;
    code: string;
    correlationId?: string;
}
