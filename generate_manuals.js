const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// Helper to create a stylized document
function createManual({ title, subtitle, filename, sections }) {
  const doc = new PDFDocument({
    margin: 45,
    size: 'A4',
    bufferPages: true,
  });

  const outputPath = path.join('E:', 'WaCRM', 'wacrm-main', filename);
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  const primaryColor = '#0f766e'; // teal-700
  const secondaryColor = '#0d9488'; // teal-600
  const darkTextColor = '#1e293b'; // slate-800
  const mutedTextColor = '#64748b'; // slate-500
  const lightBg = '#f8fafc'; // slate-50
  const accentBorder = '#cbd5e1'; // slate-300

  // Header Banner
  doc.rect(45, 45, 505, 75).fill(primaryColor);
  doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text(title, 60, 60);
  doc.fillColor('#99f6e4').fontSize(11).font('Helvetica').text(subtitle, 60, 90);

  doc.moveDown(3);

  // Table of Contents or Overview box
  doc.rect(45, 135, 505, 45).fillAndStroke(lightBg, accentBorder);
  doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text('DOCUMENT OVERVIEW', 55, 145);
  doc.fillColor(mutedTextColor).fontSize(9).font('Helvetica').text(
    'This official document provides operational guidelines, configuration steps, and best practices for the WaCRM platform.',
    55,
    160,
    { width: 485 }
  );

  doc.y = 195;

  sections.forEach((sec, idx) => {
    // Check page break headroom
    if (doc.y > 660) {
      doc.addPage();
    }

    // Section title
    doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text(`${idx + 1}. ${sec.heading}`);
    doc.strokeColor(secondaryColor).lineWidth(1.5).moveTo(45, doc.y + 2).lineTo(550, doc.y + 2).stroke();
    doc.moveDown(0.7);

    // Section Content
    sec.items.forEach((item) => {
      if (doc.y > 700) {
        doc.addPage();
      }

      if (item.type === 'paragraph') {
        doc.fillColor(darkTextColor).fontSize(9.5).font('Helvetica').lineGap(2.5).text(item.text, { width: 505 });
        doc.moveDown(0.6);
      } else if (item.type === 'bullet') {
        doc.fillColor(secondaryColor).fontSize(9.5).font('Helvetica-Bold').text('• ', { continued: true });
        doc.fillColor(darkTextColor).font('Helvetica-Bold').text(item.boldPrefix ? `${item.boldPrefix}: ` : '', { continued: true });
        doc.font('Helvetica').text(item.text, { width: 490 });
        doc.moveDown(0.4);
      } else if (item.type === 'callout') {
        const boxY = doc.y;
        doc.rect(45, boxY, 505, item.height || 48).fillAndStroke(item.bgColor || '#f0fdf4', item.borderColor || '#86efac');
        doc.fillColor(item.titleColor || '#166534').fontSize(9.5).font('Helvetica-Bold').text(item.title, 55, boxY + 8);
        doc.fillColor(item.textColor || '#14532d').fontSize(8.5).font('Helvetica').text(item.text, 55, boxY + 22, { width: 485 });
        doc.y = boxY + (item.height || 48) + 10;
      } else if (item.type === 'code') {
        const codeBoxY = doc.y;
        doc.rect(45, codeBoxY, 505, item.height || 36).fillAndStroke('#1e293b', '#0f172a');
        doc.fillColor('#38bdf8').fontSize(8.5).font('Courier').text(item.text, 55, codeBoxY + 10, { width: 485 });
        doc.y = codeBoxY + (item.height || 36) + 10;
      }
    });

    doc.moveDown(0.8);
  });

  // Footer with Page Numbers
  const totalPages = doc.bufferedPageRange().count;
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    doc.fillColor(mutedTextColor).fontSize(8).font('Helvetica').text(
      `WaCRM Official Documentation • Page ${i + 1} of ${totalPages}`,
      45,
      800,
      { align: 'center', width: 505 }
    );
  }

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

