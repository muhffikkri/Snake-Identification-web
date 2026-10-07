# SnakeBiteAI Design System

**Version:** 1.0
**Product:** SnakeBiteAI
**Design Direction:** Clinical Flat UI + Soft Neumorphism
**Primary Accent:** `#70020F`

---

## 1. Design Vision

SnakeBiteAI is an AI-assisted platform designed to provide clarity and actionable information during snakebite-related situations.

The visual identity must communicate:

- Professional
- Trustworthy
- Clinical
- Simple
- Clean
- Formal
- Precise
- Accessible
- Calm under pressure

The interface should feel like a **professional health technology platform**, not a generic AI dashboard or consumer application.

The design combines:

> **70% Flat UI + 20% Soft Neumorphism + 10% contextual visual elements**

Flat UI provides structure, clarity, accessibility, and information hierarchy. Soft Neumorphism is used selectively to introduce subtle depth and physicality without compromising readability.

The interface must prioritize **information and decision-making over decoration**.

---

# 2. Core Design Principles

## 2.1 Clarity First

Every screen should immediately answer:

1. What is this page?
2. What can the user do here?
3. What information is important?
4. What action should the user take next?

Avoid unnecessary visual elements that compete with the primary action.

---

## 2.2 Calm, Especially During Emergencies

Snakebite incidents may occur in stressful and time-sensitive situations.

The UI must therefore avoid:

- Excessive animation
- Strong gradients
- Neon colors
- Excessive visual effects
- Dense layouts
- Decorative illustrations that obscure information
- Unnecessary confirmation dialogs

The emergency assessment workflow must be fast and obvious.

---

## 2.3 Professional Over Futuristic

SnakeBiteAI is an AI product, but the interface should not attempt to communicate "AI" through futuristic visual clichés.

Avoid:

- Neon blue/purple AI gradients
- Glowing cards
- Holographic effects
- Excessive glassmorphism
- Futuristic typography
- Excessive animated particles

Instead, AI should be communicated through:

- Clear prediction results
- Confidence information
- Explainable findings
- Structured recommendations
- Data visualization
- Transparent workflow

---

## 2.4 Information Before Decoration

The interface should prioritize:

```text
Information
    ↓
Hierarchy
    ↓
Action
    ↓
Visual decoration
```

Never reverse this order.

---

## 2.5 Progressive Disclosure

Complex information should not be presented all at once.

Show:

```text
Primary result
      ↓
Key findings
      ↓
Detailed analysis
      ↓
Supporting information
```

This is particularly important for AI predictions and government data.

---

# 3. Visual Language

## 3.1 Primary Style

The primary design language is:

**Clinical Flat UI**

Characteristics:

- White and neutral surfaces
- Clear borders
- Restrained shadows
- Strong typography hierarchy
- Consistent spacing
- Minimal decoration
- Semantic colors
- Large whitespace

---

## 3.2 Secondary Style

Use:

**Soft Neumorphism**

only for selected interactive or elevated elements.

Good use cases:

- Primary action cards
- Important assessment panels
- Camera capture area
- Selected navigation state
- Floating controls
- Small interactive controls

Avoid using neumorphism for:

- Every card
- Tables
- Long text blocks
- Dense data visualization
- Navigation structures
- Every button

The effect should be subtle enough that the interface still looks professional if the shadows were removed.

---

# 4. Color System

## 4.1 Brand Color

The existing SnakeBiteAI logo uses:

```text
Brand / Primary Accent
#70020F
```

This color must remain the primary brand accent.

It represents the existing visual identity and should remain recognizable throughout the product.

However, `#70020F` must **not** be used for every important element.

It should primarily represent:

- Brand identity
- Primary CTA
- Selected states
- Important highlights
- Key navigation states
- Links when appropriate
- Brand-related illustrations

---

## 4.2 Neutral Palette

The majority of the interface should use neutral colors.

```text
Background
#F7F8FA

Surface
#FFFFFF

Surface Secondary
#F2F4F7

Border
#E4E7EC

Border Strong
#D0D5DD

Text Primary
#101828

Text Secondary
#475467

Text Muted
#667085

Text Disabled
#98A2B3
```

The background should generally be off-white rather than pure white to create subtle separation between the application canvas and content surfaces.

---

## 4.3 Brand Color Scale

