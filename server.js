const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'skillbridge.json');
const PORT = process.env.PORT || 3000;

function seed() {
  return {
    users: [],
    opportunities: [
      { id: 'opp_frontend', title: 'Frontend Development Intern', company: 'Nexora Technologies', type: 'internship', location: 'India', workMode: 'hybrid', requiredSkills: ['HTML', 'CSS', 'JavaScript'], description: 'Build accessible student-facing interfaces with a product team.', createdBy: 'seed', createdAt: new Date().toISOString() },
      { id: 'opp_data', title: 'Data Analyst Intern', company: 'Insight Labs', type: 'internship', location: 'Remote', workMode: 'remote', requiredSkills: ['Python', 'SQL', 'Data Analysis'], description: 'Turn learning and placement data into actionable dashboards.', createdBy: 'seed', createdAt: new Date().toISOString() },
      { id: 'opp_cloud', title: 'Cloud Support Associate', company: 'CloudBridge India', type: 'job', location: 'Bengaluru', workMode: 'hybrid', requiredSkills: ['Cloud', 'Linux', 'Networking'], description: 'Support cloud deployments and document reliable solutions.', createdBy: 'seed', createdAt: new Date().toISOString() }
    ],
    applications: []
  };
}

function load() {
  if (!fs.existsSync(DB_FILE)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(seed(), null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function save(db) { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }
function id(prefix) { return `${prefix}_${crypto.randomUUID()}`; }
function hash(password, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, value: crypto.scryptSync(password, salt, 64).toString('hex') };
}
function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let value = '';
    req.on('data', chunk => { value += chunk; if (value.length > 1e6) reject(new Error('Request too large')); });
    req.on('end', () => { try { resolve(value ? JSON.parse(value) : {}); } catch { reject(new Error('Invalid JSON')); } });
  });
}
function userFrom(req, db) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  return db.users.find(user => user.token === token);
}
function safeUser(user) { const { passwordHash, passwordSalt, token, ...safe } = user; return safe; }
function scoreMatch(student, opportunity) {
  const careerSkills = {
    'web development': ['html', 'css', 'javascript'],
    'data science': ['python', 'sql', 'data analysis'],
    'ai/ml': ['python', 'machine learning'],
    'cloud/devops': ['cloud', 'linux', 'networking'],
    'cybersecurity': ['networking', 'cybersecurity']
  };
  const career = String(student.profile?.career || '').toLowerCase();
  const skills = new Set([...(student.profile?.skills || []), ...(careerSkills[career] || [])].map(s => s.toLowerCase()));
  const required = opportunity.requiredSkills || [];
  const matched = required.filter(skill => skills.has(skill.toLowerCase()));
  const missing = required.filter(skill => !skills.has(skill.toLowerCase()));
  const skillScore = required.length ? Math.round((matched.length / required.length) * 70) : 0;
  const evidenceScore = Math.min(Number(student.profile?.projects || 0) * 5 + Number(student.profile?.courses || 0) * 3, 30);
  return { percentage: Math.min(skillScore + evidenceScore, 100), matchedSkills: matched, missingSkills: missing,
    explanation: matched.length ? `You match ${matched.join(', ')}. Strengthen ${missing.length ? missing.join(', ') : 'your project evidence'} to improve this match.` : `This role needs ${required.join(', ')}. Start with the listed skills and add a related project.` };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    const db = load();
    if (url.pathname === '/api/health') return send(res, 200, { status: 'ok' });
    if (req.method === 'POST' && url.pathname === '/api/auth/register') {
      const { email, password, role } = await readBody(req);
      if (!email || !password || !['student', 'institute', 'industry'].includes(role)) return send(res, 400, { error: 'Email, password and role are required.' });
      if (db.users.some(user => user.email.toLowerCase() === email.toLowerCase())) return send(res, 409, { error: 'An account with this email already exists.' });
      const secret = hash(password);
      const user = { id: id('usr'), email: email.toLowerCase(), role, passwordHash: secret.value, passwordSalt: secret.salt, token: crypto.randomUUID(), profile: {}, createdAt: new Date().toISOString() };
      db.users.push(user); save(db); return send(res, 201, { token: user.token, user: safeUser(user) });
    }
    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      const { email, password, role } = await readBody(req);
      const user = db.users.find(item => item.email === String(email).toLowerCase() && item.role === role);
      if (!user || hash(password, user.passwordSalt).value !== user.passwordHash) return send(res, 401, { error: 'Incorrect email, password, or workspace role.' });
      user.token = crypto.randomUUID(); save(db); return send(res, 200, { token: user.token, user: safeUser(user) });
    }
    const user = userFrom(req, db);
    if (url.pathname.startsWith('/api/') && !user && url.pathname !== '/api/opportunities') return send(res, 401, { error: 'Please sign in first.' });
    if (req.method === 'GET' && url.pathname === '/api/me') return send(res, 200, { user: safeUser(user) });
    if (req.method === 'PUT' && url.pathname === '/api/me/profile') {
      user.profile = { ...user.profile, ...(await readBody(req)) }; save(db); return send(res, 200, { user: safeUser(user) });
    }
    if (req.method === 'GET' && url.pathname === '/api/opportunities') {
      return send(res, 200, { opportunities: db.opportunities.map(item => ({ ...item, match: user?.role === 'student' ? scoreMatch(user, item) : undefined })) });
    }
    if (req.method === 'POST' && url.pathname === '/api/opportunities') {
      if (user.role !== 'industry') return send(res, 403, { error: 'Only industry accounts can create opportunities.' });
      const body = await readBody(req);
      if (!body.title || !body.company || !Array.isArray(body.requiredSkills) || !body.requiredSkills.length) return send(res, 400, { error: 'Title, company, and at least one required skill are needed.' });
      const opportunity = { id: id('opp'), title: body.title, company: body.company, type: body.type || 'internship', location: body.location || 'India', workMode: body.workMode || 'hybrid', description: body.description || '', requiredSkills: body.requiredSkills, createdBy: user.id, createdAt: new Date().toISOString() };
      db.opportunities.unshift(opportunity); save(db); return send(res, 201, { opportunity });
    }
    if (req.method === 'POST' && /^\/api\/opportunities\/[^/]+\/apply$/.test(url.pathname)) {
      if (user.role !== 'student') return send(res, 403, { error: 'Only student accounts can apply.' });
      const opportunityId = url.pathname.split('/')[3];
      if (!db.opportunities.some(item => item.id === opportunityId)) return send(res, 404, { error: 'Opportunity not found.' });
      if (db.applications.some(item => item.opportunityId === opportunityId && item.studentId === user.id)) return send(res, 409, { error: 'You have already applied to this opportunity.' });
      const application = { id: id('app'), opportunityId, studentId: user.id, status: 'submitted', createdAt: new Date().toISOString() };
      db.applications.push(application); save(db); return send(res, 201, { application });
    }
    if (req.method === 'GET') {
      const requested = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
      const filePath = path.resolve(ROOT, `.${requested}`);
      if (!filePath.startsWith(ROOT + path.sep)) return send(res, 403, { error: 'Forbidden.' });
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };
        res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
        return fs.createReadStream(filePath).pipe(res);
      }
    }
    return send(res, 404, { error: 'Route not found.' });
  } catch (error) { return send(res, 500, { error: error.message || 'Unexpected server error.' }); }
});

server.listen(PORT, () => console.log(`SkillBridge AI is running at http://localhost:${PORT}`));
