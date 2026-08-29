const features = [
  {
    title: "AI Marketing Campaigns",
    description:
      "Create targeted campaigns, promotions and content ideas based on your business, services and ideal customers.",
  },
  {
    title: "Automated Lead Response",
    description:
      "Respond to new enquiries quickly with AI-generated messages tailored to your business and the customer's needs.",
  },
  {
    title: "Smart Follow-Ups",
    description:
      "Keep following up with potential customers automatically so valuable enquiries don't get forgotten.",
  },
  {
    title: "Content That Works",
    description:
      "Generate social posts, email campaigns and promotional content designed to attract the customers you want.",
  },
  {
    title: "Simple Lead Management",
    description:
      "See your new enquiries, follow-ups and customer opportunities in one clear dashboard.",
  },
  {
    title: "Marketing Insights",
    description:
      "Understand which campaigns generate enquiries and where your marketing efforts are producing results.",
  },
];

const steps = [
  {
    number: "01",
    title: "Tell us about your business",
    description:
      "Add your services, target customers, location and marketing goals.",
  },
  {
    number: "02",
    title: "Let AI build your marketing",
    description:
      "Adverio creates campaigns and content based on your business profile.",
  },
  {
    number: "03",
    title: "Automate your customer journey",
    description:
      "Capture enquiries, respond quickly and follow up automatically.",
  },
];

const industries = [
  "Electricians",
  "Plumbers",
  "Builders",
  "Cleaners",
  "Landscapers",
  "Property Services",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
          <div className="text-2xl font-bold tracking-tight">
            Adverio<span className="text-blue-600">.</span>
          </div>

          <div className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="transition hover:text-slate-950">
              Features
            </a>
            <a href="#how-it-works" className="transition hover:text-slate-950">
              How It Works
            </a>
            <a href="#industries" className="transition hover:text-slate-950">
              Industries
            </a>
            <a href="#pricing" className="transition hover:text-slate-950">
              Pricing
            </a>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="hidden text-sm font-semibold text-slate-700 transition hover:text-slate-950 sm:block"
            >
              Log in
            </a>

            <a
              href="/signup"
              className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Get Started
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 pb-20 pt-20 lg:px-8 lg:pb-28 lg:pt-28">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
              AI-powered marketing automation for small businesses
            </div>

            <h1 className="text-5xl font-bold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              Turn your marketing into{" "}
              <span className="text-blue-600">customers.</span>
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              Adverio helps small businesses attract customers, capture
              enquiries, respond instantly and follow up automatically — so
              you can spend less time chasing leads and more time doing the
              work you love.
            </p>

            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <a
                href="/signup"
                className="rounded-xl bg-blue-600 px-7 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Start for Free
              </a>

              <a
                href="#how-it-works"
                className="rounded-xl border border-slate-300 bg-white px-7 py-4 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                See How It Works
              </a>
            </div>

            <p className="mt-5 text-sm text-slate-500">
              No expensive setup. Build your marketing system around your
              business.
            </p>
          </div>

          {/* Product Preview */}
          <div className="mx-auto mt-16 max-w-6xl">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-2xl">
              <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-4">
                <span className="h-3 w-3 rounded-full bg-slate-600" />
                <span className="h-3 w-3 rounded-full bg-slate-600" />
                <span className="h-3 w-3 rounded-full bg-slate-600" />
                <span className="ml-3 text-xs text-slate-500">
                  Adverio Dashboard
                </span>
              </div>

              <div className="grid gap-0 md:grid-cols-3">
                <div className="border-b border-slate-800 p-6 md:border-b-0 md:border-r">
                  <p className="text-sm text-slate-400">Marketing campaigns</p>
                  <p className="mt-2 text-3xl font-bold text-white">12</p>
                  <p className="mt-2 text-sm text-emerald-400">
                    +24% this month
                  </p>
                </div>

                <div className="border-b border-slate-800 p-6 md:border-b-0 md:border-r">
                  <p className="text-sm text-slate-400">New enquiries</p>
                  <p className="mt-2 text-3xl font-bold text-white">38</p>
                  <p className="mt-2 text-sm text-emerald-400">
                    +18% this month
                  </p>
                </div>

                <div className="p-6">
                  <p className="text-sm text-slate-400">Follow-ups sent</p>
                  <p className="mt-2 text-3xl font-bold text-white">64</p>
                  <p className="mt-2 text-sm text-emerald-400">
                    Automatically
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
              Everything in one place
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Your AI marketing team, working in the background.
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              From creating campaigns to following up with potential
              customers, Adverio helps automate the repetitive marketing work
              that takes you away from your business.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  ✦
                </div>

                <h3 className="text-lg font-bold">{feature.title}</h3>

                <p className="mt-3 leading-7 text-slate-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
              How it works
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Set it up once. Let AI do the routine work.
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              Adverio turns your business information into an automated
              marketing and customer follow-up system.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="relative">
                <div className="text-5xl font-bold text-blue-100">
                  {step.number}
                </div>

                <h3 className="mt-4 text-xl font-bold">{step.title}</h3>

                <p className="mt-3 leading-7 text-slate-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-16 rounded-3xl bg-slate-950 p-8 text-white sm:p-12">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-blue-400">
                  The automation loop
                </p>

                <h3 className="mt-3 text-3xl font-bold">
                  From first impression to customer.
                </h3>

                <p className="mt-5 leading-7 text-slate-300">
                  Adverio connects your marketing activity with your customer
                  journey, helping you keep potential customers moving forward.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  "Attract",
                  "Capture",
                  "Respond",
                  "Qualify",
                  "Follow Up",
                  "Convert",
                ].map((item, index) => (
                  <div
                    key={item}
                    className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-4"
                  >
                    <span className="mr-3 text-sm font-bold text-blue-400">
                      0{index + 1}
                    </span>
                    <span className="font-semibold">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Industries */}
      <section id="industries" className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
              Built for service businesses
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Marketing automation that understands your business.
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              Start with the services you provide. Adverio adapts its
              campaigns, content and customer communication around them.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {industries.map((industry) => (
              <div
                key={industry}
                className="rounded-xl border border-slate-200 bg-white px-5 py-5 text-center font-semibold shadow-sm"
              >
                {industry}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
              Simple pricing
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Start small. Grow when you need to.
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              We'll keep the early version simple while we validate what
              businesses actually need.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
            <p className="text-lg font-bold">Free during early access</p>

            <p className="mt-4 text-5xl font-bold">
              £0
              <span className="text-base font-medium text-slate-500">
                {" "}
                / month
              </span>
            </p>

            <p className="mt-4 leading-7 text-slate-600">
              Join the early version and help shape the product before paid
              plans are introduced.
            </p>

            <a
              href="/signup"
              className="mt-8 block rounded-xl bg-blue-600 px-6 py-4 text-center font-semibold text-white transition hover:bg-blue-700"
            >
              Join Early Access
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-950">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center lg:px-8 lg:py-28">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Spend less time chasing marketing.
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Let AI handle the repetitive work while you focus on serving your
            customers and growing your business.
          </p>

          <a
            href="/signup"
            className="mt-9 inline-flex rounded-xl bg-blue-600 px-7 py-4 font-semibold text-white transition hover:bg-blue-700"
          >
            Get Started with Adverio
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>
            © {new Date().getFullYear()} Adverio. All rights reserved.
          </p>

          <div className="flex gap-6">
            <a href="/privacy" className="transition hover:text-white">
              Privacy
            </a>
            <a href="/terms" className="transition hover:text-white">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
