import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-forge-bg text-forge-text overflow-x-hidden">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-forge-bg/80 backdrop-blur-md border-b border-forge-border">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="text-lg font-bold text-forge-text tracking-wide">SkinForge</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="/editor" className="text-sm text-forge-text-muted hover:text-forge-text transition-colors">
            Editor
          </a>
          <a
            href="/editor"
            className="text-sm px-4 py-2 rounded-lg bg-forge-accent hover:bg-forge-accent-hover text-white font-semibold transition-colors"
          >
            Start Creating Free
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-40 pb-32 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-forge-accent opacity-10 blur-[120px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-6 max-w-4xl">
          {/* Badge */}
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-forge-accent/20 text-forge-accent border border-forge-accent/30">
            <span className="w-1.5 h-1.5 rounded-full bg-forge-accent animate-pulse" />
            Now with AI Skin Generation
          </span>

          <h1 className="text-5xl sm:text-7xl font-extrabold leading-tight text-forge-text">
            Build the Perfect{" "}
            <span className="text-forge-accent">Minecraft Skin</span>
          </h1>

          <p className="text-lg sm:text-xl text-forge-text-muted max-w-2xl leading-relaxed">
            Generate skins with AI, paint pixel-perfect details, mix and match parts from different skins,
            then preview your creation on a live 3D character. All in one place.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
            <a
              href="/editor"
              className="px-8 py-4 rounded-xl bg-forge-accent hover:bg-forge-accent-hover text-white text-lg font-bold transition-all hover:scale-105 shadow-lg shadow-forge-accent/30"
            >
              Start Creating — It&apos;s Free
            </a>
            <a
              href="#features"
              className="px-8 py-4 rounded-xl border border-forge-border text-forge-text-muted hover:text-forge-text hover:border-forge-accent/50 text-lg font-semibold transition-all"
            >
              See Features ↓
            </a>
          </div>

          <p className="text-xs text-forge-text-muted mt-2">No account needed to start editing · Export as PNG instantly</p>
        </div>

        {/* Pixel grid decoration */}
        <div className="relative z-10 mt-16 grid grid-cols-8 gap-1 opacity-20">
          {PIXEL_PREVIEW.map((color, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-sm"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="px-6 py-24 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-forge-text mb-4">Everything You Need</h2>
          <p className="text-forge-text-muted text-lg max-w-xl mx-auto">
            From first idea to finished skin — SkinForge has every tool built in.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="relative rounded-2xl border border-forge-border bg-forge-panel p-6 flex flex-col gap-3 hover:border-forge-accent/40 transition-colors group"
            >
              {feature.comingSoon && (
                <span className="absolute top-4 right-4 text-xs px-2 py-0.5 rounded-full bg-forge-accent/20 text-forge-accent border border-forge-accent/30 font-semibold">
                  Coming Soon
                </span>
              )}
              <div className="text-3xl">{feature.icon}</div>
              <h3 className="text-forge-text font-bold text-lg">{feature.title}</h3>
              <p className="text-forge-text-muted text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-6 py-24 bg-forge-panel border-y border-forge-border">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-forge-text mb-4">How It Works</h2>
          <p className="text-forge-text-muted text-lg mb-16">From idea to Minecraft skin in three steps.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <div key={step.title} className="flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-forge-accent/20 border border-forge-accent/30 flex items-center justify-center text-2xl font-extrabold text-forge-accent">
                  {i + 1}
                </div>
                <div className="text-4xl">{step.icon}</div>
                <h3 className="text-forge-text font-bold text-xl">{step.title}</h3>
                <p className="text-forge-text-muted text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MIX & MATCH HIGHLIGHT */}
      <section className="px-6 py-24 max-w-6xl mx-auto">
        <div className="rounded-3xl border border-forge-accent/30 bg-forge-panel p-10 sm:p-16 flex flex-col sm:flex-row items-center gap-10">
          <div className="text-7xl sm:text-8xl">🧩</div>
          <div className="flex flex-col gap-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-forge-accent/20 text-forge-accent border border-forge-accent/30 w-fit">
              Coming Soon
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-forge-text">Mix &amp; Match Skins</h2>
            <p className="text-forge-text-muted text-lg leading-relaxed max-w-xl">
              Take the head from one skin, the torso from another, and the legs from a third.
              SkinForge lets you mix and match body parts from any skins to build something
              completely unique — no other skin editor does this.
            </p>
            <span className="text-forge-text-muted text-sm">Join the waitlist to be first to try it →</span>
          </div>
        </div>
      </section>

      {/* 3D PAINTING HIGHLIGHT */}
      <section className="px-6 pb-24 max-w-6xl mx-auto">
        <div className="rounded-3xl border border-forge-border bg-forge-panel p-10 sm:p-16 flex flex-col sm:flex-row-reverse items-center gap-10">
          <div className="text-7xl sm:text-8xl">🧊</div>
          <div className="flex flex-col gap-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-forge-accent/20 text-forge-accent border border-forge-accent/30 w-fit">
              Coming Soon
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-forge-text">Paint Directly on 3D</h2>
            <p className="text-forge-text-muted text-lg leading-relaxed max-w-xl">
              Rotate the 3D character and click to paint directly on the model.
              No more guessing which pixel maps to which body part — just paint what you see.
            </p>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="px-6 py-24 bg-forge-panel border-y border-forge-border">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-forge-text mb-4">Simple Pricing</h2>
          <p className="text-forge-text-muted text-lg mb-4">
            The editor is always free. Buy credits to unlock AI generation.
          </p>
          <p className="text-forge-text-muted text-sm mb-16">New accounts get 3 free AI credits to try it out — no card needed.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-8 flex flex-col gap-4 ${
                  plan.popular
                    ? "border-forge-accent bg-forge-accent/10 scale-105"
                    : "border-forge-border bg-forge-bg"
                }`}
              >
                {plan.popular && (
                  <span className="text-xs font-bold text-forge-accent uppercase tracking-wider">Most Popular</span>
                )}
                <h3 className="text-2xl font-bold text-forge-text">{plan.name}</h3>
                <div className="text-4xl font-extrabold text-forge-text">
                  {plan.price}
                  <span className="text-lg font-normal text-forge-text-muted"> / pack</span>
                </div>
                <p className="text-forge-accent font-semibold">{plan.credits} AI credits</p>
                <ul className="flex flex-col gap-2 text-sm text-forge-text-muted text-left">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span className="text-forge-success">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="/editor"
                  className={`mt-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                    plan.popular
                      ? "bg-forge-accent hover:bg-forge-accent-hover text-white"
                      : "border border-forge-border text-forge-text hover:border-forge-accent/50"
                  }`}
                >
                  Get Started
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-6 py-32 flex flex-col items-center text-center gap-8 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-forge-accent opacity-10 blur-[100px] pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-6 max-w-2xl">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-forge-text">
            Ready to Build Your Skin?
          </h2>
          <p className="text-forge-text-muted text-xl">
            Jump straight into the editor — no sign up required.
          </p>
          <a
            href="/editor"
            className="px-10 py-5 rounded-xl bg-forge-accent hover:bg-forge-accent-hover text-white text-xl font-bold transition-all hover:scale-105 shadow-xl shadow-forge-accent/30"
          >
            Open the Editor →
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 py-8 border-t border-forge-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="text-forge-text font-semibold">SkinForge</span>
          <span className="text-forge-text-muted text-sm">— Minecraft Skin Studio</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-forge-text-muted">
          <a href="/editor" className="hover:text-forge-text transition-colors">Editor</a>
          <a href="#features" className="hover:text-forge-text transition-colors">Features</a>
          <a href="#pricing" className="hover:text-forge-text transition-colors">Pricing</a>
        </div>
        <p className="text-xs text-forge-text-muted">© 2025 SkinForge. Not affiliated with Mojang.</p>
      </footer>
    </div>
  );
}

// ---- DATA ----

const FEATURES = [
  {
    icon: "🤖",
    title: "AI Skin Generator",
    description: "Type a description and our AI generates a complete Minecraft skin in seconds. Pirate, astronaut, dragon — anything.",
    comingSoon: false,
  },
  {
    icon: "🎨",
    title: "Pixel Editor",
    description: "Full pixel art editor with pencil, eraser, fill bucket, colour picker, layers, undo and redo.",
    comingSoon: false,
  },
  {
    icon: "🧊",
    title: "Live 3D Preview",
    description: "See your skin on a rotating 3D Minecraft character in real time. Walking, running, or standing still.",
    comingSoon: false,
  },
  {
    icon: "✨",
    title: "AI Remix",
    description: "Upload any existing skin and describe how you want it restyled. The AI keeps the UV layout and transforms the look.",
    comingSoon: false,
  },
  {
    icon: "📥",
    title: "Export as PNG",
    description: "Download your finished skin as a 64×64 PNG ready to upload directly to Minecraft. One click.",
    comingSoon: false,
  },
  {
    icon: "🧩",
    title: "Mix & Match Parts",
    description: "Copy the head from one skin, the torso from another. Combine body parts from multiple skins to create something unique.",
    comingSoon: true,
  },
  {
    icon: "📚",
    title: "Skin Library",
    description: "Browse thousands of community skins for inspiration, or load any player's skin by their Minecraft username.",
    comingSoon: true,
  },
  {
    icon: "🖌️",
    title: "3D Direct Painting",
    description: "Click directly on the 3D character to paint. Rotate and paint the back, sides, and top — no UV map guessing.",
    comingSoon: true,
  },
  {
    icon: "🛒",
    title: "Skin Marketplace",
    description: "Sell your AI-generated skins to other players and earn credits. Buy unique skins from talented creators.",
    comingSoon: true,
  },
];

const STEPS = [
  {
    icon: "💬",
    title: "Describe Your Skin",
    description: "Type anything — 'medieval knight with golden armour' or 'cute pink bunny with a cape'. Our AI handles the rest.",
  },
  {
    icon: "🎨",
    title: "Customise It",
    description: "Fine-tune your skin in the pixel editor. Adjust colours, add details, or use the fill tool for quick changes.",
  },
  {
    icon: "📥",
    title: "Export & Play",
    description: "Download your skin as a PNG and upload it to Minecraft. Done — you're in-game with a brand new look.",
  },
];

const PLANS = [
  {
    name: "Starter",
    price: "£0.99",
    credits: "10",
    popular: false,
    features: ["10 AI generations", "Full pixel editor", "3D preview", "PNG export"],
  },
  {
    name: "Creator",
    price: "£3.99",
    credits: "50",
    popular: true,
    features: ["50 AI generations", "Full pixel editor", "3D preview", "PNG export", "AI remix"],
  },
  {
    name: "Pro",
    price: "£9.99",
    credits: "200",
    popular: false,
    features: ["200 AI generations", "Full pixel editor", "3D preview", "PNG export", "AI remix", "Priority support"],
  },
];

const PIXEL_PREVIEW = [
  "#7c3aed","#6d28d9","#7c3aed","#5b21b6","#7c3aed","#6d28d9","#5b21b6","#7c3aed",
  "#5b21b6","#7c3aed","#6d28d9","#7c3aed","#5b21b6","#7c3aed","#6d28d9","#5b21b6",
  "#6d28d9","#5b21b6","#7c3aed","#6d28d9","#7c3aed","#5b21b6","#7c3aed","#6d28d9",
  "#7c3aed","#6d28d9","#5b21b6","#7c3aed","#6d28d9","#7c3aed","#5b21b6","#7c3aed",
];

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-forge-accent">
      <rect x="2" y="2" width="9" height="9" rx="1.5" fill="currentColor" opacity="0.9" />
      <rect x="13" y="2" width="9" height="9" rx="1.5" fill="currentColor" opacity="0.6" />
      <rect x="2" y="13" width="9" height="9" rx="1.5" fill="currentColor" opacity="0.6" />
      <rect x="13" y="13" width="9" height="9" rx="1.5" fill="currentColor" opacity="0.3" />
    </svg>
  );
}
