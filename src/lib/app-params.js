const isNode = typeof window === 'undefined';
const windowObj = isNode ? { localStorage: new Map() } : window;
const storage = windowObj.localStorage;

const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

const APP_ENV = env.VITE_APP_ENV || 'development';
const APP_NAME = env.VITE_APP_NAME || 'CCS Technology';

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
  if (isNode) {
    return defaultValue;
  }
  const storageKey = `app_${paramName}`;
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get(paramName);
  if (removeFromUrl) {
    urlParams.delete(paramName);
    const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ''}${window.location.hash}`;
    window.history.replaceState({}, document.title, newUrl);
  }
  if (searchParam) {
    storage.setItem(storageKey, searchParam);
    return searchParam;
  }
  if (defaultValue) {
    storage.setItem(storageKey, defaultValue);
    return defaultValue;
  }
  const storedValue = storage.getItem(storageKey);
  return storedValue || null;
};

const getAppParams = () => {
  if (getAppParamValue('clear_session') === 'true') {
    storage.removeItem('app_access_token');
  }
  return {
    appName: APP_NAME,
    appEnv: APP_ENV,
    fromUrl: getAppParamValue('from_url', { defaultValue: isNode ? '' : window.location.href }),
    accessToken: getAppParamValue('access_token', { removeFromUrl: true }),
  };
};

export const appParams = {
  ...getAppParams(),
};
