export type ApiData = Record<string, any>;
export type ApiRequest = <T extends ApiData = ApiData>(path: string, options?: RequestInit) => Promise<T>;

export function createApiClient(apiBase: string, token = "", renewToken?: () => Promise<string | null>) {
  const request: ApiRequest = async <T extends ApiData = ApiData>(path: string, options: RequestInit = {}): Promise<T> => {
    const send = async (accessToken: string) => {
      const response = await fetch(`${apiBase.replace(/\/$/, "")}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          ...options.headers,
        },
      });
      const rawData: unknown = await response.json().catch(() => ({}));
      const data = (rawData && typeof rawData === "object" ? rawData : {}) as ApiData;
      return { response, data };
    };

    let { response, data } = await send(token);
    if (response.status === 401 && token && renewToken) {
      const nextToken = await renewToken();
      if (nextToken) ({ response, data } = await send(nextToken));
    }
    if (!response.ok) throw new Error(data.message || "Request failed");
    return data as T;
  };

  return { request };
}
