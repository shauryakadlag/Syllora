# Syllora

> A learning-resource platform designed to map university syllabus topics directly to useful learning resources topic-by-topic.

## MVP Scope (Fixed Context)

* **University:** Savitribai Phule Pune University (SPPU)
* **Curriculum Pattern:** 2024 Pattern
* **Branch:** Computer Engineering
* **Cohort:** Second Year Engineering (SE — Semesters III & IV)

> *Note:* SPPU and the 2024 Pattern serve as the fixed MVP context, not user-selectable steps.

## User-Facing Syllabus Flow

The MVP navigation follows an intuitive, topic-level hierarchy:

```
Computer Engineering → Semester → Subject → Unit → Topic → Learning Resources
```

## Security-by-Design Principles (Mandatory for all future milestones)

All subsequent database, authentication, API, and administrative feature development must adhere strictly to security-by-design:

* **Server-Side Authorization:** Never rely solely on client-side state for access control.
* **Principle of Least Privilege:** Restrict database roles, API keys, and service access to minimal required scopes.
* **Row Level Security (RLS):** Enforce strict Supabase RLS policies across all tables.
* **Secure Secret Handling:** Never check secrets or service keys into client code or version control.
* **Strict Input Validation:** Validate and sanitize all user and query inputs before processing.
* **OWASP Protections:** Guard against injection, XSS, CSRF, and broken access control.
* **Rate Limiting:** Protect future API routes and auth endpoints from abuse.
* **Secure Headers & Cookies:** Utilize HttpOnly, Secure, SameSite flags, and security headers.
* **Safe Logging:** Prevent sensitive student or credential data from leaking into logs.
* **Continuous Auditing:** Routine dependency vulnerability scans and security posture checks.

## Architecture & Tech Stack

* **Framework:** [Next.js](https://nextjs.org/) (App Router, React 18)
* **Language:** TypeScript (Strict mode enabled)
* **Styling:** Tailwind CSS (CSS variables, custom academic theme)
* **Components:** shadcn/ui primitives (`Button`, `Card`, `Badge`, `Separator`)
* **Icons:** [Lucide React](https://lucide.dev/)

## Directory Structure

```
syllora/
├── app/
│   ├── globals.css            # Tailwind directives and CSS theme variables
│   ├── layout.tsx             # Root layout with Header & Footer
│   └── page.tsx               # Responsive homepage
├── components/
│   ├── home/
│   │   ├── hero.tsx           # Value proposition, title, and "Explore Syllabus" CTA
│   │   ├── hierarchy-flow.tsx # Step-by-step visual representation of syllabus navigation
│   │   └── scope-card.tsx     # Focused curriculum boundary & active MVP scope
│   ├── layout/
│   │   ├── header.tsx         # Navigation header with desktop & mobile drawer
│   │   └── footer.tsx         # Academic context, SPPU info & copyright
│   └── ui/
│       ├── badge.tsx          # Reusable status/pattern badge
│       ├── button.tsx         # Reusable button with variants & Radix Slot
│       ├── card.tsx           # Reusable card component
│       └── separator.tsx      # Divider component
├── lib/
│   └── utils.ts               # cn() helper
├── types/
│   └── syllabus.ts            # Minimal domain models (Branch, Semester, Subject, Unit, Topic, Resource)
├── public/                    # Static assets
├── components.json            # shadcn/ui configuration
├── tailwind.config.ts         # Tailwind design tokens
├── tsconfig.json              # Strict TypeScript configuration
└── package.json               # Dependencies and scripts
```

## Getting Started

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm run start
```

### Type Checking & Linting

```bash
npx tsc --noEmit
npm run lint
```