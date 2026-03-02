# 📁 Feature Specifications

## Overview
โฟลเดอร์นี้เก็บ feature specs สำหรับ modules ใหม่ที่จะพัฒนาเพิ่มใน Invoice System

---

## 📋 Available Features

### ✅ Completed Features (In Current System)
- ✅ Invoice CRUD (Create, Read, Update, Delete)
- ✅ Customer Management
- ✅ Line Items Management
- ✅ Tax Calculation (VAT + Withholding Tax)
- ✅ PDF Export (via html2canvas + jsPDF)
- ✅ Print Function (window.print)
- ✅ Status Management (draft → sent → paid)
- ✅ Unit Tests (20 tests, 100% pass)

---

## 📝 Planned Features

### Priority 1: Must Have

#### 1. 📊 [Reports & Dashboard](./REPORTS_DASHBOARD.md)
**Status:** 📝 Planning  
**Priority:** High  
**Estimated Effort:** 3 weeks

**Features:**
- Dashboard with KPI cards (Total, Paid, Overdue)
- Revenue trend charts (Line graph)
- Top customers list
- Sales report by period (monthly/quarterly)
- Customer report (outstanding balances)
- Overdue invoices report
- Export to Excel/CSV
- Report caching for performance

**Tech Stack:**
- `recharts` for charts
- `xlsx` for Excel export
- Database views for queries
- React Query for caching

**API Endpoints:**
- `GET /api/dashboard/summary`
- `GET /api/dashboard/revenue-trend`
- `GET /api/reports/sales`
- `GET /api/reports/customers`
- `POST /api/reports/export`

---

#### 2. 💰 [Tax & Discount](./TAX_DISCOUNT.md)
**Status:** 📝 Planning  
**Priority:** High  
**Estimated Effort:** 3 weeks

**Features:**
- Item-level discounts (% or amount)
- Invoice-level discounts
- Multiple VAT rates (7% default, configurable)
- Withholding Tax options (1%, 3%, 5%)
- Tax-inclusive/exclusive pricing
- Detailed tax breakdown display
- Tax compliance (Thai regulations)

**Calculation Flow:**
```
Item Subtotal → Item Discount → Subtotal
→ Invoice Discount → After Discount
→ + VAT → - WHT → Grand Total
```

**Database Changes:**
- Add discount fields to `invoices` and `invoice_items`
- Add tax settings table (optional)
- Update calculation triggers

---

#### 3. 📧 [Email Notifications](./EMAIL_NOTIFICATIONS.md)
**Status:** 📝 Planning  
**Priority:** Medium  
**Estimated Effort:** 3 weeks

**Features:**
- Send invoice email with PDF attachment
- Payment reminders (7, 3, 1 days before due)
- Overdue notices (daily check)
- Payment confirmation emails
- Email templates (customizable)
- Email activity tracking (sent, opened, clicked)
- Scheduled cron jobs (via Vercel Cron)

**Email Provider:** Resend (Free: 3,000 emails/month)

**Email Types:**
1. Invoice Delivery
2. Payment Reminder (3 stages)
3. Overdue Notice
4. Payment Confirmation

**API Endpoints:**
- `POST /api/invoices/:id/send-email`
- `POST /api/emails/send-reminders` (cron)
- `POST /api/emails/send-overdue-notices` (cron)
- `GET /api/emails/logs`
- `GET/PUT /api/emails/settings`

---

### Priority 2: Important

#### 4. 🔐 [Authentication & Authorization](./AUTHENTICATION.md)
**Status:** 📝 Planning  
**Priority:** High  
**Estimated Effort:** 3-4 weeks

**Features:**
- User login/logout (Supabase Auth)
- **Google OAuth** ✅ (One-click sign in)
- Role-based access control (RBAC)
- 4 roles: Admin, Accountant, Sales, Viewer
- Multi-tenant support (multiple companies)
- User management (CRUD)
- Audit logs (track all changes)
- Session management
- Password reset

**Quick Start:** 👉 [Google OAuth Setup Guide](./GOOGLE_OAUTH_SETUP.md)

**Roles & Permissions:**
| Feature | Admin | Accountant | Sales | Viewer |
|---------|-------|------------|-------|--------|
| View Dashboard | ✅ | ✅ | ✅ | ✅ |
| Create Invoice | ✅ | ✅ | ✅ | ❌ |
| Edit Paid Invoice | ✅ | ✅ | ❌ | ❌ |
| Delete Invoice | ✅ | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ | ❌ |

