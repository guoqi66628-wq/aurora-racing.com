import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Eye, EyeOff, Github, LockKeyhole, LoaderCircle, UserRound, ShieldCheck } from "lucide-react";
import { getAssetUrl } from "../utils/cdn";
import TelemetryCircuit from "./TelemetryCircuit";
import { workspaceReturnTarget } from "../lib/telemetryReturn";

const HOME_URL = "https://aurora-racing.com/";

export default function TelemetryLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [invalidCredentials, setInvalidCredentials] = useState(false);
  const [keyboardNavigation, setKeyboardNavigation] = useState(false);
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    // Every entry requires credentials, even when an API session already exists.
    return () => {
      request.current?.abort();
    };
  }, []);

  const checkCapsLock = (event: KeyboardEvent<HTMLInputElement>) => setCapsLock(event.getModifierState("CapsLock"));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.current) return;
    setError("");
    setInvalidCredentials(false);
    setPending(true);
    const controller = new AbortController();
    request.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
        signal: controller.signal,
        cache: "no-store",
      });
      if (response.status === 401) {
        setInvalidCredentials(true);
        setError("账号或密码不正确，请重新输入。");
        return;
      }
      if (response.status === 429) {
        setError("尝试次数较多，请稍后再试。");
        return;
      }
      if (!response.headers.get("content-type")?.includes("application/json")) {
        setError("登录服务尚未接入，请联系工作台管理员。");
        return;
      }
      const result = await response.json();
      if (!response.ok || result.authenticated !== true) {
        setError("暂时无法登录，请稍后重试或联系工作台管理员。");
        return;
      }
      setPassword("");
      window.location.replace(workspaceReturnTarget(window.location.search));
    } catch {
      setError(controller.signal.aborted ? "连接超时，请稍后重试。" : "无法连接登录服务，请检查网络后重试。");
    } finally {
      window.clearTimeout(timeout);
      request.current = null;
      setPending(false);
    }
  }

  return (
    <div
      className={`telemetry-login selection:bg-aurora-purple selection:text-white${keyboardNavigation ? " telemetry-keyboard-navigation" : ""}`}
      onPointerDownCapture={() => setKeyboardNavigation(false)}
      onKeyDownCapture={(event) => { if (event.key === "Tab") setKeyboardNavigation(true); }}
      onKeyUpCapture={(event) => { if (event.key === "Tab") setKeyboardNavigation(true); }}
    >
      <header className="telemetry-header">
        <a href={HOME_URL} aria-label="返回 Aurora Racing 官网" className="telemetry-logo-link">
          <img src={getAssetUrl("/images/logos/logo-mobile.webp")} alt="Aurora Racing Logo" width="1620" height="587" className="telemetry-brand-logo" decoding="async" referrerPolicy="no-referrer" />
        </a>
        <a href={HOME_URL} className="telemetry-back"><ArrowLeft size={14} aria-hidden="true" /> 返回官网</a>
      </header>

      <main className="telemetry-frame">
        <div className="telemetry-layout">
        <section className="telemetry-visual" aria-label="Aurora Telemetry">
          <TelemetryCircuit />
        </section>

        <section className="telemetry-form-section" aria-labelledby="telemetry-login-title">
          <div className="telemetry-form-content">
            <div className="telemetry-access"><ShieldCheck size={14} aria-hidden="true" /> 车队成员登录</div>
            <h1 id="telemetry-login-title">欢迎回到工作台</h1>

            <form onSubmit={handleSubmit} aria-busy={pending}>
              <div className="telemetry-field">
                <label htmlFor="telemetry-username">车队账号 <span>ACCOUNT</span></label>
                <div className="telemetry-input-wrap">
                  <UserRound size={17} aria-hidden="true" />
                  <input id="telemetry-username" name="username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={255} placeholder="请输入车队账号" disabled={pending} aria-invalid={invalidCredentials} aria-describedby={error ? "telemetry-error" : undefined} />
                </div>
              </div>
              <div className="telemetry-field">
                <label htmlFor="telemetry-password">密码 <span>PASSWORD</span></label>
                <div className="telemetry-input-wrap">
                  <LockKeyhole size={17} aria-hidden="true" />
                  <input id="telemetry-password" name="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required maxLength={1024} placeholder="请输入密码" disabled={pending} onKeyDown={checkCapsLock} onKeyUp={checkCapsLock} onBlur={() => setCapsLock(false)} aria-invalid={invalidCredentials} aria-describedby={[error ? "telemetry-error" : "", capsLock ? "telemetry-capslock" : ""].filter(Boolean).join(" ") || undefined} />
                  <button type="button" className="telemetry-password-toggle" aria-label={showPassword ? "隐藏密码" : "显示密码"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} disabled={pending}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {capsLock && <p id="telemetry-capslock" className="telemetry-capslock">大写锁定已开启</p>}
              </div>
              {error && <p id="telemetry-error" className="telemetry-error" role="alert">{error}</p>}
              <button type="submit" className="telemetry-submit" disabled={pending}>
                <span>{pending ? "正在验证账号…" : "登录工作台"}</span>
                <span className="telemetry-submit-icon">{pending ? <LoaderCircle size={17} className="telemetry-spinner" aria-hidden="true" /> : <ArrowRight size={17} aria-hidden="true" />}</span>
              </button>
            </form>
            <p className="telemetry-help"><LockKeyhole size={12} aria-hidden="true" />仅限车队成员 · 账号问题请联系管理员</p>
            <div className="telemetry-local">
              <a href="https://github.com/fyl66/i3pro" target="_blank" rel="noopener noreferrer" className="telemetry-repository" aria-label="在 GitHub 查看 fyl66/i3pro（在新标签页打开）">
                <span className="telemetry-github-icon"><Github size={20} aria-hidden="true" /></span>
                <span className="telemetry-repository-copy"><strong>fyl66 / i3pro <span>GitHub</span></strong><span>也可本地运行，查看源码与安装指南</span></span>
                <ArrowUpRight size={17} aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>
        </div>
      </main>
    </div>
  );
}
