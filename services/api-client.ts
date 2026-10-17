export type ApiData = Record<string, any>;
export type ApiRequest = <T extends ApiData = ApiData>(path: string, options?: RequestInit) => Promise<T>;

export function createApiClient(apiBase: string, token = "") {
  const request: ApiRequest = async <T extends ApiData = ApiData>(path: string, options: RequestInit = {}): Promise<T> => {
    const response = await fetch(`${apiBase.replace(/\/$/, "")}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    const rawData: unknown = await response.json().catch(() => ({}));
    const data = (rawData && typeof rawData === "object" ? rawData : {}) as ApiData;
    if (!response.ok) throw new Error(data.message || "Request failed");
    return data as T;
  };

  return { request };
}
