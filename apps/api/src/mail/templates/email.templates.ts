// Pure-function HTML templates — no template engine dependency.
// All styles are inlined for maximum email client compatibility.

const BASE_STYLES = `
  body { margin: 0; padding: 0; background: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .wrap { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
  .header { background: #1a1a2e; padding: 28px 32px; text-align: center; }
  .header h1 { margin: 0; color: #fff; font-size: 22px; letter-spacing: 0.5px; }
  .header span { color: #6c8ebf; font-size: 13px; }
  .body { padding: 32px; color: #2d3748; line-height: 1.6; }
  .body h2 { margin: 0 0 8px; font-size: 20px; color: #1a1a2e; }
  .body p { margin: 0 0 16px; font-size: 15px; }
  .info-card { background: #f7faff; border: 1px solid #dbeafe; border-radius: 6px; padding: 20px; margin: 20px 0; }
  .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
  .info-row:last-child { border-bottom: none; padding-bottom: 0; }
  .info-row .label { color: #718096; }
  .info-row .value { font-weight: 600; color: #1a202c; }
  .code-box { text-align: center; background: #1a1a2e; border-radius: 8px; padding: 24px; margin: 24px 0; }
  .code-box .digits { font-size: 42px; font-weight: 700; letter-spacing: 12px; color: #fff; font-family: 'Courier New', monospace; }
  .code-box p { margin: 8px 0 0; color: #94a3b8; font-size: 13px; }
  .btn { display: inline-block; background: #2563eb; color: #fff !important; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 600; margin: 8px 0; }
  .btn-danger { background: #dc2626; }
  .btn-success { background: #16a34a; }
  .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; font-size: 14px; color: #92400e; margin: 16px 0; }
  .footer { background: #f8fafc; padding: 20px 32px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  .tag { display: inline-block; background: #dbeafe; color: #1d4ed8; padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 12px; }
  .security-badge { background: #fef3c7; color: #92400e; }
`;

function html(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>ParkNest</h1>
      <span>Smart Parking, Simplified</span>
    </div>
    <div class="body">${body}</div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} ParkNest &bull; This is an automated message, please do not reply.<br/>
      If you did not request this, please ignore or contact support@parknest.com
    </div>
  </div>
