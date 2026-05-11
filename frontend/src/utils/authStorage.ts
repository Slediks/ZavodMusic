const LOGIN_KEY = "zavod_login";

export const authStorage = {
  getLogin: () => localStorage.getItem(LOGIN_KEY)?.trim() || "",
  setLogin: (login: string) => localStorage.setItem(LOGIN_KEY, login),
  clearLogin: () => localStorage.removeItem(LOGIN_KEY),
};