// 1. SUPER ADMIN MANUAL DATA
const adminManualData = {
  title: 'WaCRM Super Admin & SaaS Operations Manual',
  subtitle: 'Complete Guide to Subscription Billing, Client Management & Automated WhatsApp Reminders',
  filename: 'WaCRM_Super_Admin_Manual.pdf',
  sections: [
    {
      heading: 'Platform Overview & Super Admin Privileges',
      items: [
        {
          type: 'paragraph',
          text: 'WaCRM has been upgraded into a multi-tenant SaaS application. As the platform owner, you possess Super Admin privileges allowing you to manage customer workspaces, set billing parameters, track recurring revenue, and automate subscription renewal notices via WhatsApp.',
        },
        {
          type: 'bullet',
          boldPrefix: 'Multi-Tenant Architecture',
          text: 'Each client operates inside an isolated workspace with their own contacts, WhatsApp inbox, pipelines, and automations.',
        },
        {
          type: 'bullet',
          boldPrefix: 'Super Admin Access',
          text: 'Granted via profile.is_super_admin flag, NEXT_PUBLIC_SUPER_ADMIN_EMAILS env variable, or local Demo Mode.',
        },
        {
          type: 'bullet',
          boldPrefix: 'Admin CRM Portal Location',
          text: 'Accessible at the /admin route or by clicking the "Admin CRM (SaaS)" badge in the left sidebar.',
        },
      ],
    },
    {
      heading: 'Navigating the Admin CRM Dashboard',
      items: [
        {
          type: 'paragraph',
          text: 'The Admin CRM dashboard displays real-time SaaS financial and operational metrics calculated directly from your tenant database:',
        },
        {
          type: 'bullet',
          boldPrefix: 'Monthly Recurring Revenue (MRR)',
          text: 'Cumulative monthly revenue generated across all active paying subscribers.',
        },
        {
          type: 'bullet',
          boldPrefix: 'Active Tenants',
          text: 'Number of businesses currently enjoying uninterrupted access to their WhatsApp CRM.',
        },
        {
          type: 'bullet',
          boldPrefix: 'Expiring Soon (<= 7 Days)',
          text: 'Accounts whose renewal date approaches within the current week, targeted for automatic payment reminders.',
        },
        {
          type: 'bullet',
          boldPrefix: 'Past Due / Suspended',
          text: 'Tenants who have not renewed past their grace period, triggering access warning banners.',
        },
      ],
    },
    {
      heading: 'Subscriber Management & Subscription Lifecycle',
      items: [
        {
          type: 'paragraph',
          text: 'The Client Subscriptions table lists every business using your platform. Super Admins can search, filter, and take immediate action on any account:',
        },
        {
          type: 'bullet',
          boldPrefix: 'One-Click Renewal (+30 Days)',
          text: 'Click the green "+30d" button when payment is received. The system extends the account period by 30 days, marks status as Active, resets reminder counters, and logs an audit transaction in subscription_payments.',
        },
        {
          type: 'bullet',
          boldPrefix: 'Flexible Term Extensions',
          text: 'Open the Renewal Dialog to choose +30 days, +90 days (Quarterly), or +365 days (Annual), input custom amount received, and log reference IDs (UPI, Stripe, Razorpay, or Bank Wire).',
        },
        {
          type: 'bullet',
          boldPrefix: 'Suspend / Reactivate Toggle',
          text: 'Instantly lock access if payment is delinquent. Suspended users see an in-app renewal screen with your payment link.',
        },
        {
          type: 'bullet',
          boldPrefix: 'Edit Subscriber',
          text: 'Customize individual plan names (e.g. Enterprise Custom), monthly rates, custom payment links, or billing phone numbers.',
        },
      ],
    },
    {
      heading: 'Automated WhatsApp Payment Reminders',
      items: [
        {
          type: 'paragraph',
          text: 'The system includes an automated background cron engine (/api/cron/subscription-reminders) that safeguards recurring revenue:',
        },
        {
          type: 'bullet',
          boldPrefix: '3 Days Before Expiry',
          text: 'Sends an advance, friendly reminder including the customer name, amount due, and your payment link.',
        },
        {
          type: 'bullet',
          boldPrefix: '1 Day Before Expiry',
          text: 'Sends an urgent notification to ensure continuous WhatsApp connectivity.',
        },
        {
          type: 'bullet',
          boldPrefix: 'Due Date / Past Due',
          text: 'Notifies customer of expiration and prompts renewal to re-enable full capabilities.',
        },
        {
          type: 'bullet',
          boldPrefix: 'Anti-Spam Protection',
          text: 'Accounts receive at most one reminder in any 24-hour window, regardless of trigger frequency.',
        },
        {
          type: 'bullet',
          boldPrefix: 'Instant Manual Reminder',
          text: 'Click "Remind" in the table to send an immediate WhatsApp message via Meta API, or open a pre-formatted wa.me chat link.',
        },
        {
          type: 'callout',
          title: 'RUNNING THE CRON ON DEMAND',
          text: 'Click "Run Daily Auto-Reminders" at the top-right of /admin to scan and dispatch all eligible payment reminders instantly.',
          bgColor: '#ecfdf5',
          borderColor: '#10b981',
          titleColor: '#065f46',
          textColor: '#047857',
        },
      ],
    },
    {
      heading: 'Creating & Provisioning Customer Accounts (Step-by-Step)',
      items: [
        {
          type: 'paragraph',
          text: 'Super Admins can directly create and configure client accounts without requiring the customer to go through public registration. This allows you to set up customized subscription packages, pricing, and initial validity upfront.',
        },
        {
          type: 'bullet',
          boldPrefix: 'Step 1: Open the Creation Dialog',
          text: 'In /admin, click the green "+ Create Customer" button located above the subscriptions table.',
        },
        {
          type: 'bullet',
          boldPrefix: 'Step 2: Enter Business & Owner Profile',
          text: 'Provide the Business/Company Name (e.g. Acme Textiles) and Owner Full Name (e.g. Rahul Sharma).',
        },
        {
          type: 'bullet',
          boldPrefix: 'Step 3: Define Login Credentials',
          text: 'Enter the customer login email. The system automatically pre-fills a secure password (e.g. Pass@4821), or you can specify a custom password.',
        },
        {
          type: 'bullet',
          boldPrefix: 'Step 4: Configure WhatsApp Phone & Plan Tier',
          text: 'Enter the client WhatsApp billing number with country code (e.g. +919876543210). Select plan tier: Monthly Pro, Starter, Business Plus, or Enterprise.',
        },
        {
          type: 'bullet',
          boldPrefix: 'Step 5: Set Fee, Currency & Term Duration',
          text: 'Input the monthly subscription amount (e.g. 999 INR or $49 USD). Choose validity duration: 14-day trial, 30 days (1 month), 60 days, 90 days (quarterly), or 365 days (annual).',
        },
        {
          type: 'bullet',
          boldPrefix: 'Step 6: Status & Payment Link',
          text: 'Select "Active" if payment was received in advance, or "Trial". Optionally attach a custom UPI/Razorpay payment link.',
        },
        {
          type: 'bullet',
          boldPrefix: 'Step 7: Instant Handover via WhatsApp or Clipboard',
          text: 'Upon submission, a popup appears displaying the portal URL, email, and password. Click "Copy Login Credentials" or "Send Credentials via WhatsApp" to dispatch welcome details directly to the client.',
        },
        {
          type: 'callout',
          title: 'INSTANT ONBOARDING TIP',
          text: 'Using "Send Credentials via WhatsApp" opens WhatsApp with a ready-to-send welcome message containing the login link, email, and password so the customer can access their portal immediately.',
          bgColor: '#ecfdf5',
          borderColor: '#10b981',
          titleColor: '#065f46',
          textColor: '#047857',
        },
      ],
    },
    {
      heading: 'Providing Ongoing Customer Support & Operations',
      items: [
        {
          type: 'paragraph',
          text: 'As a SaaS provider, providing smooth onboarding and ongoing operational support to your clients ensures high customer retention. Here are the core support workflows:',
        },
        {
          type: 'bullet',
          boldPrefix: 'A. WhatsApp Cloud API & Number Setup Support',
          text: 'Help clients navigate to Settings -> WhatsApp to configure their Meta Phone Number ID, WhatsApp Business Account ID (WABA ID), and Permanent Access Token.',
        },
        {
          type: 'bullet',
          boldPrefix: 'B. Testing Webhook Connectivity',
          text: 'Ensure incoming messages and delivery receipts are received by verifying the webhook URL and verify token configured in the Meta Developer Portal.',
        },
        {
          type: 'bullet',
          boldPrefix: 'C. Handling Subscription Renewals & Grace Periods',
          text: 'When a client pays fees (via UPI, Bank Transfer, or Stripe), locate their account and click "Renew (+30d)". If a client requests a few extra days, use "Edit" to extend their expiry date manually without payment disruption.',
        },
        {
          type: 'bullet',
          boldPrefix: 'D. Multi-Agent Team Support',
          text: 'Guide clients to Settings -> Members to invite additional staff members. Admins manage account settings, while Agents handle day-to-day customer chats.',
        },
        {
          type: 'bullet',
          boldPrefix: 'E. Delinquency Handling & Account Freezing',
          text: 'If a client delays renewal, use the "Suspend" toggle to freeze their access. Their contacts, chat history, and automations remain 100% safe and intact until reactivated.',
        },
        {
          type: 'bullet',
          boldPrefix: 'F. Client Account Offboarding / Deletion',
          text: 'If a client permanently terminates their service, click the red Trash icon to remove their workspace completely from the database.',
        },
        {
          type: 'callout',
          title: 'ZERO-DOWNTIME SUPPORT CHANNELS',
          text: 'Set your WhatsApp Support Number in /admin under Platform Settings. When a client encounters an expired subscription or needs assistance, their portal shows a direct "WhatsApp Admin" button linking to your number.',
          bgColor: '#eff6ff',
          borderColor: '#60a5fa',
          titleColor: '#1e40af',
          textColor: '#1d4ed8',
        },
      ],
    },
    {
      heading: 'Payment Link & Template Customization',
      items: [
        {
          type: 'paragraph',
          text: 'Under the "Payment Links & Reminder Settings" tab in /admin, configure platform-wide payment and messaging parameters:',
        },
        {
          type: 'bullet',
          boldPrefix: 'Default Payment Link',
          text: 'Paste your universal payment page (e.g., Stripe Payment Link, Razorpay Page, UPI payment URL, or PayPal link).',
        },
        {
          type: 'bullet',
          boldPrefix: 'Customizable Variables in WhatsApp Template',
          text: 'Use dynamic tags: {{name}}, {{account_name}}, {{due_date}}, {{amount}}, and {{payment_link}}.',
        },
        {
          type: 'bullet',
          boldPrefix: 'Admin Support Number',
          text: 'Provide your WhatsApp phone number. Expired customer portals show a "WhatsApp Admin" button linking directly to you.',
        },
      ],
    },
    {
      heading: 'Vercel & Supabase Production Deployment Checklist',
      items: [
        {
          type: 'bullet',
          boldPrefix: 'Database Migration',
          text: 'Execute supabase/combined_all_migrations.sql (which contains Migration 043) in your Supabase SQL Editor.',
        },
        {
          type: 'bullet',
          boldPrefix: 'Automated Vercel Cron Schedule',
          text: 'Configure vercel.json to trigger /api/cron/subscription-reminders daily at 09:00 UTC.',
        },
        {
          type: 'code',
          text: '{ "crons": [{ "path": "/api/cron/subscription-reminders", "schedule": "0 9 * * *" }] }',
          height: 30,
        },
      ],
    },
  ],
};

