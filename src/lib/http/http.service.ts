import 'server-only';

import axios, { AxiosInstance } from 'axios';

export interface HttpRequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
}

/** Generic HTTP service interface — not tied to any specific library */
export interface HttpService {
  get<T>(url: string, config?: HttpRequestConfig): Promise<T>;
  post<T>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<T>;
}

/** Factory: creates an HttpService backed by axios */
export function createHttpService(baseURL: string, defaultHeaders: Record<string, string> = {}): HttpService {
  const instance: AxiosInstance = axios.create({ baseURL, headers: defaultHeaders });

  return {
    async get<T>(url: string, config?: HttpRequestConfig): Promise<T> {
      const { data } = await instance.get<T>(url, config);
      return data;
    },
    async post<T>(url: string, body?: unknown, config?: HttpRequestConfig): Promise<T> {
      const { data } = await instance.post<T>(url, body, config);
      return data;
    }
  };
}
