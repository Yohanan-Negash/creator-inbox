---
marp: true
paginate: true
theme: default
size: 16:9
title: Creator Inbox
description: Paid message requests for Whop creators and communities
---

# Creator Inbox

## Paid message requests, made simple

For Whop creators with communities who want to monetize easily through paid DMs. 

---

## Problem

- Many Whop creators do not leverage paid DMs.
- Those who do often run a messy process that is hard to organize and manage.
- Requests get scattered, follow-ups are manual, and revenue gets left on the table.

---

## Solution

Creator Inbox gives Whop creators and their community members one simple interface to:

- Submit paid text (message) requests
- Track request status end to end
- Manage responses in one admin workflow
- Handle payments and cashouts in one place

---

## Product Experience

### For community members
- Select request type
- Submit message request
- Pay and track status

### For creators
- Manage incoming requests in one admin view
- Reply with text responses
- Refund, delete, and cash out with clear controls

---

## Why Now

- Whop creators increasingly monetize direct relationships.
- Community products on Whop are growing, but DM workflows are still fragmented.
- AI can reduce setup friction (for example, drafting request types).

---

## Ideal Customers

- **New Whop creators** who want to monetize quickly with simple paid message requests.
- **Established Whop creators with large communities** who want to increase revenue with a more structured request workflow.

---

## Target Market (Whop-First)

Public Whop platform scale signals:

- **182,603 sellers on Whop**
- **14,145,127 users on Whop**
- **27,000+ businesses powered by Whop**

Source-backed takeaway: the Whop ecosystem is already large enough to support a focused creator workflow product.

---

## Serviceable Market Estimate

Whop does not publicly break out an exact count for paid-community creators.

So we model a simple range from total sellers (182,603):

| Assumption | Estimated creators |
|---|---:|
| 20% of sellers are paid-community creators | 36,521 |
| 30% of sellers are paid-community creators | 54,781 |
| 40% of sellers are paid-community creators | 73,041 |

This keeps the model transparent while staying anchored to published Whop numbers.

---

## Business Value

- Higher creator revenue per active community member
- Faster response cycles and better completion rates
- Less ops overhead vs. manual DM handling
- Better trust through transparent status and delivery

---

## Business Model

- Creator Inbox takes **10%** when creators cash out paid request earnings.
- That 10% includes both the app fee and Whop payment fees.

---

## Unit Economics 

Assume one creator gets **10 paid requests/week** at **$10/request**.

| Period | Creator Gross | Creator Net (90%) | Platform Revenue (10%) |
|---|---:|---:|---:|
| Daily (avg) | $14.29 | $12.86 | $1.43 |
| Weekly | $100 | $90 | $10 |
| Monthly (4.3w) | $430 | $387 | $43 |

---

## Revenue Projection Model

Let:

- `X` = number of active creators
- `R` = average paid requests per creator per week
- `P` = average price per request

Then:

- Platform Daily Revenue = `0.10 * X * R * P / 7`
- Platform Weekly Revenue = `0.10 * X * R * P`
- Platform Monthly Revenue = `0.10 * X * R * P * 4.3`

---

## Projection Example 

Assume:

- `X = 300` active creators
- `R = 10` requests/week per creator
- `P = $10` per request

| Period | Total Creator Gross | Platform Revenue (10%) |
|---|---:|---:|
| Daily (avg) | $4,285.71 | $428.57 |
| Weekly | $30,000 | $3,000 |
| Monthly (4.3w) | $129,000 | $12,900 |

---

## 3 Simple Scenarios (Stringent)

All scenarios assume low request volume (`8-12 requests/week` per creator).

| Scenario | Active Creators (X) | Requests/Week (R) | Price/Request (P) | Platform Monthly Revenue (10%) |
|---|---:|---:|---:|---:|
| Conservative | 100 | 8 | $8 | $2,752 |
| Base | 300 | 10 | $10 | $12,900 |
| Aggressive | 800 | 12 | $12 | $49,536 |

Monthly formula: `0.10 * X * R * P * 4.3`

---

## Go-To-Market (Draft)

- Start with creators already running paid communities
- Partner with creator agencies and operators
- Product-led onboarding with request type templates
- Share case studies focused on revenue lift and time saved

---

## Product Foundation

- Next.js + TypeScript frontend
- Convex backend for submissions and metrics
- Whop for identity, access, and payments
- AI-assisted request type generation for faster setup

---

## Product Vision

- Expand from text requests into audio, video, and feedback-based deliverables.
- Improve creator analytics around demand and conversion.
- **Today:** AI helps creators generate request types faster.
- **Next:** AI helps draft and manage submission responses while creators stay in control.

---

## Sources

1. Whop Sell page (platform stats: sellers, users, GMV): `https://whop.com/sell/`
2. Whop Paid Groups page (27,000+ businesses): `https://network.whop.com/network/solutions/paid-groups/`
3. Whop Paid Group use case page (paid-community context): `https://whop.com/sell/paid-group/`

All figures in this deck use these pages as of Feb 2026.

---

# Creator Inbox

## The simple paid message-request interface for Whop creators and communities

Contact: [your-email]  
Website: [your-site]
