import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestScopeContext {
    correlationId: string;
}

const requestScope = new AsyncLocalStorage<RequestScopeContext>();

export const runWithRequestScope = (correlationId: string, work: () => void): void => {
    requestScope.run({ correlationId }, work);
};

export const getCurrentCorrelationId = (): string => {
    return requestScope.getStore()?.correlationId ?? 'missing-correlation-id';
};