The primary accent can be expanded into a tonal scale:

```text
Brand 50
#FDF2F3

Brand 100
#F9E4E6

Brand 200
#F2C8CC

Brand 300
#E69DA4

Brand 400
#D56E79

Brand 500
#B83B49

Brand 600
#8F1828

Brand 700
#70020F

Brand 800
#57010B

Brand 900
#3A0007
```

`#70020F` remains the canonical brand color.

Lighter tones should be used for:

- Selected backgrounds
- Badges
- Hover states
- Soft alerts
- Background accents

Darker tones should be used carefully for:

- Strong text
- Hover states
- Active controls

---

# 5. Semantic Colors

Brand color and semantic status colors must remain separate.

## Success

```text
Success
#15803D

Success Background
#F0FDF4
```

Used for:

- Normal
- Completed
- Verified
- Successful operations

---

## Warning

```text
Warning
#B7791F

Warning Background
#FFFBEB
```

Used for:

- Moderate risk
- Attention required
- Incomplete information

---

## Danger

```text
Danger
#C53030

Danger Background
#FEF2F2
```

Used for:

- High risk
- Critical findings
- Emergency warnings

---

## Information

```text
Info
#2563EB

Info Background
#EFF6FF
```

Used for:

- General information
- Educational information
- Neutral AI explanations

---

# 6. Color Usage Rule

Do not create entire cards using semantic colors.

Preferred:

```text
┌─────────────────────────────────────┐
│ Assessment Result                   │
│                                     │
│ ● HIGH RISK                         │
│                                     │
│ Clinical attention recommended      │
└─────────────────────────────────────┘
```

Avoid:

```text
█████████████████████████████████████
██        HIGH RISK                 ██
██                                  ██
█████████████████████████████████████
```

Semantic color should communicate **meaning**, not decorate the interface.

---

# 7. Typography

## 7.1 Font

Preferred font:

**Inter**

The font should be used consistently throughout the application unless the existing implementation already defines another product font.

Typography should feel:

- Neutral
- Highly readable
- Clinical
- Professional
- Modern

---

## 7.2 Type Scale

```text
Display
48–64px / Bold

H1
36–44px / Semibold

H2
28–32px / Semibold

H3
22–24px / Semibold

H4
18–20px / Semibold

Body Large
16–18px / Regular

Body
14–16px / Regular

Body Small
13–14px / Regular

Caption
12px / Regular
```

Avoid excessive use of bold text.

Bold typography should communicate hierarchy.

---

# 8. Spacing System

Use a consistent 4px-based spacing system.

```text
4px
8px
12px
16px
20px
24px
32px
40px
48px
64px
80px
96px
128px
```

Common usage:

```text
4–8px     → icon/text relationship
12–16px   → compact component spacing
20–24px   → card internal spacing
32–48px   → section spacing
64–96px   → major section spacing
96–128px  → landing page section spacing
```

Whitespace should be intentionally generous.

---

# 9. Border Radius

Use moderate rounding.

```text
Small
6px

Default
10px

Card
12px

Large
16px

Hero / Feature
20px

Pill
999px
```

Avoid extremely rounded cards.

The interface should remain formal rather than playful.

---

# 10. Shadows

Shadows must be subtle.

Primary shadow:

```text
0 2px 8px rgba(16, 24, 40, 0.06)
```

Elevated shadow:

```text
0 8px 24px rgba(16, 24, 40, 0.08)
```

Soft neumorphic shadow:

```text
4px 4px 12px rgba(16, 24, 40, 0.08)
-4px -4px 12px rgba(255, 255, 255, 0.9)
```

Neumorphic shadows should only be used on appropriate surfaces.

Never combine multiple heavy shadows.

---

# 11. Buttons

## Primary Button

Brand-colored:

```text
Background: #70020F
Text: #FFFFFF
Radius: 10px
```

Example:

```text
[ Start Assessment → ]
```

---

## Secondary Button

```text
Background: #FFFFFF
Border: #D0D5DD
Text: #101828
```

---

## Tertiary Button

Use for low-priority actions:

```text
Background: transparent
Text: #70020F
```

---

## Emergency CTA

Emergency actions should be visually distinct but not visually overwhelming.

Example:

```text
[ Start Triage Assessment ]
```

The button may use the brand color or danger color depending on context.

