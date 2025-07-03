export function getDecodedUser(token = null) {
  const _token = token || localStorage.getItem('access');
  if (!_token) return null;
  try {
    return JSON.parse(atob(_token.split('.')[1]));
  } catch (e) {
    return null;
  }
}
