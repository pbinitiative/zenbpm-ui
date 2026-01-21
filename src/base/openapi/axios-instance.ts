import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { validateResponse } from '@/mocks/validation/validator';
import { axiosResponseTransformer, stringifyWithBigInt } from '@/base/utils/jsonBigInt';

export const AXIOS_INSTANCE = axios.create({
  baseURL: '/v1',
  // Use custom JSON parser to handle int64 values without precision loss
  transformResponse: [axiosResponseTransformer],
  // Use custom JSON stringifier to convert string int64 values back to JSON numbers
  transformRequest: [
    (data: unknown) => {
      if (data && typeof data === 'object' && !(data instanceof FormData)) {
        return stringifyWithBigInt(data);
      }
      return data;
    },
  ],
});

// Add request interceptor to fix Content-Type for FormData
// The generated API sets Content-Type: multipart/form-data without boundary,
// but axios needs to set this automatically when FormData is used
AXIOS_INSTANCE.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    // Delete the Content-Type header so axios sets it automatically with boundary
    delete config.headers['Content-Type'];
  }
  return config;
});

// Add response interceptor to validate responses against OpenAPI schema
// Uses the same validation logic as MSW mocks
AXIOS_INSTANCE.interceptors.response.use(
  (response: AxiosResponse<unknown>) => {
    const { config, data } = response;
    const method = (config.method ?? 'GET').toUpperCase();
    // Build full URL path including baseURL for schema matching
    const baseURL = config.baseURL ?? '';
    const url = config.url ?? '';
    const fullUrl = baseURL + url;

    // Validate response body against OpenAPI schema
    if (data !== undefined && data !== null) {
      validateResponse(method, fullUrl, data);
    }

    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const customInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig
): Promise<T> => {
  const source = axios.CancelToken.source();
  const promise = AXIOS_INSTANCE({
    ...config,
    ...options,
    cancelToken: source.token,
  }).then(({ data }: AxiosResponse<T>) => data);

  // @ts-expect-error - cancel is added to promise
  promise.cancel = () => {
    source.cancel('Query was cancelled');
  };

  return promise;
};
