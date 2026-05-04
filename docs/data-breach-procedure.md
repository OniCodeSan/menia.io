# Menia.io — Data Breach Response Procedure

**Version:** 1.0
**Last updated:** 2026-04-25
**Owner:** DPO (dpo@menia.io)

---

## 1. Detection & Reporting

Any team member who suspects a data breach must immediately:

1. Log the incident in the `breach_log` table via the admin panel
2. Set severity: `low` / `medium` / `high` / `critical`
3. Notify the DPO at dpo@menia.io within **1 hour**

### Severity classification

| Severity | Description | Example |
|----------|-------------|---------|
| Low | No personal data exposed, no user impact | Failed intrusion attempt, blocked by firewall |
| Medium | Limited personal data potentially exposed | Email addresses leaked, non-sensitive metadata |
| High | Sensitive personal data exposed | Passwords, payment info, private messages |
| Critical | Large-scale exposure + active exploitation | Database dump, mass credential theft |

---

## 2. Containment (within 4 hours)

### Immediate actions
- Isolate affected systems (revoke API keys, rotate secrets)
- Block compromised accounts or endpoints
- Preserve evidence (logs, snapshots)
- Document all actions taken in `breach_log.containment_actions`

### Technical checklist
- [ ] Rotate Supabase service role key if compromised
- [ ] Rotate Resend API key if email system affected
- [ ] Rotate CCBill credentials if payment data involved
- [ ] Invalidate all active user sessions if auth compromised
- [ ] Enable Cloudflare Under Attack mode if DDoS involved

---

## 3. Assessment (within 24 hours)

Determine:
- **What data was affected** (record in `data_types_affected`)
- **How many users** (record in `affected_users`)
- **Root cause** (vulnerability, misconfiguration, social engineering)
- **Whether data was actually accessed or just exposed**

---

## 4. DPA Notification (within 72 hours)

**Required by GDPR Article 33** when the breach is likely to result in a risk to individuals' rights and freedoms.

### When to notify
- Personal data was actually accessed by unauthorized parties
- Sensitive data categories involved (financial, health, ID documents)
- Large number of users affected

### How to notify
- Authority: **Garante per la Protezione dei Dati Personali** (Italy)
- Portal: https://www.garanteprivacy.it
- Record in `breach_log`: set `dpa_notified = true`, `dpa_notified_at = NOW()`

### Notification must include
1. Nature of the breach
2. Categories and approximate number of affected individuals
3. Name and contact details of the DPO
4. Likely consequences of the breach
5. Measures taken or proposed to address the breach

### Template email

```
Subject: Data Breach Notification — Menia.io

To: Garante per la Protezione dei Dati Personali

Date: [DATE]

1. Data Controller: Menia.io
   DPO: dpo@menia.io

2. Nature of breach: [DESCRIPTION]
   Date detected: [DATE]
   Date occurred (estimated): [DATE]

3. Data categories affected: [email, name, payment info, etc.]
   Approximate number of affected individuals: [NUMBER]

4. Likely consequences: [DESCRIPTION]

5. Measures taken:
   - [CONTAINMENT ACTIONS]
   - [REMEDIATION STEPS]

6. Additional measures planned:
   - [FUTURE ACTIONS]
```

---

## 5. User Notification

**Required by GDPR Article 34** when the breach is likely to result in a **high risk** to individuals.

### When to notify users
- Passwords or authentication tokens exposed
- Financial data exposed
- Private messages or content exposed
- Identity documents exposed

### How to notify
- Email to all affected users
- In-app notification banner
- Record in `breach_log`: set `notification_sent = true`, `notification_sent_at = NOW()`

### User notification must include
1. Plain language description of what happened
2. What data was involved
3. What we've done about it
4. What users should do (change password, monitor accounts)
5. DPO contact for questions

---

## 6. Resolution & Post-Mortem

After containment:
1. Fix the root cause
2. Update `breach_log.status` to `resolved`, set `resolved_at`
3. Write a post-mortem documenting:
   - Timeline of events
   - Root cause analysis
   - What went well / what didn't
   - Action items to prevent recurrence
4. Review and update security measures
5. Update this procedure if needed

---

## 7. Record Keeping

All breach records are retained indefinitely in the `breach_log` table for legal compliance. Access is restricted to admin users only via RLS policy.

---

## Contact

- **DPO:** dpo@menia.io
- **Support:** support@menia.io
- **Privacy:** privacy@menia.io
