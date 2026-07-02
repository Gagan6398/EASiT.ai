# Cookie Policy

**Easit.ai Inc.**
**Effective Date: July 1, 2026**

---

## 1. What Are Cookies?

Cookies are small text files stored on your device when you visit a website. Easit.ai primarily uses browser localStorage and sessionStorage rather than traditional HTTP cookies, but this policy covers all client-side data storage mechanisms.

## 2. What We Store

### 2.1 Essential Storage (Required for Service)

| Storage Key | Type | Purpose | Duration |
|---|---|---|---|
| `easit-jwt` | localStorage | Authentication token for your session | Until sign-out |
| `easit-persona` | localStorage | Your persona settings (tone, style, verbosity) | Persistent |
| `easit-query-mode` | localStorage | Your preferred query mode (quick/consensus) | Persistent |
| `easit-guest-conversations` | localStorage | Guest user conversation history | Persistent |
| `theme` | localStorage | Dark/light mode preference | Persistent |

### 2.2 Performance Storage

| Storage Key | Type | Purpose | Duration |
|---|---|---|---|
| Response Cache | Memory (RAM) | Caches recent AI responses to reduce latency | Session only |
| WebSocket State | Memory (RAM) | Maintains real-time connection state | Session only |

### 2.3 Third-Party Cookies

| Provider | Cookie | Purpose |
|---|---|---|
| Google Sign-In | Various | OAuth authentication flow |
| Google Fonts | N/A | Font loading (no cookies set) |

## 3. How to Manage Storage

### 3.1 Browser Controls
You can clear all Easit.ai data by:
1. Opening your browser's Developer Tools (F12)
2. Navigating to the "Application" or "Storage" tab
3. Selecting "Local Storage" → your Easit.ai domain
4. Clicking "Clear" to remove all stored data

### 3.2 In-App Controls
- **Sign Out**: Clears your authentication token
- **Delete Account**: Removes all server-side data associated with your account

### 3.3 Browser Settings
Most browsers allow you to:
- Block all cookies and storage
- Block third-party cookies only
- Delete existing cookies and storage
- Set exceptions for specific sites

Note: Blocking essential storage will prevent the Service from functioning properly.

## 4. Do Not Track

Easit.ai respects browser "Do Not Track" (DNT) signals. When DNT is enabled, we limit data collection to essential service functionality only.

## 5. Updates

We may update this Cookie Policy periodically. Changes will be reflected by updating the "Effective Date" at the top of this document.

## 6. Contact

For questions about this Cookie Policy:
Email: privacy@easit.ai

---

*This Cookie Policy was last updated on July 1, 2026.*