// 2. USER MANUAL DATA
const userManualData = {
  title: 'WaCRM Client User Manual & Quick-Start Guide',
  subtitle: 'How to Manage Chats, Contacts, Pipelines, Campaigns & Subscription Renewals',
  filename: 'WaCRM_User_Manual.pdf',
  sections: [
    {
      heading: 'Welcome to Your WhatsApp CRM Workspace',
      items: [
        {
          type: 'paragraph',
          text: 'WaCRM is an all-in-one customer relationship and messaging platform built specifically for WhatsApp Business. It empowers your team to collaborate on customer chats, manage sales funnels, launch broadcast campaigns, and automate follow-ups.',
        },
        {
          type: 'bullet',
          boldPrefix: 'Shared Multi-User Inbox',
          text: 'Allows your entire sales and support team to chat with customers simultaneously from one WhatsApp Business number.',
        },
        {
          type: 'bullet',
          boldPrefix: 'Contact & Audience Management',
          text: 'Store customer profiles, custom notes, purchase history, and multi-colored tags for quick segmentation.',
        },
      ],
    },
    {
      heading: 'Managing WhatsApp Chats in the Shared Inbox',
      items: [
        {
          type: 'bullet',
          boldPrefix: 'Conversations List',
          text: 'Access /inbox to view open, pending, and resolved customer threads with real-time unread badges.',
        },
        {
          type: 'bullet',
          boldPrefix: 'Rich Media Support',
          text: 'Send and receive text, voice notes, PDFs, documents, images, and videos directly through the WhatsApp Business API.',
        },
        {
          type: 'bullet',
          boldPrefix: 'Quick Replies (Canned Responses)',
          text: 'Type "/" in the chat composer to pull up pre-written template replies for FAQs, pricing details, and bank info.',
        },
        {
          type: 'bullet',
          boldPrefix: 'Customer Info Sidebar',
          text: 'The right pane displays contact tags, deals, and assignees without leaving the conversation.',
        },
      ],
    },
    {
      heading: 'Sales Pipelines & Visual Kanban Board',
      items: [
        {
          type: 'bullet',
          boldPrefix: 'Kanban Stages',
          text: 'Navigate to /pipelines to track prospects from Lead -> Qualified -> Proposal Sent -> Won / Closed.',
        },
        {
          type: 'bullet',
          boldPrefix: 'Drag & Drop Deals',
          text: 'Move deals seamlessly across stages with automated revenue and deal-value calculations per stage.',
        },
        {
          type: 'bullet',
          boldPrefix: 'Direct Chat Access',
          text: 'Click any deal card to instantly jump to the customer’s WhatsApp conversation thread.',
        },
      ],
    },
    {
      heading: 'Broadcast Marketing Campaigns',
      items: [
        {
          type: 'bullet',
          boldPrefix: 'Meta-Approved Templates',
          text: 'Send official WhatsApp broadcast messages to hundreds of opted-in customers using approved Meta templates.',
        },
        {
          type: 'bullet',
          boldPrefix: 'Targeted Audiences',
          text: 'Filter recipients by specific tags (e.g. VIP, Inactive, Follow-Up) to send relevant promotions.',
        },
        {
          type: 'bullet',
          boldPrefix: 'Live Campaign Analytics',
          text: 'Monitor real-time Delivery Rate, Read Rate, and Failure counts for every broadcast sent.',
        },
      ],
    },
    {
      heading: 'No-Code Automations & AI Smart Auto-Reply',
      items: [
        {
          type: 'bullet',
          boldPrefix: 'Welcome Auto-Replies',
          text: 'Automatically send a welcome message whenever a new customer reaches out to your WhatsApp number.',
        },
        {
          type: 'bullet',
          boldPrefix: 'Keyword Triggers',
          text: 'Configure automated actions (tagging, sending catalogs) when incoming messages contain specific keywords.',
        },
        {
          type: 'bullet',
          boldPrefix: 'AI Assistant',
          text: 'Enable the AI Auto-Responder under Settings -> AI to answer inquiries 24/7 using your custom business knowledge base.',
        },
      ],
    },
    {
      heading: 'Subscription Renewal & Payment Instructions',
      items: [
        {
          type: 'paragraph',
          text: 'Your WaCRM workspace operates on a monthly subscription fee. The platform ensures you never lose access by providing timely notifications:',
        },
        {
          type: 'bullet',
          boldPrefix: 'WhatsApp Renewal Reminders',
          text: 'You will receive payment reminders directly on your WhatsApp number 3 days and 1 day prior to expiration.',
        },
        {
          type: 'bullet',
          boldPrefix: 'In-App Warning Banner',
          text: 'A banner appears in your dashboard header when your plan is due for renewal, showing the exact expiry date and fee.',
        },
        {
          type: 'bullet',
          boldPrefix: 'How to Pay',
          text: 'Click the "Pay Renewal Now" button on your dashboard or in the WhatsApp reminder to complete payment via the secure payment link (UPI, Stripe, or Card).',
        },
        {
          type: 'bullet',
          boldPrefix: 'Payment Confirmation & Activation',
          text: 'Once paid, your validity is instantly updated by the Super Admin. If you need assistance, click the "WhatsApp Admin" button to connect directly with support.',
        },
      ],
    },
  ],
};

async function main() {
  console.log('Generating PDF manuals...');
  const adminPdf = await createManual(adminManualData);
  console.log('Created:', adminPdf);
  const userPdf = await createManual(userManualData);
  console.log('Created:', userPdf);

  // Copy both PDFs to Desktop for easy user access
  const desktop = path.join('C:', 'Users', 'HP', 'Desktop');
  fs.copyFileSync(adminPdf, path.join(desktop, 'WaCRM_Super_Admin_Manual.pdf'));
  fs.copyFileSync(userPdf, path.join(desktop, 'WaCRM_User_Manual.pdf'));
  console.log('Successfully copied both manuals to Desktop!');
}

main().catch(console.error);
