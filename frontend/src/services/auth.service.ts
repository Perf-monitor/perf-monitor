import Cookies from "js-cookie";
import apiClient from "@/lib/axios";
import type { AuthTokens, User } from "@/types";

const COOKIE_OPTS = { expires: 7, secure: true, sameSite: "strict" as const };

export const authService = {
  async login(email: string, password: string): Promise<AuthTokens> {
    const { data } = await apiClient.post<AuthTokens>("/auth/login/", { email, password });
    Cookies.set("access_token", data.access, { ...COOKIE_OPTS, expires: 1 / 24 });
    Cookies.set("refresh_token", data.refresh, COOKIE_OPTS);
    return data;
  },

  async logout(refreshToken: string): Promise<void> {
    await apiClient.post("/auth/logout/", { refresh: refreshToken });
    Cookies.remove("access_token");
    Cookies.remove("refresh_token");
  },

  async register(payload: {
    email: string;
    username: string;
    password: string;
    confirm_password: string;
  }): Promise<User> {
    const { data } = await apiClient.post<User>("/auth/register/", payload);
    return data;
  },

  async getProfile(): Promise<User> {
    const { data } = await apiClient.get<User>("/auth/profile/");
    return data;
  },

  async updateProfile(payload: Partial<User>): Promise<User> {
    const { data } = await apiClient.patch<User>("/auth/profile/", payload);
    return data;
  },

  async changePassword(oldPassword: string, newPassword: string, confirmPassword: string): Promise<void> {
    await apiClient.post("/auth/change-password/", {
      old_password: oldPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    });
  },

  getAccessToken(): string | undefined {
    return Cookies.get("access_token");
  },

  getRefreshToken(): string | undefined {
    return Cookies.get("refresh_token");
  },

  isAuthenticated(): boolean {
    return !!Cookies.get("access_token") || !!Cookies.get("refresh_token");
  },
};
