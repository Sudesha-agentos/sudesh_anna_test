"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { signIn, signUp, useSession, signOut } from "@/lib/auth/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/components/shared/toast";
import gsap from "gsap";
import {
  Terminal,
  User,
  Mail,
  Lock,
  AlertCircle,
  ArrowRight,
  Loader2,
  Phone,
  MapPin,
  GraduationCap,
  Briefcase,
  Target,
  Upload,
  MessageSquare,
  Eye,
  EyeOff,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [mode, setMode] = useState<"signin" | "signup" | "complete-profile">(
    ["signup", "complete-profile"].includes(searchParams.get("mode")!) ? searchParams.get("mode") as any : "signin"
  );

  // Allow dynamic change of mode via URL
  useEffect(() => {
    const urlMode = searchParams.get("mode");
    if (urlMode === "signup" || urlMode === "complete-profile") {
      setMode(urlMode as any);
    } else {
      setMode("signin");
    }
  }, [searchParams]);

  // Base Auth Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Extended Signup Fields
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [studentStatus, setStudentStatus] = useState<"College Student" | "Working Professional">("College Student");
  const [preferredTrack, setPreferredTrack] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState(""); // ImageKit URL for proof
  const [fileName, setFileName] = useState("");

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
      );
    }
  }, []);

  const { data: session } = useSession();

  // Redirect if they ALREADY have all info and mode is complete-profile
  useEffect(() => {
    if (mode === "complete-profile" && session?.user?.phone && session?.user?.preferredTrack) {
      router.push(callbackUrl);
    }
  }, [mode, session, router, callbackUrl]);

  // Pre-fill if known
  useEffect(() => {
    if (mode === "complete-profile" && session?.user) {
      if (session.user.name) setName(session.user.name);
      if (session.user.email) setEmail(session.user.email);
      if (session.user.phone) setPhone(session.user.phone);
      if (session.user.city) setCity(session.user.city);
      if (session.user.studentStatus) setStudentStatus(session.user.studentStatus as any);
      if (session.user.preferredTrack) setPreferredTrack(session.user.preferredTrack);
      if (session.user.collegeName) setCollegeName(session.user.collegeName);
    }
  }, [mode, session]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const { uploadToImageKit } = await import("@/actions/upload");
        const toastId = toast.loading("Uploading ID Proof...");
        const result = await uploadToImageKit(formData);

        if (result.success && result.url) {
          setImageUrl(result.url);
          toast.success("ID Proof uploaded successfully!", { id: toastId });
        } else {
          toast.error("Upload failed", { description: result.error, id: toastId });
          setFileName(""); // reset if failed
        }
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Upload failed", { description: "An unexpected error occurred" });
        setFileName("");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "signup" || mode === "complete-profile") {
      if (mode === "signup" && password !== confirmPassword) {
        const errorMsg = "Passwords do not match";
        setError(errorMsg);
        toast.error("Validation failed", { description: errorMsg });
        return;
      }

      if (mode === "signup" && password.length < 8) {
        const errorMsg = "Password must be at least 8 characters long";
        setError(errorMsg);
        toast.error("Validation failed", { description: errorMsg });
        return;
      }

      if (!preferredTrack) {
        const errorMsg = "Please select a preferred track";
        setError(errorMsg);
        return;
      }

      if (studentStatus === "College Student" && !collegeName) {
        const errorMsg = "College name is required for students";
        setError(errorMsg);
        return;
      }
    }

    setIsLoading(true);

    try {
      if (mode === "signin") {
        const { error: signInError } = await signIn.email({ email, password });

        if (signInError) {
          setError(signInError.message || "Invalid credentials");
          toast.error("Sign in failed", { description: signInError.message || "Invalid credentials" });
          return;
        }

        toast.success("Signed in successfully!", { description: "Redirecting..." });
        router.push(callbackUrl);
        router.refresh();
      } else if (mode === "complete-profile") {
        const { updateStudentProfile } = await import("@/actions/student/profile");
        await updateStudentProfile({
          phone,
          city,
          studentStatus,
          preferredTrack,
          collegeName: studentStatus === "College Student" ? collegeName : undefined,
          message,
          imageUrl,
        });

        toast.success("Profile completed successfully!", {
          description: "Redirecting...",
        });

        router.push(callbackUrl);
        router.refresh();
      } else {
        const { error: signUpError } = await signUp.email({
          email,
          password,
          name,
          phone,
          city,
          studentStatus,
          preferredTrack,
          collegeName: studentStatus === "College Student" ? collegeName : undefined,
          message,
          imageUrl,
        } as any);

        if (signUpError) {
          setError(signUpError.message || "Failed to create account");
          toast.error("Signup failed", { description: signUpError.message || "Email may already be in use" });
          return;
        }

        toast.success("Account created!", {
          description: "Now sign in to continue.",
        });

        // The user specifically requested: Signup -> Sign in manually -> Dashboard.
        // We ensure they are signed out to force the manual login flow.
        await signOut();
        setMode("signin");
        setPassword(""); // Clear password for security
        window.scroll({ top: 0, behavior: 'smooth' });
        router.refresh();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : mode === "signin" ? "Failed to sign in" : "Failed to create account";
      setError(errorMessage);
      toast.error(mode === "signin" ? "Sign in failed" : "Action failed", { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 py-20 font-mono">
      {/* Background Grid Accent */}
      <div className="inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none fixed"></div>

      <div
        ref={containerRef}
        className={`w-full relative z-10 transition-all duration-500 ease-in-out opacity-0 ${mode === "signup" ? "max-w-2xl" : "max-w-md"}`}
      >
        <div className="bg-black border-2 border-white/20 p-8 md:p-10 shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)] backdrop-blur-sm">

          <div className="flex flex-col items-center text-center space-y-2 mb-8">
            {/* <div className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white font-bold uppercase tracking-widest text-[10px] border-2 border-red-600 shadow-[4px_4px_0px_0px_white] mb-4">
              <img
                src="https://ik.imagekit.io/bkt3emitco/zharnyxincress.png"
                alt="Logo"
                className="h-5 w-auto brightness-0 invert"
              />  <span className="text-xl md:text-2xl font-black tracking-tighter text-white uppercase">
                ZHARNY<span className="text-red-600">X</span>
              </span>
            </div> */}
            <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter">
              {mode === "signin" ? "Operator Login" : mode === "complete-profile" ? "Complete Profile" : "Join the Academy"}
            </h1>
            <p className="text-gray-400 font-mono text-xs md:text-sm uppercase tracking-widest">
              {mode === "signin" ? "Identify yourself to access the mainframe." : mode === "complete-profile" ? "Operator additional data required." : "Begin your initialization sequence."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* SOCIAL AUTH FOR SIGNIN & SIGNUP - Google button wired via better-auth social provider
                This satisfies PRD AG-63 Google OAuth button requirement using better-auth's built-in Google social provider.
            */}
            {(mode === "signin" || mode === "signup") && (
              <div className="space-y-6">
                <button
                  type="button"
                  onClick={async () => {
                    await signIn.social({
                      provider: "google",
                      callbackURL: callbackUrl,
                      fetchOptions: { onError: (ctx) => { toast.error("Sign in failed", { description: ctx.error.message }); } }
                    });
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-black font-bold uppercase tracking-wider text-sm border-2 border-white hover:bg-gray-200 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-black px-2 text-zinc-500 font-mono tracking-widest">Or continue with email</span>
                  </div>
                </div>
              </div>
            )}

            {/* SIGNIN ONLY FIELDS */}
            {mode === "signin" && (
              <div className="space-y-6">

                <div className="space-y-1">
                  <Label htmlFor="email" className="text-white text-xs font-bold uppercase tracking-wider">Email Address</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-red-500 transition-colors" size={16} />
                    <Input id="email" type="email" placeholder="OPERATOR@ZHARNYX.COM" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 bg-white/5 border-2 border-white/20 text-white placeholder:text-gray-500 focus:border-red-600 focus:ring-0 rounded-none h-12 font-mono text-sm transition-colors" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-white text-xs font-bold uppercase tracking-wider">Password</Label>
                    <a href="#" className="text-[10px] text-gray-500 hover:text-red-500 uppercase tracking-widest transition-colors font-bold">Difficulties?</a>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-red-500 transition-colors" size={16} />
                    <Input id="password" type={showPassword ? "text" : "password"} required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 bg-white/5 border-2 border-white/20 text-white placeholder:text-gray-500 focus:border-red-600 focus:ring-0 rounded-none h-12 font-mono text-sm transition-colors" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors" tabIndex={-1}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SIGNUP & COMPLETE PROFILE FIELDS */}
            {(mode === "signup" || mode === "complete-profile") && (
              <div className="space-y-6">

                {mode === "complete-profile" && (
                  <div className="bg-red-950/20 border border-red-500/30 p-4 mb-4">
                    <p className="text-red-400 font-mono text-xs uppercase font-bold text-center">
                      MANDATORY SECURE ENROLLMENT DATA REQUIRED BEFORE PROCEEDING
                    </p>
                  </div>
                )}

                {mode === "signup" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <Label htmlFor="name" className="text-white text-xs font-bold uppercase tracking-wider">Full Name</Label>
                      <div className="relative group">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-red-500 transition-colors" size={16} />
                        <Input id="name" type="text" placeholder="Your full name" required value={name} onChange={(e) => setName(e.target.value)} className="pl-10 bg-white/5 border-2 border-white/20 text-white placeholder:text-gray-500 focus:border-red-600 focus:ring-0 rounded-none h-12 font-mono text-sm transition-colors" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="email" className="text-white text-xs font-bold uppercase tracking-wider">Email Address</Label>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-red-500 transition-colors" size={16} />
                        <Input id="email" type="email" placeholder="you@email.com" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 bg-white/5 border-2 border-white/20 text-white placeholder:text-gray-500 focus:border-red-600 focus:ring-0 rounded-none h-12 font-mono text-sm transition-colors" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  <div className="space-y-1">
                    <Label htmlFor="phone" className="text-white text-xs font-bold uppercase tracking-wider">Phone</Label>
                    <div className="relative group">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-red-500 transition-colors" size={16} />
                      <Input id="phone" type="tel" placeholder="+91 98765 43210" required value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10 bg-white/5 border-2 border-white/20 text-white placeholder:text-gray-500 focus:border-red-600 focus:ring-0 rounded-none h-12 font-mono text-sm transition-colors" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="city" className="text-white text-xs font-bold uppercase tracking-wider">Region</Label>
                    <div className="relative group">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-red-500 transition-colors" size={16} />
                      <select id="city" required value={city} onChange={(e) => setCity(e.target.value)} className="pl-10 w-full bg-white/5 border-2 border-white/20 text-white focus:border-red-600 focus:ring-0 outline-hidden rounded-none h-12 font-mono text-sm transition-colors appearance-none">
                        <option value="" disabled className="text-black">Select region</option>
                        <option value="TN (Tamil Nadu)" className="text-black">TN (Tamil Nadu)</option>
                        <option value="Other" className="text-black">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Status Toggle */}
                <div className="space-y-2">
                  <Label className="text-white text-xs font-bold uppercase tracking-wider">I am a...</Label>
                  <div className="flex gap-4">
                    <button type="button" onClick={() => setStudentStatus("College Student")} className={`flex-1 flex items-center justify-center gap-2 py-3 border-2 transition-colors font-bold uppercase text-sm tracking-wider ${studentStatus === "College Student" ? "border-red-600 bg-red-600/10 text-red-500" : "border-white/20 bg-white/5 text-gray-400 hover:border-white/40"}`}>
                      <GraduationCap size={18} /> College Student
                    </button>
                    <button type="button" onClick={() => setStudentStatus("Working Professional")} className={`flex-1 flex items-center justify-center gap-2 py-3 border-2 transition-colors font-bold uppercase text-sm tracking-wider ${studentStatus === "Working Professional" ? "border-red-600 bg-red-600/10 text-red-500" : "border-white/20 bg-white/5 text-gray-400 hover:border-white/40"}`}>
                      <Briefcase size={18} /> Working Professional
                    </button>
                  </div>
                </div>

                <div className={`space-y-1 overflow-hidden transition-all duration-300 ${studentStatus === "College Student" ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
                  <Label htmlFor="college" className="text-white text-xs font-bold uppercase tracking-wider">College Name</Label>
                  <div className="relative group">
                    <Target className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-red-500 transition-colors" size={16} />
                    <Input id="college" type="text" placeholder="Your college name" required={studentStatus === "College Student"} value={collegeName} onChange={(e) => setCollegeName(e.target.value)} className="pl-10 bg-white/5 border-2 border-white/20 text-white placeholder:text-gray-500 focus:border-red-600 focus:ring-0 rounded-none h-12 font-mono text-sm transition-colors" />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="track" className="text-white text-xs font-bold uppercase tracking-wider">Preferred Track</Label>
                  <select id="track" required value={preferredTrack} onChange={(e) => setPreferredTrack(e.target.value)} className="w-full px-4 bg-white/5 border-2 border-white/20 text-white focus:border-red-600 focus:ring-0 outline-hidden rounded-none h-12 font-mono text-sm transition-colors appearance-none">
                    <option value="" disabled className="text-black">Select track</option>
                    <option value="SOC Analyst" className="text-black">SOC Analyst</option>
                    <option value="VAPT" className="text-black">VAPT (Pentesting)</option>
                    <option value="Cloud Security" className="text-black">Cloud Security</option>
                    <option value="DFIR" className="text-black">DFIR (Forensics)</option>
                    <option value="Undecided" className="text-black">Undecided / Need Guidance</option>
                  </select>
                </div>

                {/* Proof Upload (New field requested by user) */}
                <div className="space-y-1">
                  <Label htmlFor="proof" className="text-white text-xs font-bold uppercase tracking-wider">ID / Student Proof (Upload file)</Label>
                  <label htmlFor="proof" className="w-full border-2 border-dashed border-white/20 hover:border-red-500 bg-white/5 p-4 flex items-center justify-center gap-2 cursor-pointer transition-colors group">
                    <Upload size={18} className="text-gray-500 group-hover:text-red-500 transition-colors" />
                    <span className="text-sm text-gray-400 group-hover:text-white truncate">
                      {fileName ? fileName : "Click to select proof document..."}
                    </span>
                    <input id="proof" type="file" className="hidden" accept=".pdf,image/*" onChange={handleFileUpload} />
                  </label>
                </div>

                {/* Password Fields */}
                {mode === "signup" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <Label htmlFor="password" className="text-white text-xs font-bold uppercase tracking-wider">Password</Label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-red-500 transition-colors" size={16} />
                        <Input id="password" type={showPassword ? "text" : "password"} required placeholder="Min 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 bg-white/5 border-2 border-white/20 text-white placeholder:text-gray-500 focus:border-red-600 focus:ring-0 rounded-none h-12 font-mono text-sm transition-colors" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors" tabIndex={-1}>
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="confirm-password" className="text-white text-xs font-bold uppercase tracking-wider">Confirm Password</Label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-red-500 transition-colors" size={16} />
                        <Input id="confirm-password" type={showConfirmPassword ? "text" : "password"} required placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 pr-10 bg-white/5 border-2 border-white/20 text-white placeholder:text-gray-500 focus:border-red-600 focus:ring-0 rounded-none h-12 font-mono text-sm transition-colors" />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors" tabIndex={-1}>
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <Label htmlFor="message" className="text-white text-xs font-bold uppercase tracking-wider">Message (Optional)</Label>
                  <div className="relative group">
                    <MessageSquare className="absolute left-3 top-4 text-gray-500 group-focus-within:text-red-500 transition-colors" size={16} />
                    <textarea id="message" rows={3} placeholder="Any specific requirements or questions..." value={message} onChange={(e) => setMessage(e.target.value)} className="w-full pl-10 pt-3 bg-white/5 border-2 border-white/20 text-white placeholder:text-gray-500 focus:border-red-600 focus:ring-0 resize-none font-mono text-sm transition-colors outline-hidden"></textarea>
                  </div>
                </div>

              </div>
            )}

            {error && (
              <div className="bg-red-950/30 border border-red-500/50 p-3 flex items-start gap-3">
                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
                <div className="text-sm text-red-200 font-mono">{error}</div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full group relative px-8 py-4 bg-red-600 text-black font-bold text-lg uppercase tracking-wider border-2 border-red-600 hover:translate-x-1 hover:translate-y-1 transition-transform disabled:opacity-50 disabled:pointer-events-none mt-4"
            >
              <span className="absolute inset-0 bg-white translate-x-1.5 translate-y-1.5 -z-10 border-2 border-white group-hover:translate-x-0 group-hover:translate-y-0 transition-transform"></span>
              <span className="flex items-center justify-center gap-2">
                {isLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    {mode === "signin" ? "Establish Link" : mode === "complete-profile" ? "Initialize Data" : "Submit Enrollment Request"}{" "}
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </span>
            </button>
          </form>

          <div className="mt-8 text-center flex flex-col gap-3">
            {mode !== "complete-profile" && (
              <button
                type="button"
                className="text-gray-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setError("");
                }}
              >
                {mode === "signin"
                  ? "No credentials? Request Access"
                  : "Already active? Operator Login"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black text-white font-mono">
          <Loader2 className="animate-spin text-red-600" size={32} />
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  );
}