The danger color should be reserved for actual danger states rather than merely indicating that an assessment is available.

---

# 12. Cards

Cards should follow:

```text
Surface: #FFFFFF
Border: #E4E7EC
Radius: 12–16px
Shadow: subtle
Padding: 24px
```

Cards are containers for information, not decoration.

Avoid nested cards whenever possible.

---

# 13. Navigation

The application should use a minimal navigation structure.

For general users:

```text
SnakeBiteAI

Dashboard
Identify Snake
Snake Map
Triage Assessment
History

----------------

Profile
Settings
```

The exact navigation may change depending on authentication state.

For government users:

```text
SnakeBiteAI

Overview
Snake Distribution
Map
Species
Data & Reports

----------------

Settings
Account
```

---

# 14. Responsive Design

SnakeBiteAI must be responsive across:

- Desktop
- Tablet
- Mobile

The emergency assessment workflow must be especially optimized for mobile.

Primary responsive principle:

```text
Desktop
2–3 column layouts

Tablet
2 column layouts

Mobile
1 column layouts
```

Do not simply shrink the desktop interface.

Information hierarchy should be redesigned for smaller screens.

---

# 15. User Types

SnakeBiteAI has two primary user groups:

```text
                    SnakeBiteAI
                         │
             ┌───────────┴───────────┐
             │                       │
        General User            Government
             │                       │
       Clinical / Public       Population /
       assistance              surveillance
```

---

# 16. General User Experience

General users can:

1. Identify snakes using the camera
2. View snake information
3. View snakes based on location
4. Perform triage assessment
5. View assessment results
6. View dashboard
7. View assessment history
8. Manage their account

The general user interface should prioritize **immediate assistance and simplicity**.

---

# 17. Emergency Access

A critical design requirement is:

> **Triage assessment must be available without authentication.**

Users must be able to enter the assessment directly from the landing page.

The workflow is:

```text
Landing Page
      ↓
Start Triage
      ↓
Assessment
      ↓
AI / Clinical Analysis
      ↓
Result
      ↓
┌─────────────────────────────┐
│ Create account to save      │
│ this assessment             │
│                             │
│ [ Create Account ]          │
│ [ Continue Without Saving ] │
└─────────────────────────────┘
```

Creating an account must **not** be required to obtain the assessment result.

This is a fundamental product principle because a snakebite incident may occur when:

- The user has never used SnakeBiteAI
- The user does not have an account
- The user is assisting another person
- The situation is time-sensitive
- The user cannot reasonably stop to register

Authentication should therefore be treated as a **persistence feature**, not a gatekeeper to emergency assistance.

---

# 18. Anonymous Assessment

Anonymous assessments may produce:

- Assessment result
- Risk level
- Clinical findings
- AI explanation
- Recommendations

However:

```text
Anonymous assessment
        ↓
Result available
        ↓
Not persisted to user history
```

After the result, the system may offer:

> "Create an account to save this assessment and access it later."

The prompt must not obstruct the result.

---

# 19. Snake Identification

The snake identification feature is one of the core product experiences.

Primary workflow:

```text
Identify Snake
      ↓
Open Camera
      ↓
Capture Image
      ↓
AI Processing
      ↓
Identification Result
```

The interface should clearly communicate that the result is an **AI-assisted identification**, not absolute certainty.

---

# 20. Snake Identification Result

The result should contain:

```text
Identification Result

Likely Species
[ Snake Name ]

Confidence
87.4%

Possible Matches

01  Species A
    87.4%

02  Species B
    8.6%

03  Species C
    4.0%
```

The system should distinguish:

### Primary Suspect

The species with the highest model confidence.

### Related / Similar Species

Other species visually similar to the captured snake.

This distinction is important because visual snake identification can be uncertain.

---

# 21. Snake Information

Each species page should provide structured information such as:

```text
Species Name
Scientific Name

Identification

Distribution

Habitat

Venom / Toxicity Information

Physical Characteristics

Similar Species

Regional Information
```

Information should be presented progressively rather than as a large wall of text.

---

# 22. Location-Based Snake Discovery

Users can explore snakes based on location.

Default location:

> **The user's current location**

The location feature should allow:

```text
Current Location
       ↓
Nearby / Regional Species
       ↓
Snake Species List
       ↓
Species Details
```

