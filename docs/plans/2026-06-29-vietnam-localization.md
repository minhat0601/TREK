# Vietnam Localization & VietQR Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Localize the Tripp application for Vietnam by defaulting currency to VND, centering blank maps on Vietnam, and integrating dynamic VietQR codes for debt settlements.

**Architecture:** We will extend the user profile settings to store banking credentials (Bank ID, Account No, Account Name) using the existing settings table. Settle-up flows calculated on the server will enrich the recipient user object with their payment credentials. The frontend's SettleUp component will parse these credentials to render a VietQR image with URL-encoded fields, showing a payment modal with bank transfer info copy buttons.

**Tech Stack:** React, TypeScript, Leaflet, Node.js, SQLite, better-sqlite3, NestJS, VietQR API (`img.vietqr.io`).

---

## Proposed Changes

### Task 1: Update Settings Types and Server Default Settings
* **Files:**
  * Modify: [client/src/types.ts](file:///Users/nhatminh/Desktop/TREK/client/src/types.ts)
  * Modify: [client/src/store/settingsStore.ts](file:///Users/nhatminh/Desktop/TREK/client/src/store/settingsStore.ts)
  * Modify: [server/src/services/tripService.ts](file:///Users/nhatminh/Desktop/TREK/server/src/services/tripService.ts)

* **Step 1: Add new settings properties to Settings interface in client types**
  Add keys `payment_bank_id`, `payment_account_no`, `payment_account_name` as optional strings to `Settings` interface in `client/src/types.ts`.
* **Step 2: Update default values in SettingsStore**
  In `client/src/store/settingsStore.ts`:
  * Change `default_lat` to `16.0471`
  * Change `default_lng` to `108.2062`
  * Change `default_zoom` to `6`
  * Change `default_currency` to `'VND'`
  * Change `dashboard_fx_from` to `'VND'`
  * Initialize `payment_bank_id: ''`, `payment_account_no: ''`, `payment_account_name: ''` in initial state.
* **Step 3: Update default trip currency on server**
  In `server/src/services/tripService.ts`: Change default fallback in `createTrip` from `'EUR'` to `'VND'`.

---

### Task 2: Default Map Center to Vietnam (Da Nang, zoom 6)
* **Files:**
  * Modify: [client/src/components/Map/MapView.tsx](file:///Users/nhatminh/Desktop/TREK/client/src/components/Map/MapView.tsx)
  * Modify: [client/src/components/Map/MapViewGL.tsx](file:///Users/nhatminh/Desktop/TREK/client/src/components/Map/MapViewGL.tsx)

* **Step 1: Change default MapView center**
  In `client/src/components/Map/MapView.tsx`: Change `center = [48.8566, 2.3522]` to `[16.0471, 108.2062]`, and `zoom = 10` to `6`.
* **Step 2: Change default MapViewGL center**
  In `client/src/components/Map/MapViewGL.tsx`: Change `center = [48.8566, 2.3522]` to `[16.0471, 108.2062]`, and `zoom = 10` to `6`.

---

### Task 3: Support Vietnamese Dong (VND) Format Display
* **Files:**
  * Modify: [client/src/utils/formatters.ts](file:///Users/nhatminh/Desktop/TREK/client/src/utils/formatters.ts)

* **Step 1: Register VND locale formatting**
  In `client/src/utils/formatters.ts`:
  * Add `VND: 'vi-VN'` to the `currencyLocales` mapping so that VND formats using correct dot separator and currency symbol.
  * Adjust precision formatting if needed so that VND has `0` decimal places by default.

---

### Task 4: Expose Recipient Bank settings in Settlement Flows
* **Files:**
  * Modify: [server/src/services/budgetService.ts](file:///Users/nhatminh/Desktop/TREK/server/src/services/budgetService.ts)

* **Step 1: Add getUserPaymentDetails helper on server**
  In `server/src/services/budgetService.ts`, define a helper to fetch payment settings for a user.
* **Step 2: Enrich getSettlement output**
  In `server/src/services/budgetService.ts`, query payment settings for each creditor in the flows list and return `payment_bank_id`, `payment_account_no`, and `payment_account_name` inside `to` object.

---

### Task 5: Add Bank Info form to Account Settings Page
* **Files:**
  * Modify: [client/src/components/Settings/AccountTab.tsx](file:///Users/nhatminh/Desktop/TREK/client/src/components/Settings/AccountTab.tsx)

* **Step 1: Update AccountTab with VietQR form section**
  * Import `useSettingsStore` and Lucide `QrCode` icon.
  * Display a form section `Cấu hình thanh toán (VietQR)` with Bank dropdown (containing main Vietnamese banks: VCB, TCB, MB, BIDV, etc.), Account No field, and Account Name field.
  * Save updates to user settings database on clicking "Save profile" or a dedicated section save button.

---

### Task 6: Integrate VietQR Scanner & Modal in Costs Panel
* **Files:**
  * Modify: [client/src/components/Budget/CostsPanel.tsx](file:///Users/nhatminh/Desktop/TREK/client/src/components/Budget/CostsPanel.tsx)

* **Step 1: Display QR code scanning button**
  In `SettleFlows` function inside `client/src/components/Budget/CostsPanel.tsx`, check if the payee (`f.to`) has `payment_account_no` set. If so, display a clean button labeled "QR" next to the Settle button.
* **Step 2: Build VietQR generation modal**
  * Create a modal inside `CostsPanel` which receives the flow details (payer name, payee bank credentials, amount, trip name).
  * Build the image URL to `https://img.vietqr.io/image/<bank>-<account>-compact.png`.
  * Clean transfer description: remove Vietnamese tones/accents (e.g. `[Sender Name] ck chuyen di [Trip Name]`).
  * Display the QR code and copyable fields (Bank, Acc Number, Acc Name, Amount).

---

## Verification Plan

### Automated Tests
- Run `npm run test --workspace=server` and `npm run test --workspace=client` to ensure no regression.
- Write tests in `client/tests/unit/utils/formatters.test.ts` to assert VND formatting yields correct outputs.

### Manual Verification
- Deploy to Render and verify default currency defaults to VND on new trip creation.
- Check if settings account tab lists bank options and successfully saves them.
- Settle debts inside a shared trip and scan the generated VietQR code using a bank app to confirm details parse perfectly.
