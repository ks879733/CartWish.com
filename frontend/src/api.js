let refreshPromise = null;

const getAccessToken = () => localStorage.getItem("accessToken");

const getTokenFromResponse = (data) => {
  if (typeof data === "string") return data;
  if (data && typeof data.accessToken === "string") return data.accessToken;
  if (data && typeof data.token === "string") return data.token;
  return "";
};

const redirectToLogin = () => {
  localStorage.removeItem("accessToken");
  if (
    typeof window !== "undefined" &&
    !["/login", "/signup"].includes(window.location.pathname)
  ) {
    window.location.assign("/login");
  }
};

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = fetch("/api/user/refresh", {
      method: "POST",
      credentials: "include",
    })
      .then(async (response) => {
        const body = await response.text();
        let data;
        try {
          data = JSON.parse(body);
        } catch {
          data = body;
        }
        const accessToken = getTokenFromResponse(data);
        if (!response.ok || !accessToken) {
          throw new Error(data?.message || "Session expired");
        }
        localStorage.setItem("accessToken", accessToken);
        return accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

export const authenticatedFetch = async (path, options = {}, canRetry = true) => {
  const headers = new Headers(options.headers || {});
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(path, {
    ...options,
    credentials: "include",
    headers,
  });

  let tokenRejected = response.status === 401;
  if (response.status === 400) {
    const errorBody = await response.clone().text();
    tokenRejected = /invalid token|token required/i.test(errorBody);
  }

  if (canRetry && tokenRejected && token) {
    try {
      await refreshAccessToken();
      return authenticatedFetch(path, options, false);
    } catch {
      redirectToLogin();
    }
  }

  return response;
};

export const clearSession = () => localStorage.removeItem("accessToken");
