(() => {
  const url = window.SKILLBRIDGE_SUPABASE_URL;
  const key = window.SKILLBRIDGE_SUPABASE_PUBLISHABLE_KEY;
  if (!window.supabase || !url || !key) throw new Error('Supabase is not configured.');
  const db = window.supabase.createClient(url, key);
  const state = { token: localStorage.getItem('skillbridge_token') };
  const message = error => error?.message || 'Something went wrong.';
  const userShape = (profile, user) => ({ id: user.id, email: user.email, role: profile.role, profile: profile.profile || {} });
  async function active() {
    const { data: { user }, error } = await db.auth.getUser();
    if (error || !user) throw new Error('Please sign in first.');
    const { data: profile, error: profileError } = await db.from('profiles').select('role, profile').eq('id', user.id).single();
    if (profileError) throw new Error(message(profileError));
    return { user, profile, safe: userShape(profile, user) };
  }
  function saveSession(session, user) {
    state.token = session.access_token;
    localStorage.setItem('skillbridge_token', session.access_token);
    localStorage.setItem('skillbridge_user', JSON.stringify(user));
    localStorage.setItem('skillbridge_role', user.role);
  }
  function match(profile, opportunity) {
    const career = { 'web development':['html','css','javascript'], 'data science':['python','sql','data analysis'], 'ai/ml':['python','machine learning'], 'cloud/devops':['cloud','linux','networking'], cybersecurity:['networking','cybersecurity'] };
    const skills = new Set([...(profile.skills || []), ...(career[String(profile.career || '').toLowerCase()] || [])].map(value => String(value).toLowerCase()));
    const required = opportunity.required_skills || [];
    const matchedSkills = required.filter(skill => skills.has(String(skill).toLowerCase()));
    const missingSkills = required.filter(skill => !skills.has(String(skill).toLowerCase()));
    const percentage = Math.min((required.length ? Math.round(matchedSkills.length / required.length * 70) : 0) + Math.min(Number(profile.projects || 0) * 5 + Number(profile.courses || 0) * 3, 30), 100);
    return { percentage, matchedSkills, missingSkills, explanation: matchedSkills.length ? `You match ${matchedSkills.join(', ')}. Strengthen ${missingSkills.length ? missingSkills.join(', ') : 'your project evidence'} to improve this match.` : `This role needs ${required.join(', ')}. Start with the listed skills and add a related project.` };
  }
  window.SkillBridgeAPI = {
    get token() { return state.token; },
    async register({ email, password, role }) {
      const { data, error } = await db.auth.signUp({ email, password, options: { data: { role } } });
      if (error) throw new Error(message(error));
      if (!data.session) return { needsEmailConfirmation: true, user: { email, role, profile: {} } };
      const current = await active(); saveSession(data.session, current.safe); return { token: data.session.access_token, user: current.safe };
    },
    async login({ email, password, role }) {
      const { data, error } = await db.auth.signInWithPassword({ email, password });
      if (error || !data.session) throw new Error(message(error));
      const current = await active();
      if (current.profile.role !== role) { await db.auth.signOut(); throw new Error('This account belongs to a different workspace role.'); }
      saveSession(data.session, current.safe); return { token: data.session.access_token, user: current.safe };
    },
    async request(path, options = {}) {
      const method = (options.method || 'GET').toUpperCase();
      const body = options.body ? JSON.parse(options.body) : {};
      const current = await active();
      if (path === '/api/me/profile' && method === 'PUT') {
        const { data, error } = await db.from('profiles').update({ profile: { ...current.profile.profile, ...body }, updated_at: new Date().toISOString() }).eq('id', current.user.id).select('role, profile').single();
        if (error) throw new Error(message(error)); const user = userShape(data, current.user); localStorage.setItem('skillbridge_user', JSON.stringify(user)); return { user };
      }
      if (path === '/api/opportunities' && method === 'GET') {
        const { data, error } = await db.from('opportunities').select('*').order('created_at', { ascending: false });
        if (error) throw new Error(message(error));
        return { opportunities: data.map(item => ({ id:item.id, title:item.title, company:item.company, type:item.type, location:item.location, workMode:item.work_mode, requiredSkills:item.required_skills, description:item.description, createdBy:item.created_by, createdAt:item.created_at, match: current.profile.role === 'student' ? match(current.profile.profile, item) : undefined })) };
      }
      if (path === '/api/opportunities' && method === 'POST') {
        if (current.profile.role !== 'industry') throw new Error('Only industry accounts can create opportunities.');
        const { data, error } = await db.from('opportunities').insert({ company:body.company, title:body.title, type:body.type || 'internship', work_mode:body.workMode || 'hybrid', location:body.location || 'India', required_skills:body.requiredSkills, description:body.description || '', created_by:current.user.id }).select('*').single();
        if (error) throw new Error(message(error)); return { opportunity: { id:data.id, title:data.title, company:data.company } };
      }
      const application = path.match(/^\/api\/opportunities\/([^/]+)\/apply$/);
      if (application && method === 'POST') {
        if (current.profile.role !== 'student') throw new Error('Only student accounts can apply.');
        const { data, error } = await db.from('applications').insert({ opportunity_id:application[1], student_id:current.user.id }).select('*').single();
        if (error) throw new Error(message(error)); return { application:data };
      }
      throw new Error('Unsupported request.');
    },
    logout() { state.token = null; ['skillbridge_token','skillbridge_user','skillbridge_role'].forEach(key => localStorage.removeItem(key)); return db.auth.signOut(); }
  };
})();