**Database Changes:**
- Add `users`, `sessions`, `audit_logs` tables
- Add `company_id` to invoices/customers
- Enable Row Level Security (RLS)

---

## 🎯 Implementation Roadmap

### Phase 1: Foundation (Week 1-3)
- ✅ Reports & Dashboard
  - Week 1: Dashboard API + UI
  - Week 2: Reports API + SQL views
  - Week 3: Excel export + caching

### Phase 2: Business Logic (Week 4-6)
- ✅ Tax & Discount
  - Week 1: Database schema + calculation logic
  - Week 2: UI components (discount inputs)
  - Week 3: Testing + edge cases

### Phase 3: Automation (Week 7-9)
- ✅ Email Notifications
  - Week 1: Email service integration (Resend)
  - Week 2: API + templates
  - Week 3: Cron jobs + UI

### Phase 4: Security (Week 10-13)
- ✅ Authentication
  - Week 1: Auth setup (Supabase Auth)
  - Week 2: Authorization + RLS policies
  - Week 3: UI (login, user management)
  - Week 4: Audit logs + testing

---

## 📊 Feature Comparison Matrix

| Feature | Current | After Phase 1 | After Phase 2 | After Phase 3 | After Phase 4 |
|---------|---------|---------------|---------------|---------------|---------------|
| Dashboard | ❌ | ✅ | ✅ | ✅ | ✅ |
| Reports | ❌ | ✅ | ✅ | ✅ | ✅ |
| Discounts | ❌ | ❌ | ✅ | ✅ | ✅ |
| Multi Tax Rates | ❌ | ❌ | ✅ | ✅ | ✅ |
| Email Invoice | ❌ | ❌ | ❌ | ✅ | ✅ |
| Auto Reminders | ❌ | ❌ | ❌ | ✅ | ✅ |
| User Login | ❌ | ❌ | ❌ | ❌ | ✅ |
| Role Control | ❌ | ❌ | ❌ | ❌ | ✅ |
| Audit Logs | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 🔗 Dependencies Between Features

```
Authentication (Phase 4)
    ↓ (Required for)
Email Notifications (Phase 3)
    ↓ (Enhances)
Reports & Dashboard (Phase 1)
    ↓ (Uses data from)
Tax & Discount (Phase 2)
    ↓ (Affects calculations in)
Core Invoice System (Current)
```

**Note:** Features can be developed independently, but Authentication should be implemented before production deployment.

---

## 📚 How to Use This Folder

### For Developers
1. **Read the spec** before implementing
2. Follow the **Implementation Steps** section
3. Check **API Endpoints** for contract
4. Run **Tests** after implementation
5. Update **Status** and **Last Updated** date

### For Project Managers
1. Review **Priority** and **Estimated Effort**
2. Check **Dependencies** before scheduling
3. Monitor **Success Metrics** after deployment
4. Plan resources based on **Roadmap**

### For QA/Testers
1. Use **Testing** section for test cases
2. Check **Edge Cases** for boundary testing
3. Verify **API Endpoints** with examples
4. Test **Security** for authentication features

---

## 📝 Feature Spec Template

When creating new feature specs, use this template:

```markdown
# Feature Name

## Overview
Brief description

## Business Goals
What problem does this solve?

## User Stories
- AS A [role] I WANT TO [action] SO THAT [benefit]

## UI/UX Design
Wireframes or mockups

## Database Changes
SQL schema changes

## API Endpoints
List of endpoints with request/response

## Implementation Steps
Phase-by-phase breakdown

## Testing
Test cases and examples

## Success Metrics
How to measure success

## Future Enhancements
Ideas for later
```

---

## 🚀 Getting Started

### To implement a feature:

1. **Choose a feature** from the list
2. **Read the spec** thoroughly
3. **Create a branch**: `feature/reports-dashboard`
4. **Follow implementation steps** in the spec
5. **Write tests** as you go
6. **Update the spec** if anything changes
7. **Submit PR** with reference to spec

### To request a new feature:

1. Create a new file in this folder
2. Use the template above
3. Get review from team
4. Update this README

---

## 📞 Questions?

If you have questions about any feature:
1. Check the spec's **Future Enhancements** section
2. Look at **Similar Features** for reference
3. Ask in team chat with spec link

---

**Last Updated:** March 2, 2026  
**Total Features Planned:** 4  
**Total Estimated Effort:** 12-13 weeks  
**Status:** 📝 All specs complete, ready for development

