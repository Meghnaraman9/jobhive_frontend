import { useState, useEffect, useCallback } from "react";
import { authAPI, jobsAPI } from "./api";

const CATEGORIES = ["All", "Engineering", "Design", "Data", "Marketing", "Finance", "Operations"];
const JOB_TYPES = ["Full-time", "Part-time", "Remote", "Hybrid", "Contract"];

// ─── Root App ────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("home");
  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [authMode, setAuthMode] = useState("login");
  const [selectedJob, setSelectedJob] = useState(null);
  const [notification, setNotification] = useState(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [loading, setLoading] = useState(true);

  const notify = useCallback((msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const fetchJobs = useCallback(async (params) => {
    try {
      const data = await jobsAPI.list(params);
      setJobs(data);
    } catch (e) {
      notify("Failed to load jobs", "error");
    }
  }, [notify]);

  // Bootstrap: restore session
  useEffect(() => {
    const token = localStorage.getItem("jh_token");
    if (token) {
      authAPI.me()
        .then(setUser)
        .catch(() => localStorage.removeItem("jh_token"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
    fetchJobs();
  }, [fetchJobs]);

  const login = async (email, password) => {
    try {
      const { token, user } = await authAPI.login(email, password);
      localStorage.setItem("jh_token", token);
      setUser(user);
      nav("dashboard");
      notify(`Welcome back, ${user.name}!`);
    } catch (e) {
      throw e;
    }
  };

  const signup = async (name, email, password, role) => {
    try {
      const { token, user } = await authAPI.signup(name, email, password, role);
      localStorage.setItem("jh_token", token);
      setUser(user);
      nav("dashboard");
      notify(`Account created! Welcome, ${user.name}!`);
    } catch (e) {
      throw e;
    }
  };

  const logout = () => {
    localStorage.removeItem("jh_token");
    setUser(null);
    nav("home");
    notify("Logged out successfully.");
  };

  const applyJob = async (jobId) => {
    if (!user) { nav("auth"); return; }
    if (user.role !== "candidate") { notify("Only candidates can apply.", "error"); return; }
    try {
      await jobsAPI.apply(jobId);
      setUser(prev => ({ ...prev, appliedJobs: [...(prev.appliedJobs || []), jobId] }));
      await fetchJobs();
      notify("Application submitted! 🎉");
    } catch (e) {
      notify(e.message, "error");
    }
  };

  const saveJob = async (jobId) => {
    if (!user) { nav("auth"); return; }
    try {
      const res = await jobsAPI.save(jobId);
      setUser(prev => ({
        ...prev,
        savedJobs: res.saved
          ? [...(prev.savedJobs || []), jobId]
          : (prev.savedJobs || []).filter(id => id !== jobId)
      }));
      notify(res.message);
    } catch (e) {
      notify(e.message, "error");
    }
  };

  const deleteJob = async (jobId) => {
    try {
      await jobsAPI.delete(jobId);
      await fetchJobs();
      notify("Job deleted.");
    } catch (e) {
      notify(e.message, "error");
    }
  };

  const nav = (p, job = null) => {
    setPage(p);
    if (job) setSelectedJob(job);
    setMobileMenu(false);
    window.scrollTo(0, 0);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, background: "linear-gradient(135deg,#2563eb,#7c3aed)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <span style={{ color: "#fff", fontWeight: 800, fontSize: 22, fontFamily: "Sora, sans-serif" }}>J</span>
        </div>
        <div style={{ color: "#94a3b8", fontSize: 14 }}>Loading...</div>
      </div>
    </div>
  );

  const pages = {
    home: <Home jobs={jobs} user={user} nav={nav} />,
    jobs: <JobsPage jobs={jobs} user={user} nav={nav} applyJob={applyJob} saveJob={saveJob} fetchJobs={fetchJobs} />,
    auth: <AuthPage login={login} signup={signup} authMode={authMode} setAuthMode={setAuthMode} />,
    dashboard: <Dashboard user={user} jobs={jobs} nav={nav} applyJob={applyJob} deleteJob={deleteJob} fetchJobs={fetchJobs} notify={notify} />,
    jobDetail: <JobDetail job={selectedJob} user={user} applyJob={applyJob} saveJob={saveJob} nav={nav} />,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      <GlobalStyles />
      <Navbar user={user} nav={nav} logout={logout} page={page} mobileMenu={mobileMenu} setMobileMenu={setMobileMenu} />
      {notification && (
        <div style={{ position: "fixed", top: 80, right: 20, zIndex: 9999, background: notification.type === "error" ? "#fef2f2" : "#f0fdf4", border: `1px solid ${notification.type === "error" ? "#fecaca" : "#bbf7d0"}`, color: notification.type === "error" ? "#dc2626" : "#16a34a", padding: "12px 20px", borderRadius: 12, fontWeight: 500, fontSize: 14, boxShadow: "0 4px 16px rgba(0,0,0,.1)", animation: "fadeIn .3s ease" }}>
          {notification.msg}
        </div>
      )}
      <div className="fade-in">{pages[page] || pages.home}</div>
      <Footer nav={nav} />
    </div>
  );
}

// ─── Global Styles ────────────────────────────────────────────────────────────
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Sora:wght@600;700;800&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      body{color:#1e293b}
      button{cursor:pointer;font-family:inherit}
      input,textarea,select{font-family:inherit}
      a{text-decoration:none;color:inherit}
      ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-track{background:#f1f5f9} ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}
      .btn-primary{background:#2563eb;color:#fff;border:none;padding:10px 22px;border-radius:10px;font-weight:600;font-size:14px;transition:all .2s;letter-spacing:.01em}
      .btn-primary:hover{background:#1d4ed8;transform:translateY(-1px)}
      .btn-primary:disabled{opacity:.6;cursor:not-allowed;transform:none}
      .btn-outline{background:transparent;color:#2563eb;border:1.5px solid #2563eb;padding:9px 20px;border-radius:10px;font-weight:600;font-size:14px;transition:all .2s}
      .btn-outline:hover{background:#eff6ff}
      .btn-ghost{background:transparent;color:#64748b;border:1px solid #e2e8f0;padding:8px 16px;border-radius:8px;font-size:14px;font-weight:500;transition:all .2s}
      .btn-ghost:hover{background:#f1f5f9;color:#334155}
      .btn-danger{background:#ef4444;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;transition:all .2s}
      .btn-danger:hover{background:#dc2626}
      .input-field{width:100%;padding:11px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;color:#1e293b;background:#fff;outline:none;transition:border-color .2s}
      .input-field:focus{border-color:#2563eb}
      .card{background:#fff;border-radius:16px;border:1px solid #e8edf2;transition:all .25s}
      .card:hover{border-color:#bfdbfe;box-shadow:0 4px 20px rgba(37,99,235,.08)}
      .fade-in{animation:fadeIn .4s ease} @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
      .nav-link{font-size:14px;font-weight:500;color:#475569;cursor:pointer;padding:6px 12px;border-radius:8px;transition:all .2s}
      .nav-link:hover{color:#1e293b;background:#f1f5f9}
      .job-card{background:#fff;border:1px solid #e8edf2;border-radius:16px;padding:24px;transition:all .25s;cursor:pointer}
      .job-card:hover{border-color:#bfdbfe;box-shadow:0 6px 24px rgba(37,99,235,.1);transform:translateY(-2px)}
      .logo-circle{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:#fff;flex-shrink:0}
      .section-title{font-family:'Sora',sans-serif;font-size:28px;font-weight:700;color:#0f172a;line-height:1.2}
      .chip{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase}
      .modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .2s ease}
      .modal{background:#fff;border-radius:20px;padding:32px;max-width:560px;width:100%;max-height:90vh;overflow-y:auto;position:relative}
      @media(max-width:640px){.hide-mobile{display:none!important}.section-title{font-size:22px}}
    `}</style>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ user, nav, logout, page, mobileMenu, setMobileMenu }) {
  return (
    <nav style={{ background: "#fff", borderBottom: "1px solid #e8edf2", position: "sticky", top: 0, zIndex: 100 }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div onClick={() => nav("home")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, background: "linear-gradient(135deg,#2563eb,#7c3aed)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 16, fontFamily: "Sora, sans-serif" }}>J</span>
          </div>
          <span style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 18, color: "#0f172a" }}>JobHive</span>
        </div>
        <div className="hide-mobile" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span className="nav-link" onClick={() => nav("home")} style={{ color: page === "home" ? "#2563eb" : "" }}>Home</span>
          <span className="nav-link" onClick={() => nav("jobs")} style={{ color: page === "jobs" ? "#2563eb" : "" }}>Browse Jobs</span>
          {user && <span className="nav-link" onClick={() => nav("dashboard")} style={{ color: page === "dashboard" ? "#2563eb" : "" }}>Dashboard</span>}
        </div>
        <div className="hide-mobile" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {user ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: user.role === "employer" ? "#7c3aed" : "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700 }}>{user.name[0].toUpperCase()}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{user.name}</div>
                  <div style={{ fontSize: 11, color: "#64748b", textTransform: "capitalize" }}>{user.role}</div>
                </div>
              </div>
              <button className="btn-ghost" onClick={logout} style={{ fontSize: 13 }}>Log out</button>
            </>
          ) : (
            <>
              <button className="btn-ghost" onClick={() => nav("auth")}>Log in</button>
              <button className="btn-primary" onClick={() => nav("auth")}>Sign up free</button>
            </>
          )}
        </div>
        <button onClick={() => setMobileMenu(!mobileMenu)} style={{ display: "none", background: "none", border: "none", fontSize: 22, color: "#475569", padding: 4 }} className="mobile-menu-btn">☰</button>
      </div>
      {mobileMenu && (
        <div style={{ background: "#fff", borderTop: "1px solid #e8edf2", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="nav-link" onClick={() => nav("home")}>Home</span>
          <span className="nav-link" onClick={() => nav("jobs")}>Browse Jobs</span>
          {user && <span className="nav-link" onClick={() => nav("dashboard")}>Dashboard</span>}
          {user ? <button className="btn-ghost" onClick={logout}>Log out</button> : <button className="btn-primary" onClick={() => nav("auth")}>Sign up / Log in</button>}
        </div>
      )}
      <style>{`@media(max-width:640px){.mobile-menu-btn{display:block!important}}`}</style>
    </nav>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────
function Home({ jobs, user, nav }) {
  const featured = jobs.filter(j => j.featured);
  const stats = [{ label: "Active Jobs", val: jobs.length + "+" }, { label: "Companies", val: "50+" }, { label: "Candidates", val: "2K+" }, { label: "Hires Made", val: "500+" }];
  const categories = [
    { name: "Engineering", icon: "⚙️", count: jobs.filter(j => j.category === "Engineering").length },
    { name: "Design", icon: "🎨", count: jobs.filter(j => j.category === "Design").length },
    { name: "Data", icon: "📊", count: jobs.filter(j => j.category === "Data").length },
    { name: "Marketing", icon: "📣", count: jobs.filter(j => j.category === "Marketing").length },
  ];

  return (
    <div>
      <section style={{ background: "linear-gradient(135deg,#eff6ff 0%,#f5f3ff 50%,#fdf4ff 100%)", padding: "80px 24px 64px", textAlign: "center" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #bfdbfe", borderRadius: 20, padding: "6px 16px", marginBottom: 24 }}>
            <span style={{ width: 8, height: 8, background: "#22c55e", borderRadius: "50%", display: "inline-block" }}></span>
            <span style={{ fontSize: 13, color: "#2563eb", fontWeight: 600 }}>{jobs.length} jobs available right now</span>
          </div>
          <h1 style={{ fontFamily: "Sora, sans-serif", fontSize: "clamp(36px,6vw,60px)", fontWeight: 800, color: "#0f172a", lineHeight: 1.15, marginBottom: 20 }}>
            Find Your Next<br /><span style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Dream Career</span>
          </h1>
          <p style={{ fontSize: 18, color: "#64748b", lineHeight: 1.7, marginBottom: 36, maxWidth: 540, margin: "0 auto 36px" }}>Connect with top companies across India. Whether you're a candidate or employer — JobHive is your hiring hub.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn-primary" onClick={() => nav("jobs")} style={{ padding: "14px 32px", fontSize: 16, borderRadius: 12 }}>Browse {jobs.length} Jobs →</button>
            {!user && <button className="btn-outline" onClick={() => nav("auth")} style={{ padding: "14px 32px", fontSize: 16, borderRadius: 12 }}>Post a Job</button>}
          </div>
        </div>
      </section>

      <section style={{ background: "#fff", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 24px", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0 }}>
          {stats.map((s, i) => (
            <div key={i} style={{ textAlign: "center", padding: "16px", borderRight: i < 3 ? "1px solid #f1f5f9" : "none" }}>
              <div style={{ fontFamily: "Sora, sans-serif", fontSize: 28, fontWeight: 800, color: "#2563eb" }}>{s.val}</div>
              <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "64px 24px 48px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <h2 className="section-title">Featured Opportunities</h2>
            <p style={{ color: "#64748b", marginTop: 8, fontSize: 15 }}>Hand-picked roles from top companies</p>
          </div>
          <button className="btn-outline" onClick={() => nav("jobs")} style={{ whiteSpace: "nowrap" }}>View all jobs</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 20 }}>
          {featured.map(job => <JobCard key={job.id} job={job} user={user} nav={nav} compact />)}
        </div>
      </section>

      <section style={{ background: "#f8fafc", padding: "64px 24px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <h2 className="section-title" style={{ textAlign: "center", marginBottom: 12 }}>Browse by Category</h2>
          <p style={{ textAlign: "center", color: "#64748b", marginBottom: 40, fontSize: 15 }}>Explore opportunities in your field</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 16 }}>
            {categories.map(c => (
              <div key={c.name} onClick={() => nav("jobs")} style={{ background: "#fff", border: "1px solid #e8edf2", borderRadius: 16, padding: "28px 20px", textAlign: "center", cursor: "pointer", transition: "all .25s" }}
                onMouseOver={e => { e.currentTarget.style.borderColor = "#bfdbfe"; e.currentTarget.style.transform = "translateY(-3px)"; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = "#e8edf2"; e.currentTarget.style.transform = "translateY(0)"; }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{c.icon}</div>
                <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 15 }}>{c.name}</div>
                <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>{c.count} {c.count === 1 ? "job" : "jobs"}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {!user && (
        <section style={{ background: "linear-gradient(135deg,#1e40af,#6d28d9)", padding: "80px 24px", textAlign: "center" }}>
          <div style={{ maxWidth: 580, margin: "0 auto" }}>
            <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 32, fontWeight: 800, color: "#fff", marginBottom: 16 }}>Ready to Get Hired?</h2>
            <p style={{ color: "rgba(255,255,255,.75)", fontSize: 16, marginBottom: 32, lineHeight: 1.7 }}>Join thousands of candidates and employers on JobHive. It's free to get started.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => nav("auth")} style={{ background: "#fff", color: "#1e40af", border: "none", padding: "14px 32px", borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Create Free Account</button>
              <button onClick={() => nav("jobs")} style={{ background: "transparent", color: "#fff", border: "2px solid rgba(255,255,255,.4)", padding: "14px 32px", borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Browse Jobs</button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────
function JobCard({ job, user, nav, compact }) {
  const typeColors = {
    "Full-time": { bg: "#eff6ff", color: "#1d4ed8" },
    "Remote": { bg: "#f0fdf4", color: "#15803d" },
    "Hybrid": { bg: "#fdf4ff", color: "#7e22ce" },
    "Part-time": { bg: "#fff7ed", color: "#c2410c" },
    "Contract": { bg: "#fef2f2", color: "#b91c1c" },
  };
  const tc = typeColors[job.type] || { bg: "#f1f5f9", color: "#475569" };
  return (
    <div className="job-card" onClick={() => nav("jobDetail", job)}>
      <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
        <div className="logo-circle" style={{ background: job.logoColor }}>{job.logo}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 2 }}>{job.title}</div>
          <div style={{ color: "#64748b", fontSize: 13 }}>{job.company}</div>
        </div>
        {job.featured && <span style={{ background: "#fef3c7", color: "#b45309", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, height: "fit-content", letterSpacing: ".04em" }}>FEATURED</span>}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <span className="chip" style={{ background: tc.bg, color: tc.color }}>{job.type}</span>
        <span className="chip" style={{ background: "#f8fafc", color: "#64748b" }}>📍 {job.location}</span>
        <span className="chip" style={{ background: "#f0fdf4", color: "#15803d" }}>💰 {job.salary}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>{job.applicants?.length || 0} applicant{job.applicants?.length !== 1 ? "s" : ""} · {job.postedDate}</span>
        <span style={{ color: "#2563eb", fontSize: 13, fontWeight: 600 }}>View →</span>
      </div>
    </div>
  );
}

// ─── Jobs Page ────────────────────────────────────────────────────────────────
function JobsPage({ jobs, user, nav, applyJob, saveJob, fetchJobs }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [type, setType] = useState("All");
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    const timer = setTimeout(() => fetchJobs({ search, category, type, sort }), 300);
    return () => clearTimeout(timer);
  }, [search, category, type, sort]);

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 className="section-title" style={{ marginBottom: 8 }}>Browse Jobs</h1>
        <p style={{ color: "#64748b", fontSize: 15 }}>{jobs.length} positions found</p>
      </div>
      <div style={{ background: "#fff", border: "1px solid #e8edf2", borderRadius: 16, padding: 20, marginBottom: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <input className="input-field" style={{ flex: "1 1 240px" }} placeholder="🔍  Search jobs, companies, locations..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input-field" style={{ flex: "0 1 160px" }} value={category} onChange={e => setCategory(e.target.value)}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="input-field" style={{ flex: "0 1 160px" }} value={type} onChange={e => setType(e.target.value)}>
          <option value="All">All Types</option>
          {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select className="input-field" style={{ flex: "0 1 140px" }} value={sort} onChange={e => setSort(e.target.value)}>
          <option value="newest">Newest First</option>
          <option value="popular">Most Applied</option>
        </select>
      </div>
      {jobs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "#94a3b8" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#64748b" }}>No jobs found</div>
          <p style={{ marginTop: 8 }}>Try adjusting your search or filters</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 20 }}>
          {jobs.map(job => <JobCard key={job.id} job={job} user={user} nav={nav} />)}
        </div>
      )}
    </div>
  );
}

// ─── Job Detail ───────────────────────────────────────────────────────────────
function JobDetail({ job, user, applyJob, saveJob, nav }) {
  if (!job) { nav("jobs"); return null; }
  const applied = user?.appliedJobs?.includes(job.id);
  const saved = user?.savedJobs?.includes(job.id);
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      <button className="btn-ghost" onClick={() => nav("jobs")} style={{ marginBottom: 24 }}>← Back to Jobs</button>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 28, alignItems: "start" }}>
        <div>
          <div style={{ background: "#fff", border: "1px solid #e8edf2", borderRadius: 20, padding: 32, marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
              <div className="logo-circle" style={{ background: job.logoColor, width: 64, height: 64, fontSize: 18, borderRadius: 16 }}>{job.logo}</div>
              <div>
                <h1 style={{ fontFamily: "Sora, sans-serif", fontSize: 24, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{job.title}</h1>
                <div style={{ color: "#64748b", fontSize: 15 }}>{job.company}</div>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 28 }}>
              <span className="chip" style={{ background: "#eff6ff", color: "#1d4ed8", fontSize: 13 }}>📍 {job.location}</span>
              <span className="chip" style={{ background: "#f0fdf4", color: "#15803d", fontSize: 13 }}>💰 {job.salary}</span>
              <span className="chip" style={{ background: "#fdf4ff", color: "#7e22ce", fontSize: 13 }}>⏰ {job.type}</span>
              <span className="chip" style={{ background: "#f8fafc", color: "#475569", fontSize: 13 }}>📁 {job.category}</span>
            </div>
            <h3 style={{ fontWeight: 700, color: "#0f172a", marginBottom: 12, fontSize: 16 }}>About the Role</h3>
            <p style={{ color: "#475569", lineHeight: 1.8, fontSize: 15, marginBottom: 24 }}>{job.description}</p>
            <h3 style={{ fontWeight: 700, color: "#0f172a", marginBottom: 12, fontSize: 16 }}>Requirements</h3>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
              {(job.requirements || []).map((r, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: 10, color: "#475569", fontSize: 14 }}>
                  <span style={{ width: 20, height: 20, background: "#eff6ff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>✓</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div style={{ position: "sticky", top: 84 }}>
          <div style={{ background: "#fff", border: "1px solid #e8edf2", borderRadius: 20, padding: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#2563eb", fontFamily: "Sora, sans-serif", marginBottom: 4 }}>{job.salary}</div>
            <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 20 }}>per annum · {job.type}</div>
            {user?.role === "candidate" || !user ? (
              <>
                <button className="btn-primary" style={{ width: "100%", padding: "13px", fontSize: 15, borderRadius: 12, marginBottom: 10, opacity: applied ? .6 : 1 }} onClick={() => applyJob(job.id)} disabled={applied}>
                  {applied ? "✓ Applied" : "Apply Now"}
                </button>
                <button className="btn-outline" style={{ width: "100%", padding: "12px", fontSize: 14, borderRadius: 12 }} onClick={() => saveJob(job.id)}>
                  {saved ? "★ Saved" : "☆ Save Job"}
                </button>
              </>
            ) : <div style={{ color: "#64748b", fontSize: 13, textAlign: "center" }}>You're an employer — switch accounts to apply.</div>}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: "#94a3b8" }}>Applicants</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{job.applicants?.length || 0}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "#94a3b8" }}>Posted</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{job.postedDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Auth Page ────────────────────────────────────────────────────────────────
function AuthPage({ login, signup, authMode, setAuthMode }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "candidate" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      if (authMode === "login") {
        await login(form.email, form.password);
      } else {
        if (!form.name || !form.email || !form.password) { setError("All fields are required."); setLoading(false); return; }
        await signup(form.name, form.email, form.password, form.role);
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "calc(100vh - 64px)", background: "linear-gradient(135deg,#eff6ff,#f5f3ff)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: "40px 36px", width: "100%", maxWidth: 440, border: "1px solid #e8edf2", boxShadow: "0 8px 40px rgba(37,99,235,.08)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, background: "linear-gradient(135deg,#2563eb,#7c3aed)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 22, fontFamily: "Sora, sans-serif" }}>J</span>
          </div>
          <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 24, fontWeight: 700, color: "#0f172a" }}>{authMode === "login" ? "Welcome back" : "Create account"}</h2>
          <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 6 }}>{authMode === "login" ? "Sign in to your JobHive account" : "Join thousands on JobHive"}</p>
        </div>
        {authMode === "signup" && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Full Name</label>
              <input className="input-field" placeholder="Enter your name" value={form.name} onChange={e => set("name", e.target.value)} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>I am a</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {["candidate", "employer"].map(r => (
                  <div key={r} onClick={() => set("role", r)} style={{ border: `2px solid ${form.role === r ? "#2563eb" : "#e2e8f0"}`, borderRadius: 10, padding: "12px 16px", cursor: "pointer", background: form.role === r ? "#eff6ff" : "#fff", textAlign: "center", transition: "all .2s" }}>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{r === "candidate" ? "👤" : "🏢"}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: form.role === r ? "#2563eb" : "#374151", textTransform: "capitalize" }}>{r}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Email</label>
          <input className="input-field" type="email" placeholder="you@example.com" value={form.email} onChange={e => set("email", e.target.value)} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Password</label>
          <input className="input-field" type="password" placeholder="••••••••" value={form.password} onChange={e => set("password", e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
        </div>
        {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}
        <button className="btn-primary" style={{ width: "100%", padding: 14, fontSize: 15, borderRadius: 12, marginBottom: 16 }} onClick={handleSubmit} disabled={loading}>
          {loading ? "Please wait..." : authMode === "login" ? "Sign in" : "Create Account"}
        </button>
        <div style={{ textAlign: "center", fontSize: 14, color: "#64748b" }}>
          {authMode === "login" ? "Don't have an account? " : "Already have an account? "}
          <span onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setForm({ name: "", email: "", password: "", role: "candidate" }); }} style={{ color: "#2563eb", fontWeight: 600, cursor: "pointer" }}>
            {authMode === "login" ? "Sign up" : "Sign in"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ user, jobs, nav, applyJob, deleteJob, fetchJobs, notify }) {
  const [tab, setTab] = useState(user?.role === "employer" ? "myJobs" : "applied");
  const [showJobForm, setShowJobForm] = useState(false);
  const [editJob, setEditJob] = useState(null);
  const [viewApplicants, setViewApplicants] = useState(null);

  if (!user) return (
    <div style={{ textAlign: "center", padding: 80 }}>
      <p style={{ fontSize: 18 }}>Please <span style={{ color: "#2563eb", cursor: "pointer", fontWeight: 600 }} onClick={() => nav("auth")}>log in</span> to access dashboard.</p>
    </div>
  );

  const myJobs = jobs.filter(j => j.employerId === user.id);
  const appliedJobs = jobs.filter(j => user.appliedJobs?.includes(j.id));
  const savedJobs = jobs.filter(j => user.savedJobs?.includes(j.id));
  const tabs = user.role === "employer"
    ? [{ id: "myJobs", label: `My Jobs (${myJobs.length})` }, { id: "post", label: "+ Post New Job" }]
    : [{ id: "applied", label: `Applied (${appliedJobs.length})` }, { id: "saved", label: `Saved (${savedJobs.length})` }];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ background: "linear-gradient(135deg,#1e40af,#6d28d9)", borderRadius: 20, padding: "32px 36px", marginBottom: 32, color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 56, height: 56, background: "rgba(255,255,255,.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700 }}>{user.name[0].toUpperCase()}</div>
          <div>
            <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Hello, {user.name}! 👋</h2>
            <div style={{ opacity: .75, fontSize: 14, textTransform: "capitalize" }}>{user.role} Dashboard · {user.email}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 24 }}>
          {user.role === "employer"
            ? (<><StatPill label="Jobs Posted" val={myJobs.length} /><StatPill label="Total Applicants" val={myJobs.reduce((s, j) => s + (j.applicants?.length || 0), 0)} /></>)
            : (<><StatPill label="Applied" val={appliedJobs.length} /><StatPill label="Saved" val={savedJobs.length} /></>)}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { if (t.id === "post") { setEditJob(null); setShowJobForm(true); } else setTab(t.id); }}
            style={{ padding: "10px 20px", borderRadius: 10, border: "1.5px solid", borderColor: tab === t.id ? "#2563eb" : "#e2e8f0", background: tab === t.id ? "#eff6ff" : "#fff", color: tab === t.id ? "#2563eb" : "#64748b", fontWeight: 600, fontSize: 14, cursor: "pointer", transition: "all .2s" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "myJobs" && (
        myJobs.length === 0
          ? <EmptyState icon="📋" title="No jobs posted yet" desc="Start by posting your first job opening." action={() => setShowJobForm(true)} actionLabel="Post a Job" />
          : <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {myJobs.map(job => (
              <div key={job.id} style={{ background: "#fff", border: "1px solid #e8edf2", borderRadius: 16, padding: "20px 24px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div className="logo-circle" style={{ background: job.logoColor }}>{job.logo}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>{job.title}</div>
                  <div style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>{job.location} · {job.type} · {job.salary}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "6px 14px", fontSize: 13 }}>
                    <span style={{ color: "#16a34a", fontWeight: 700 }}>{job.applicants?.length || 0}</span>
                    <span style={{ color: "#64748b" }}> applicants</span>
                  </div>
                  <button className="btn-ghost" onClick={() => setViewApplicants(job)}>👥 View</button>
                  <button className="btn-ghost" onClick={() => { setEditJob(job); setShowJobForm(true); }}>✏️ Edit</button>
                  <button className="btn-danger" onClick={() => deleteJob(job.id)}>🗑</button>
                </div>
              </div>
            ))}
          </div>
      )}

      {tab === "applied" && (
        appliedJobs.length === 0
          ? <EmptyState icon="📝" title="No applications yet" desc="Browse jobs and start applying today." action={() => nav("jobs")} actionLabel="Browse Jobs" />
          : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 16 }}>
            {appliedJobs.map(job => (
              <div key={job.id} className="card" style={{ padding: 20 }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                  <div className="logo-circle" style={{ background: job.logoColor }}>{job.logo}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{job.title}</div>
                    <div style={{ color: "#64748b", fontSize: 13 }}>{job.company}</div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ background: "#f0fdf4", color: "#16a34a", fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 6 }}>✓ Applied</span>
                  <button className="btn-ghost" onClick={() => nav("jobDetail", job)} style={{ fontSize: 13 }}>View →</button>
                </div>
              </div>
            ))}
          </div>
      )}

      {tab === "saved" && (
        savedJobs.length === 0
          ? <EmptyState icon="★" title="No saved jobs" desc="Bookmark jobs you're interested in." action={() => nav("jobs")} actionLabel="Browse Jobs" />
          : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 16 }}>
            {savedJobs.map(job => (
              <div key={job.id} className="card" style={{ padding: 20, cursor: "pointer" }} onClick={() => nav("jobDetail", job)}>
                <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                  <div className="logo-circle" style={{ background: job.logoColor }}>{job.logo}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{job.title}</div>
                    <div style={{ color: "#64748b", fontSize: 13 }}>{job.company} · {job.salary}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
      )}

      {showJobForm && <JobFormModal onClose={() => { setShowJobForm(false); setEditJob(null); }} user={user} editJob={editJob} notify={notify} fetchJobs={fetchJobs} />}
      {viewApplicants && <ApplicantsModal job={viewApplicants} onClose={() => setViewApplicants(null)} />}
    </div>
  );
}

function StatPill({ label, val }) {
  return (
    <div style={{ background: "rgba(255,255,255,.15)", borderRadius: 10, padding: "10px 18px" }}>
      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "Sora, sans-serif" }}>{val}</div>
      <div style={{ fontSize: 12, opacity: .75, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function EmptyState({ icon, title, desc, action, actionLabel }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", border: "1px solid #e8edf2", borderRadius: 20 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>{title}</div>
      <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 24 }}>{desc}</p>
      <button className="btn-primary" onClick={action}>{actionLabel}</button>
    </div>
  );
}

// ─── Job Form Modal ───────────────────────────────────────────────────────────
function JobFormModal({ onClose, user, editJob, notify, fetchJobs }) {
  const [form, setForm] = useState(editJob ? { ...editJob, requirements: Array.isArray(editJob.requirements) ? editJob.requirements.join(", ") : editJob.requirements } : { title: "", company: user?.name || "", location: "", type: "Full-time", salary: "", category: "Engineering", description: "", requirements: "" });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title || !form.company || !form.location || !form.salary || !form.description) {
      notify("Please fill all required fields.", "error"); return;
    }
    setLoading(true);
    try {
      if (editJob) {
        await jobsAPI.update(editJob.id, form);
        notify("Job updated!");
      } else {
        await jobsAPI.create(form);
        notify("Job posted successfully! 🎉");
      }
      await fetchJobs();
      onClose();
    } catch (e) {
      notify(e.message, "error");
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{editJob ? "Edit Job" : "Post New Job"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: "#94a3b8", cursor: "pointer" }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <FieldGroup label="Job Title *"><input className="input-field" value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Senior React Developer" /></FieldGroup>
          <FieldGroup label="Company Name *"><input className="input-field" value={form.company} onChange={e => set("company", e.target.value)} placeholder="Your company name" /></FieldGroup>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FieldGroup label="Location *"><input className="input-field" value={form.location} onChange={e => set("location", e.target.value)} placeholder="City, State" /></FieldGroup>
            <FieldGroup label="Salary *"><input className="input-field" value={form.salary} onChange={e => set("salary", e.target.value)} placeholder="e.g. ₹12–18 LPA" /></FieldGroup>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FieldGroup label="Job Type">
              <select className="input-field" value={form.type} onChange={e => set("type", e.target.value)}>
                {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </FieldGroup>
            <FieldGroup label="Category">
              <select className="input-field" value={form.category} onChange={e => set("category", e.target.value)}>
                {CATEGORIES.filter(c => c !== "All").map(c => <option key={c}>{c}</option>)}
              </select>
            </FieldGroup>
          </div>
          <FieldGroup label="Job Description *"><textarea className="input-field" rows={4} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe the role, responsibilities..." /></FieldGroup>
          <FieldGroup label="Requirements (comma-separated)"><input className="input-field" value={form.requirements} onChange={e => set("requirements", e.target.value)} placeholder="e.g. React, 3+ years experience, TypeScript" /></FieldGroup>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button className="btn-primary" style={{ flex: 1, padding: 13, borderRadius: 12 }} onClick={save} disabled={loading}>{loading ? "Saving..." : editJob ? "Save Changes" : "Post Job"}</button>
          <button className="btn-ghost" onClick={onClose} style={{ padding: "12px 20px" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function FieldGroup({ label, children }) {
  return <div><label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>{label}</label>{children}</div>;
}

function ApplicantsModal({ job, onClose }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Applicants — {job.title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: "#94a3b8", cursor: "pointer" }}>×</button>
        </div>
        {!job.applicants?.length ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
            <div style={{ fontWeight: 600, color: "#64748b" }}>No applicants yet</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {job.applicants.map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "#f8fafc", borderRadius: 12, border: "1px solid #f1f5f9" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#2563eb" }}>{a.name[0].toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#1e293b" }}>{a.name}</div>
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>{a.email} · Applied {a.appliedDate}</div>
                </div>
                <span style={{ background: "#f0fdf4", color: "#16a34a", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6 }}>Applied</span>
              </div>
            ))}
          </div>
        )}
        <button className="btn-ghost" style={{ width: "100%", marginTop: 20, padding: "12px" }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer({ nav }) {
  return (
    <footer style={{ background: "#0f172a", color: "#94a3b8", padding: "48px 24px 28px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40, marginBottom: 40 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#2563eb,#7c3aed)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#fff", fontWeight: 800, fontSize: 15, fontFamily: "Sora, sans-serif" }}>J</span>
              </div>
              <span style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 16, color: "#fff" }}>JobHive</span>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.7, maxWidth: 280 }}>Connecting ambitious candidates with top-tier employers across India. Your career journey starts here.</p>
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 600, fontSize: 14, marginBottom: 14 }}>For Job Seekers</div>
            {["Browse Jobs", "Dashboard"].map(l => <div key={l} onClick={() => nav(l === "Browse Jobs" ? "jobs" : "dashboard")} style={{ fontSize: 14, marginBottom: 8, cursor: "pointer" }} onMouseOver={e => e.target.style.color = "#fff"} onMouseOut={e => e.target.style.color = "#94a3b8"}>{l}</div>)}
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 600, fontSize: 14, marginBottom: 14 }}>For Employers</div>
            {["Post a Job", "Manage Jobs"].map(l => <div key={l} onClick={() => nav("dashboard")} style={{ fontSize: 14, marginBottom: 8, cursor: "pointer" }} onMouseOver={e => e.target.style.color = "#fff"} onMouseOut={e => e.target.style.color = "#94a3b8"}>{l}</div>)}
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Categories</div>
            {["Engineering", "Design", "Data", "Marketing"].map(l => <div key={l} onClick={() => nav("jobs")} style={{ fontSize: 14, marginBottom: 8, cursor: "pointer" }} onMouseOver={e => e.target.style.color = "#fff"} onMouseOut={e => e.target.style.color = "#94a3b8"}>{l}</div>)}
          </div>
        </div>
        <div style={{ borderTop: "1px solid #1e293b", paddingTop: 24, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, fontSize: 13 }}>
          <div>© 2025 JobHive. Built with ❤️ in India.</div>
          <div style={{ display: "flex", gap: 20 }}>
            <span style={{ cursor: "pointer" }}>Privacy Policy</span>
            <span style={{ cursor: "pointer" }}>Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
