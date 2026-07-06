import { QueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { ErrorHandler } from '@/lib/error-handler';

// Create optimized query client with production-grade settings
export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			// Intelligent retry strategy
			retry: (failureCount, error) => {
				// Don't retry auth errors - user needs to re-authenticate
				if (error?.status === 401 || error?.status === 403) {
					return false;
				}
				// Retry network errors and server errors (408, 429, 5xx)
				if (!error?.status || error?.status >= 500 || error?.status === 408 || error?.status === 429) {
					return failureCount < 3;
				}
				return false;
			},
			// Exponential backoff for retries
			retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
			
			// Keep data fresh for 5 minutes
			staleTime: 5 * 60 * 1000,
			
			// Garbage collect unused queries after 10 minutes
			gcTime: 10 * 60 * 1000,
			
			// Don't refetch on window focus (reduce unnecessary requests)
			refetchOnWindowFocus: false,
			
			// Don't refetch when component remounts
			refetchOnMount: false,
			
			// Refetch stale data on reconnect only
			refetchOnReconnect: 'stale',
			
			// Keep working offline
			networkMode: 'always'
		},
		mutations: {
			// Retry mutations on failure
			retry: (failureCount, error) => {
				if (error?.status === 401 || error?.status === 403) {
					return false;
				}
				return failureCount < 2;
			},
			retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000)
		}
	}
});

// Setup global error and success callbacks
queryClientInstance.setMutationDefaults(undefined, {
	onError: (error, variables, context, mutation) => {
		const appError = ErrorHandler.handle(error);
		logger.error('MUTATION_ERROR', `Mutation failed: ${mutation.meta?.name || 'Unknown'}`, {
			error: appError.message,
			code: appError.code,
			variables
		});
	},
	onSuccess: (data, variables, context, mutation) => {
		logger.debug('MUTATION_SUCCESS', `Mutation succeeded: ${mutation.meta?.name || 'Unknown'}`, {
			variables
		});
	}
});

queryClientInstance.setQueryDefaults(undefined, {
	onError: (error, query) => {
		const appError = ErrorHandler.handle(error);
		logger.error('QUERY_ERROR', `Query failed: ${query.meta?.name || query.queryKey[0]}`, {
			error: appError.message,
			queryKey: query.queryKey
		});
	}
});