Users should be able to manually change their location.

Example:

```text
Your Location

Semarang, Central Java

Species commonly reported in this region:

• Species A
• Species B
• Species C
```

---

# 23. User Dashboard

The general user dashboard should focus on the user's activity.

Example:

```text
Welcome back

Your recent activity

┌──────────────────┐
│ Assessments      │
│ 12               │
└──────────────────┘

┌──────────────────┐
│ Snake Identified │
│ 8                │
└──────────────────┘

Recent Assessments

Date       Result       Status
--------------------------------
07 Oct     Moderate     Complete
05 Oct     Low          Complete
```

The dashboard should not imitate an enterprise analytics dashboard.

---

# 24. User History

History should provide a simple chronological record.

```text
Assessment History

07 October 2026
Moderate Risk
Patient / Case #001

03 October 2026
Low Risk
Patient / Case #002
```

Each entry should be selectable to view the complete assessment.

---

# 25. Government Experience

Government users have a fundamentally different goal.

Their primary concern is not individual assessment but:

> **Understanding snake distribution and population-level patterns across Indonesia.**

The government interface should therefore be a **data visualization and surveillance dashboard**.

---

# 26. Government Dashboard

Primary dashboard:

```text
Indonesia Snake Distribution

Overview

Total Species
XXX

Recorded Locations
XXX

Venomous Species
XXX

Reports
XXX
```

Below the summary:

```text
┌──────────────────────────────────────────────┐
│                                              │
│              INDONESIA MAP                  │
│                                              │
│      ● ●                                    │
│             ●                               │
│                    ●                        │
│                                              │
│        Snake Distribution                   │
│                                              │
└──────────────────────────────────────────────┘
```

The map is the central visualization.

---

# 27. Indonesia Distribution Map

The map should allow users to:

- View snake distribution
- Filter by species
- Search species name
- Filter by province
- Filter by venomous/non-venomous status
- Inspect reported locations
- View distribution density
- View relevant statistics

Example:

```text
Species
[ All Species ▼ ]

Region
[ All Indonesia ▼ ]

Venom Status
[ All ▼ ]

Search
[ Search species... ]
```

---

# 28. Government Map Interaction

Clicking a province or data point should reveal:

```text
Central Java

Recorded Species
24

Venomous Species
8

Reports
342

Most Reported Species

1. Species A
2. Species B
3. Species C
```

The map should not overwhelm users with labels.

Use progressive disclosure.

---

# 29. Species Analytics

Government users should be able to select a snake species.

Example:

```text
Species Overview

King Cobra

Scientific Name
Ophiophagus hannah

Distribution
Indonesia

Recorded Regions
...

Reports
...

Distribution Trend
...

Related Species
...
```

The exact data displayed depends on available data sources.

---

# 30. Government Data Visualization

Recommended visualization types:

### Map

For geographic distribution.

### Bar Chart

For species frequency.

### Line Chart

For temporal trends.

### Donut / Pie

Only when category comparison is genuinely useful.

### Table

For detailed records.

Avoid charts purely for decoration.

Every visualization should answer a meaningful question.

---

# 31. Landing Page

The landing page should remain the primary storytelling and product-pitch surface.

The existing content should be preserved, but the visual presentation should be redesigned.

The landing page structure:

```text
Hero
↓
The Problem
↓
Product Workflow
↓
Development Plan
↓
Team Members
↓
Global Health System & Academic Collaborators
↓
Footer
```

---

# 32. Hero Section

The central tagline must remain:

> **WHEN MINUTES MATTER, SNAKEBITEAI DELIVERS CLARITY**

This is the primary brand statement.

Recommended hierarchy:

```text
SNAKEBITEAI

WHEN MINUTES MATTER,
SNAKEBITEAI DELIVERS CLARITY.

AI-assisted snake identification,
triage assessment, and geographic insight.

[ Identify a Snake ]
[ Start Triage Assessment ]
```

The two CTAs should be immediately accessible.

---

# 33. Hero Visual

The hero should visually communicate:

```text
Snake
   ↓
Camera
   ↓
AI
   ↓
Identification
   ↓
Assessment
   ↓
Action
```

The visual should remain restrained.

Possible visual direction:

- High-quality snake photography
- Clean medical illustration
- Abstract geographic map
- Subtle technical diagram
- Minimal AI visualization

