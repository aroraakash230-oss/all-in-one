window.SkillBridgeAPI = {
  token: localStorage.getItem('skillbridge_token'),
  async request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    const response = await fetch(path, { ...options, headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
  },
  async register(payload) { const data = await this.request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }); this.setSession(data); return data; },
  async login(payload) { const data = await this.request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }); this.setSession(data); return data; },
  setSession(data) { this.token = data.token; localStorage.setItem('skillbridge_token', data.token); localStorage.setItem('skillbridge_user', JSON.stringify(data.user)); localStorage.setItem('skillbridge_role', data.user.role); },
  logout() { this.token = null; localStorage.removeItem('skillbridge_token'); localStorage.removeItem('skillbridge_user'); }
};