</body>
</html>`;
}

// ─── Driver: Booking Confirmation ─────────────────────────────────────────────

export interface BookingConfirmationData {
  driverName: string;
  bookingRef: string;
  spaceName: string;
  spaceAddress: string;
  startTime: string;     // pre-formatted
  endTime: string;
  vehicleNumber: string;
  vehicleType: string;
  totalAmount: string;
  arrivalCode: string;
  paymentMethod: string;
  paymentExpiresIn?: number; // seconds, if still PENDING
}

export function bookingConfirmationEmail(d: BookingConfirmationData): { subject: string; html: string } {
  const isPending = !!d.paymentExpiresIn;
  const body = `
    <span class="tag">${isPending ? 'Action Required' : 'Booking Confirmed'}</span>
    <h2>Hello, ${d.driverName}!</h2>
    <p>${isPending
      ? `Your booking <strong>${d.bookingRef}</strong> has been created. <strong>Complete payment within ${Math.round(d.paymentExpiresIn! / 60)} minutes</strong> to secure your spot.`
      : `Your parking spot is confirmed. Show the code below when you arrive.`
    }</p>

    <div class="info-card">
      <div class="info-row"><span class="label">Booking Ref</span><span class="value">${d.bookingRef}</span></div>
      <div class="info-row"><span class="label">Parking Space</span><span class="value">${d.spaceName}</span></div>
      <div class="info-row"><span class="label">Address</span><span class="value">${d.spaceAddress}</span></div>
      <div class="info-row"><span class="label">Start Time</span><span class="value">${d.startTime}</span></div>
      <div class="info-row"><span class="label">End Time</span><span class="value">${d.endTime}</span></div>
      <div class="info-row"><span class="label">Vehicle</span><span class="value">${d.vehicleNumber} (${d.vehicleType})</span></div>
      <div class="info-row"><span class="label">Amount</span><span class="value">${d.totalAmount}</span></div>
      <div class="info-row"><span class="label">Payment</span><span class="value">${d.paymentMethod}</span></div>
    </div>

    ${!isPending ? `
    <p><strong>Your Arrival Code</strong> — show this to security personnel when you arrive:</p>
    <div class="code-box">
      <div class="digits">${d.arrivalCode.split('').join(' ')}</div>
      <p>Valid until 30 minutes after your booking start time</p>
    </div>
    <div class="alert">
      Keep this code private. Security staff will ask you to show it — never read it over the phone.
    </div>
    ` : `
    <div class="alert">
      Complete your payment in the app before the timer runs out, or your booking will be automatically cancelled.
    </div>
    `}
  `;
  return {
    subject: isPending
      ? `[Action Required] Complete Payment for Booking ${d.bookingRef}`
      : `Booking Confirmed — ${d.spaceName} on ${d.startTime}`,
    html: html(`Booking ${d.bookingRef}`, body),
  };
}

// ─── Security Staff: Verification Alert ───────────────────────────────────────

export interface SecurityAlertData {
  bookingRef: string;
  spaceName: string;
  driverName: string;
  vehicleNumber: string;
  vehicleType: string;
  startTime: string;
  endTime: string;
  arrivalCode: string;
  magicLinkUrl: string;    // one-time link to confirm arrival
  magicLinkExpiry: string; // human-readable expiry
}

export function securityAlertEmail(d: SecurityAlertData): { subject: string; html: string } {
  const body = `
    <span class="tag security-badge">Security Verification</span>
    <h2>Incoming Vehicle</h2>
    <p>A driver is expected to arrive at <strong>${d.spaceName}</strong>. Please verify their identity using the details below.</p>

    <div class="info-card">
      <div class="info-row"><span class="label">Booking Ref</span><span class="value">${d.bookingRef}</span></div>
      <div class="info-row"><span class="label">Driver Name</span><span class="value">${d.driverName}</span></div>
      <div class="info-row"><span class="label">Vehicle Number</span><span class="value" style="font-size:18px;color:#1d4ed8">${d.vehicleNumber}</span></div>
      <div class="info-row"><span class="label">Vehicle Type</span><span class="value">${d.vehicleType}</span></div>
      <div class="info-row"><span class="label">Expected From</span><span class="value">${d.startTime}</span></div>
      <div class="info-row"><span class="label">Expected Until</span><span class="value">${d.endTime}</span></div>
    </div>

    <p><strong>Expected Arrival Code</strong> — driver will show this code. Verify it matches:</p>
    <div class="code-box">
      <div class="digits">${d.arrivalCode.split('').join(' ')}</div>
      <p>If driver cannot show the code, use the verification link below</p>
    </div>

    <p>Or use the one-click verification link (no login required):</p>
    <p style="text-align:center">
      <a href="${d.magicLinkUrl}" class="btn btn-success">
        ✓ Confirm Driver Arrival
      </a>
    </p>

    <div class="alert" style="background:#fee2e2;border-color:#ef4444;color:#991b1b;">
      <strong>Security Instructions:</strong><br/>
      1. Check the vehicle number plate matches exactly: <strong>${d.vehicleNumber}</strong><br/>
      2. Only confirm after visually verifying the driver's code or plate<br/>
      3. This link can only be used once and expires ${d.magicLinkExpiry}<br/>
      4. Never share this email or link with the driver
    </div>

    <p style="font-size:13px;color:#718096">
      This link expires ${d.magicLinkExpiry}. If the driver arrives after this time, use manual code entry in the ParkNest security portal.
    </p>
  `;
  return {
    subject: `[Security] Verify Arrival — ${d.vehicleNumber} at ${d.spaceName}`,
    html: html(`Security Alert — ${d.bookingRef}`, body),
  };
}