Avoid overly futuristic AI graphics.

---

# 34. The Problem Section

The existing "The Problem" content should be retained.

The visual treatment should transform the content into a clear narrative:

```text
THE PROBLEM

Snakebite remains a time-sensitive
public health challenge.

01
Delayed identification

02
Limited access to information

03
Uncertainty during triage

04
Fragmented geographic data
```

The section should focus on the real-world problem rather than immediately promoting technology.

---

# 35. Product Workflow Section

This section should explain the entire product ecosystem.

Recommended visual:

```text
01
Capture

Take a photo
of the snake
       ↓
02
Identify

AI analyzes
the image
       ↓
03
Assess

Perform triage
assessment
       ↓
04
Understand

Review findings
and recommendations
       ↓
05
Monitor

Access history
and data
```

The workflow should visually connect each step.

---

# 36. Development Plan

The development plan should communicate product maturity and roadmap.

Use a timeline:

```text
Research
   ↓
Prototype
   ↓
AI Development
   ↓
Clinical Evaluation
   ↓
Pilot Deployment
   ↓
Scaling
```

Each phase can contain a concise description.

Avoid turning this into a dense project management chart.

---

# 37. Team Members

The team section should be clean and academic/professional.

Each member:

```text
[Photo]

Name
Role

Short description
```

Example roles:

- AI / Machine Learning
- Software Engineering
- Medical / Clinical
- Research
- Product / Design

Do not overload the section with long biographies.

---

# 38. Global Health System & Academic Collaborators

This section should communicate credibility.

Use:

- Institutional logos
- Partner names
- Academic affiliations
- Healthcare organizations
- Research collaborators

The visual treatment should be restrained.

Avoid creating a "sponsor wall" with oversized logos.

Recommended:

```text
GLOBAL HEALTH SYSTEM
& ACADEMIC COLLABORATORS

[ Logo ]   [ Logo ]   [ Logo ]
[ Logo ]   [ Logo ]   [ Logo ]
```

---

# 39. Landing Page CTA Strategy

There should be two levels of CTA.

## Primary

```text
Identify a Snake
```

## Emergency / High Priority

```text
Start Triage Assessment
```

Triage must always remain accessible without authentication.

A user should never encounter:

> "Sign in before continuing."

before an emergency assessment.

---

# 40. Authentication Strategy

Authentication is primarily used for:

- Saving assessment history
- Saving identified snakes
- Personal dashboard
- Persistent user data
- Personal preferences

It should not be required for:

- Opening the landing page
- Identifying a snake
- Viewing general snake information
- Starting a triage assessment
- Completing a triage assessment
- Viewing an anonymous assessment result

---

# 41. Empty States

Empty states should be informative.

Example:

```text
No assessments yet

Your saved assessments will appear here.

[ Start Assessment ]
```

Avoid generic:

> "Nothing here."

---

# 42. Loading States

AI processing should communicate progress without making unrealistic promises.

Example:

```text
Analyzing image

Identifying visual characteristics...
Comparing possible species...
Preparing results...
```

Avoid fake progress percentages unless the system actually measures progress.

---

# 43. Error States

Errors must be clear and actionable.

Example:

```text
Unable to analyze this image

The image may be too dark, blurry,
or the snake may not be clearly visible.

[ Try Another Image ]
```

Never expose raw technical errors to general users.

---

# 44. AI Transparency

AI results must communicate uncertainty.

Avoid:

> "This is definitely a King Cobra."

Prefer:

> "Most likely: King Cobra"

with:

```text
Confidence: 87.4%
```

and possible alternatives.

The interface should reinforce that AI is an **assistive system**, not a replacement for professional medical judgment.

---

# 45. Accessibility

The interface must support:

- Sufficient color contrast
- Keyboard navigation
- Visible focus states
- Accessible labels
- Large enough touch targets
- Screen-reader-friendly structure
- Semantic HTML
- Do not rely on color alone to communicate status

For example:

```text
● HIGH RISK
```

should not rely only on red color. The text "HIGH RISK" must remain explicit.

---

# 46. Motion

Motion should be subtle and functional.

Recommended:

```text
150–200ms
```

for:

- Hover
- Button transitions
- Navigation state
- Small card interactions

Use:

```text
250–400ms
```

for:

- Page transitions
- Panels
- Modal/dialog transitions
- Major content changes

Avoid:

- Continuous animations
- Excessive parallax
- Bouncing UI
- Decorative loading animations

The landing page may use slightly more motion than the application itself.

---

# 47. Iconography

Icons should be:

- Minimal
- Consistent
- Outline-based
- Simple
- Professional

Recommended sizes:

```text
16px
20px
24px
32px
```

Do not mix multiple icon styles.

---

# 48. Data Density

General user interface:

> Low–Medium density

Government interface:

> Medium–High density

This distinction is intentional.

The general user needs clarity.

The government user needs information density and analytical tools.

---

# 49. Design Personality

The final personality of SnakeBiteAI should be:

```text
Professional
     +
Clinical
     +
Calm
     +
Precise
     +
Accessible
     +
Data-driven
```

Not:

```text
Futuristic
     +
Flashy
     +
Experimental
```

---

# 50. Product Architecture Through Design

The interface should communicate three major capabilities:

```text
                    SNAKEBITEAI
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
       ▼                 ▼                 ▼
   IDENTIFY           ASSESS           UNDERSTAND
       │                 │                 │
       ▼                 ▼                 ▼
    Snake AI          Triage           Geographic
   Identification    Assessment          Data
       │                 │                 │
       └─────────────────┼─────────────────┘
                         ▼
                    CLARITY
```

These three pillars should be recognizable throughout the product.

---

# 51. Primary User Journey

```text
Landing Page
      │
      ├───────────────┐
      │               │
      ▼               ▼
Identify Snake    Start Triage
      │               │
      ▼               ▼
Camera             Assessment
      │               │
      ▼               ▼
AI Result          Result
      │               │
      └───────┬───────┘
              ▼
       Create Account
        (Optional)
              │
              ▼
        Save History
```

---

# 52. Government Journey

```text
Government Login
       ↓
Government Dashboard
       ↓
Indonesia Map
       ↓
Filter / Search
       ↓
Province / Region
       ↓
Species
       ↓
Detailed Data
       ↓
Reports / Analytics
```

---

# 53. Design Token Summary

The initial implementation should expose design tokens rather than scattering values throughout the codebase.

Example:

```css
:root {
  --color-brand: #70020f;

  --color-background: #f7f8fa;
  --color-surface: #ffffff;
  --color-surface-secondary: #f2f4f7;

  --color-border: #e4e7ec;
  --color-border-strong: #d0d5dd;

  --color-text-primary: #101828;
  --color-text-secondary: #475467;
  --color-text-muted: #667085;
  --color-text-disabled: #98a2b3;

  --color-success: #15803d;
  --color-warning: #b7791f;
  --color-danger: #c53030;
  --color-info: #2563eb;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 20px;
  --radius-pill: 999px;
}
```

The exact implementation may use CSS variables, Tailwind tokens, a theme provider, or another system depending on the frontend architecture.

---

# 54. Design Do / Don't

## Do

- Use `#70020F` consistently as the brand accent
- Use neutral backgrounds
- Maintain generous whitespace
- Use subtle shadows
- Use moderate corner radii
- Use semantic colors
- Prioritize readability
- Keep emergency actions immediately accessible
- Communicate AI uncertainty
- Use data visualization meaningfully
- Keep government analytics information-dense
- Keep general-user interfaces simple

## Don't

- Use neon gradients
- Use excessive glassmorphism
- Use excessive neumorphism
- Make every card colorful
- Use large decorative shadows
- Use futuristic fonts
- Hide emergency assessment behind authentication
- Present AI predictions as absolute truth
- Overload the landing page with animations
- Fill dashboards with unnecessary metrics
- Use color as the only indicator of status

---

# 55. Final Design Direction

The final SnakeBiteAI interface should feel like:

> **A trustworthy clinical AI platform that remains understandable when the user needs information quickly.**

The design should combine:

**SnakeBiteAI Brand**

`#70020F`

with:

**Clinical Flat UI**

for structure and clarity,

and:

**Soft Neumorphism**

for subtle depth and interaction.

The resulting interface should be:

> **Professional enough for government and academic stakeholders, simple enough for the general public, and clear enough to remain useful during a time-sensitive snakebite situation.**

The most important design principle is:

> **When minutes matter, the interface must remove friction rather than add it.**
