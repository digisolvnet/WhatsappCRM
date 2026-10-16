/**
 * Tenant-Configurable WhatsApp Flow Templates.
 *
 * Provides ready-to-use workflows for:
 * 1. Incoming customer message routing.
 * 2. Welcome and interactive menu selection.
 * 3. Product or service catalogue browsing.
 * 4. Product selection, quantity, and order summary.
 * 5. Customer details and consent collection.
 * 6. Checkout initiation and payment verification.
 * 7. Order confirmation after backend validation.
 * 8. Order tracking and fulfilment updates.
 * 9. Customer support escalation.
 * 10. Post-purchase feedback.
 * 11. Follow-up and repeat-purchase campaigns.
 * 12. Subscription notifications for platform accounts.
 */

import type {
  CollectInputNodeConfig,
  ConditionNodeConfig,
  HandoffNodeConfig,
  KeywordTriggerConfig,
  SendButtonsNodeConfig,
  SendListNodeConfig,
  SendMessageNodeConfig,
  StartNodeConfig,
} from "./types";

export type FlowTemplateNodeType =
  | "start"
  | "send_message"
  | "send_buttons"
  | "send_list"
  | "collect_input"
  | "condition"
  | "set_tag"
  | "handoff"
  | "end";

export interface FlowTemplateNode {
  node_key: string;
  node_type: FlowTemplateNodeType;
  config:
    | StartNodeConfig
    | SendMessageNodeConfig
    | SendButtonsNodeConfig
    | SendListNodeConfig
    | CollectInputNodeConfig
    | ConditionNodeConfig
    | HandoffNodeConfig
    | Record<string, unknown>;
}

export interface FlowTemplate {
  slug: string;
  name: string;
  description: string;
  icon: "MessageSquare" | "HelpCircle" | "UserPlus" | "ShoppingBag" | "Package" | "CheckCircle";
  trigger_type: "keyword" | "first_inbound_message" | "manual";
  trigger_config: KeywordTriggerConfig | Record<string, unknown>;
  entry_node_id: string;
  nodes: FlowTemplateNode[];
}

// 1. Incoming Customer Message Router
const INCOMING_MESSAGE: FlowTemplate = {
  slug: "incoming_message",
  name: "Incoming Message Router",
  description: "Greets incoming customer messages and routes to self-service or live support.",
  icon: "MessageSquare",
  trigger_type: "first_inbound_message",
  trigger_config: {},
  entry_node_id: "start",
  nodes: [
    { node_key: "start", node_type: "start", config: { next_node_key: "greeting" } },
    {
      node_key: "greeting",
      node_type: "send_buttons",
      config: {
        text: "Hello! Welcome to our store. How may we assist you today?",
        buttons: [
          { reply_id: "browse", title: "Browse Store", next_node_key: "msg_store" },
          { reply_id: "support", title: "Talk to Agent", next_node_key: "handoff_support" },
        ],
      } as SendButtonsNodeConfig,
    },
    {
      node_key: "msg_store",
      node_type: "send_message",
      config: {
        text: "You can explore our full product & service catalogue anytime! Reply CATALOG to view items.",
        next_node_key: "end",
      } as SendMessageNodeConfig,
    },
    { node_key: "handoff_support", node_type: "handoff", config: { note: "Inbound customer requested live assistance." } as HandoffNodeConfig },
    { node_key: "end", node_type: "end", config: {} },
  ],
};

// 2. Welcome & Menu Selection
const WELCOME_MENU: FlowTemplate = {
  slug: "welcome_menu",
  name: "Welcome Menu",
  description: "Interactive menu routing customers to Products, Services, or Support.",
  icon: "MessageSquare",
  trigger_type: "keyword",
  trigger_config: { keywords: ["menu", "hi", "hello"], match_type: "contains" },
  entry_node_id: "start",
  nodes: [
    { node_key: "start", node_type: "start", config: { next_node_key: "menu" } },
    {
      node_key: "menu",
      node_type: "send_buttons",
      config: {
        text: "Welcome! 👋 Please select an option from our main menu:",
        buttons: [
          { reply_id: "products", title: "View Products", next_node_key: "view_products" },
          { reply_id: "services", title: "Book Service", next_node_key: "view_services" },
          { reply_id: "help", title: "Help & FAQ", next_node_key: "view_help" },
        ],
      } as SendButtonsNodeConfig,
    },
    {
      node_key: "view_products",
      node_type: "send_message",
      config: { text: "We offer top quality retail items! Type CATALOGUE to view available stock.", next_node_key: "end" } as SendMessageNodeConfig,
    },
    {
      node_key: "view_services",
      node_type: "send_message",
      config: { text: "Our consultation sessions are available Mon-Fri. Type BOOK to schedule.", next_node_key: "end" } as SendMessageNodeConfig,
    },
    {
      node_key: "view_help",
      node_type: "handoff",
      config: { note: "Customer selected Help from the welcome menu." } as HandoffNodeConfig,
    },
    { node_key: "end", node_type: "end", config: {} },
  ],
};

// 3. Catalogue Browsing
const CATALOGUE_BROWSING: FlowTemplate = {
  slug: "catalogue_browsing",
  name: "Catalogue Browsing",
  description: "Presents product and service categories in an interactive WhatsApp list.",
  icon: "ShoppingBag",
  trigger_type: "keyword",
  trigger_config: { keywords: ["catalog", "catalogue", "shop"], match_type: "contains" },
  entry_node_id: "start",
  nodes: [
    { node_key: "start", node_type: "start", config: { next_node_key: "cat_list" } },
    {
      node_key: "cat_list",
      node_type: "send_list",
      config: {
        text: "Browse our active business catalogue below:",
        button_label: "View Catalogue",
        sections: [
          {
            title: "Physical Products",
            rows: [
              { reply_id: "prod_guide", title: "Marketing Guide", description: "₹499 (In stock)", next_node_key: "details_guide" },
              { reply_id: "prod_dongle", title: "Security Dongle", description: "₹1,299 (Hardware)", next_node_key: "details_dongle" },
            ],
          },
          {
            title: "Professional Services",
            rows: [
              { reply_id: "srv_waba", title: "WABA Verification", description: "₹2,499 (60 min session)", next_node_key: "details_service" },
            ],
          },
        ],
      } as SendListNodeConfig,
    },
    {
      node_key: "details_guide",
      node_type: "send_message",
      config: { text: "Marketing Guide (₹499): Complete strategy for lead generation. Type ORDER to buy.", next_node_key: "end" } as SendMessageNodeConfig,
    },
    {
      node_key: "details_dongle",
      node_type: "send_message",
      config: { text: "Security Dongle (₹1,299): Hardware 2FA token. Type ORDER to buy.", next_node_key: "end" } as SendMessageNodeConfig,
    },
    {
      node_key: "details_service",
      node_type: "send_message",
      config: { text: "WABA Verification (₹2,499): 1-on-1 setup session. Type BOOK to schedule.", next_node_key: "end" } as SendMessageNodeConfig,
    },
    { node_key: "end", node_type: "end", config: {} },
  ],
};

// 4. Product Selection, Quantity & Order Summary
const ORDER_BUILDER: FlowTemplate = {
  slug: "order_builder",
  name: "Product Selection & Cart",
  description: "Captures item selection, quantity, and calculates total order summary.",
  icon: "ShoppingBag",
  trigger_type: "keyword",
  trigger_config: { keywords: ["order", "buy", "purchase"], match_type: "contains" },
  entry_node_id: "start",
  nodes: [
    { node_key: "start", node_type: "start", config: { next_node_key: "select_item" } },
    {
      node_key: "select_item",
      node_type: "send_buttons",
      config: {
        text: "Which product would you like to purchase?",
        buttons: [
          { reply_id: "item_guide", title: "Marketing Guide", next_node_key: "ask_quantity" },
          { reply_id: "item_dongle", title: "Hardware Dongle", next_node_key: "ask_quantity" },
        ],
      } as SendButtonsNodeConfig,
    },
    {
      node_key: "ask_quantity",
      node_type: "collect_input",
      config: { prompt_text: "How many units would you like? (Enter a number, e.g. 1 or 2)", var_key: "order_qty", next_node_key: "order_summary" } as CollectInputNodeConfig,
    },
    {
      node_key: "order_summary",
      node_type: "send_message",
      config: { text: "Order Summary: Quantity {{vars.order_qty}} unit(s). Reply YES to confirm checkout details.", next_node_key: "end" } as SendMessageNodeConfig,
    },
    { node_key: "end", node_type: "end", config: {} },
  ],
};

// 5. Customer Details & Consent Collection
const CONSENT_AND_DETAILS: FlowTemplate = {
  slug: "consent_and_details",
  name: "Customer Details & Consent",
  description: "Collects delivery address, recipient details, and WhatsApp communication consent.",
  icon: "UserPlus",
  trigger_type: "keyword",
  trigger_config: { keywords: ["register", "checkout"], match_type: "contains" },
  entry_node_id: "start",
  nodes: [
    { node_key: "start", node_type: "start", config: { next_node_key: "ask_name" } },
    {
      node_key: "ask_name",
      node_type: "collect_input",
      config: { prompt_text: "Please enter your Full Name:", var_key: "cust_name", next_node_key: "ask_address" } as CollectInputNodeConfig,
    },
    {
      node_key: "ask_address",
      node_type: "collect_input",
      config: { prompt_text: "Please provide your delivery/billing address:", var_key: "cust_address", next_node_key: "ask_consent" } as CollectInputNodeConfig,
    },
    {
      node_key: "ask_consent",
      node_type: "send_buttons",
      config: {
        text: "Do you consent to receiving order updates & invoices on this WhatsApp number?",
        buttons: [
          { reply_id: "consent_yes", title: "Yes, I Agree", next_node_key: "consent_saved" },
          { reply_id: "consent_no", title: "No, Opt Out", next_node_key: "consent_denied" },
        ],
      } as SendButtonsNodeConfig,
    },
    {
      node_key: "consent_saved",
      node_type: "send_message",
      config: { text: "Thank you {{vars.cust_name}}! Your details and consent have been securely recorded.", next_node_key: "end" } as SendMessageNodeConfig,
    },
    {
      node_key: "consent_denied",
      node_type: "send_message",
      config: { text: "No problem. You will only receive transactional notifications for this specific order.", next_node_key: "end" } as SendMessageNodeConfig,
    },
    { node_key: "end", node_type: "end", config: {} },
  ],
};

// 6. Checkout Initiation & Payment Status Verification
const CHECKOUT_VERIFICATION: FlowTemplate = {
  slug: "checkout_verification",
  name: "Checkout & Payment Verify",
  description: "Dispatches payment link and checks server payment verification state before finalizing.",
  icon: "Package",
  trigger_type: "keyword",
  trigger_config: { keywords: ["pay", "checkout"], match_type: "contains" },
  entry_node_id: "start",
  nodes: [
    { node_key: "start", node_type: "start", config: { next_node_key: "payment_instructions" } },
    {
      node_key: "payment_instructions",
      node_type: "send_message",
      config: {
        text: "Please complete your payment via our secure payment gateway. Once paid, our verified server will confirm your order.",
        next_node_key: "check_payment",
      } as SendMessageNodeConfig,
    },
    {
      node_key: "check_payment",
      node_type: "send_buttons",
      config: {
        text: "Have you completed the payment on the gateway?",
        buttons: [
          { reply_id: "paid_btn", title: "I Have Paid", next_node_key: "await_verification" },
          { reply_id: "cancel_btn", title: "Cancel Order", next_node_key: "cancelled" },
        ],
      } as SendButtonsNodeConfig,
    },
    {
      node_key: "await_verification",
      node_type: "send_message",
      config: {
        text: "Verifying with payment gateway. You will receive an official confirmation message once verified.",
        next_node_key: "end",
      } as SendMessageNodeConfig,
    },
    {
      node_key: "cancelled",
      node_type: "send_message",
      config: { text: "Order payment cancelled. Feel free to re-order anytime.", next_node_key: "end" } as SendMessageNodeConfig,
    },
    { node_key: "end", node_type: "end", config: {} },
  ],
};

// 7. Order Confirmation
const ORDER_CONFIRMATION: FlowTemplate = {
  slug: "order_confirmation",
  name: "Order Confirmation",
  description: "Sends verified order details, references, and delivery schedule to customer.",
  icon: "CheckCircle",
  trigger_type: "keyword",
  trigger_config: { keywords: ["confirmed"], match_type: "exact" },
  entry_node_id: "start",
  nodes: [
    { node_key: "start", node_type: "start", config: { next_node_key: "confirm_msg" } },
    {
      node_key: "confirm_msg",
      node_type: "send_message",
      config: {
        text: "Order Confirmed! 🎉 Thank you for your verified purchase. Our team has received your order and is preparing fulfilment.",
        next_node_key: "end",
      } as SendMessageNodeConfig,
    },
    { node_key: "end", node_type: "end", config: {} },
  ],
};

// 8. Order Tracking & Fulfilment Updates
const ORDER_TRACKING: FlowTemplate = {
  slug: "order_tracking",
  name: "Order Tracking Updates",
  description: "Allows customers to check status of their pending or fulfilled orders.",
  icon: "Package",
  trigger_type: "keyword",
  trigger_config: { keywords: ["track", "status"], match_type: "contains" },
  entry_node_id: "start",
  nodes: [
    { node_key: "start", node_type: "start", config: { next_node_key: "ask_ref" } },
    {
      node_key: "ask_ref",
      node_type: "collect_input",
      config: { prompt_text: "Please reply with your Order Reference (e.g. ORD-20261016-XXXX):", var_key: "user_order_ref", next_node_key: "tracking_info" } as CollectInputNodeConfig,
    },
    {
      node_key: "tracking_info",
      node_type: "send_message",
      config: {
        text: "Checking status for order #{{vars.user_order_ref}}... Your order is currently being processed by our fulfilment team.",
        next_node_key: "end",
      } as SendMessageNodeConfig,
    },
    { node_key: "end", node_type: "end", config: {} },
  ],
};

// 9. Customer Support Escalation
const SUPPORT_ESCALATION: FlowTemplate = {
  slug: "support_escalation",
  name: "Support Escalation",
  description: "Seamlessly transfers conversation to an available agent with prior context.",
  icon: "HelpCircle",
  trigger_type: "keyword",
  trigger_config: { keywords: ["agent", "human", "help"], match_type: "exact" },
  entry_node_id: "start",
  nodes: [
    { node_key: "start", node_type: "start", config: { next_node_key: "escalation_intro" } },
    {
      node_key: "escalation_intro",
      node_type: "send_message",
      config: {
        text: "Connecting you with a support representative. Please hold on while an agent joins.",
        next_node_key: "handoff_node",
      } as SendMessageNodeConfig,
    },
    {
      node_key: "handoff_node",
      node_type: "handoff",
      config: { note: "Customer escalated to live human agent." } as HandoffNodeConfig,
    },
  ],
};

// 10. Post-Purchase Feedback
const POST_PURCHASE_FEEDBACK: FlowTemplate = {
  slug: "post_purchase_feedback",
  name: "Post-Purchase Feedback",
  description: "Captures customer satisfaction rating and qualitative feedback.",
  icon: "CheckCircle",
  trigger_type: "keyword",
  trigger_config: { keywords: ["feedback", "rate"], match_type: "exact" },
  entry_node_id: "start",
  nodes: [
    { node_key: "start", node_type: "start", config: { next_node_key: "ask_rating" } },
    {
      node_key: "ask_rating",
      node_type: "send_buttons",
      config: {
        text: "How was your recent purchase experience with DIGISOLVNET?",
        buttons: [
          { reply_id: "rate_great", title: "⭐⭐⭐⭐⭐ Great", next_node_key: "thank_feedback" },
          { reply_id: "rate_ok", title: "⭐⭐⭐ Neutral", next_node_key: "ask_improve" },
          { reply_id: "rate_bad", title: "⭐ Needs Work", next_node_key: "ask_improve" },
        ],
      } as SendButtonsNodeConfig,
    },
    {
      node_key: "thank_feedback",
      node_type: "send_message",
      config: { text: "Thank you for the 5-star rating! We look forward to serving you again soon.", next_node_key: "end" } as SendMessageNodeConfig,
    },
    {
      node_key: "ask_improve",
      node_type: "collect_input",
      config: { prompt_text: "We appreciate your honesty. What can we do to improve?", var_key: "feedback_text", next_node_key: "thank_improve" } as CollectInputNodeConfig,
    },
    {
      node_key: "thank_improve",
      node_type: "send_message",
      config: { text: "Thank you for sharing your thoughts. Our management team will review this.", next_node_key: "end" } as SendMessageNodeConfig,
    },
    { node_key: "end", node_type: "end", config: {} },
  ],
};

// 11. Repeat Purchase Campaign
const REPEAT_PURCHASE: FlowTemplate = {
  slug: "repeat_purchase",
  name: "Repeat Purchase Offer",
  description: "Engages existing buyers with special repeat-order discounts.",
  icon: "ShoppingBag",
  trigger_type: "keyword",
  trigger_config: { keywords: ["reorder", "repeat"], match_type: "exact" },
  entry_node_id: "start",
  nodes: [
    { node_key: "start", node_type: "start", config: { next_node_key: "offer_msg" } },
    {
      node_key: "offer_msg",
      node_type: "send_buttons",
      config: {
        text: "Welcome back! Enjoy 10% off your repeat order today with code REPEAT10.",
        buttons: [
          { reply_id: "reorder_yes", title: "Apply Discount", next_node_key: "apply_discount" },
          { reply_id: "reorder_no", title: "Not Now", next_node_key: "no_thanks" },
        ],
      } as SendButtonsNodeConfig,
    },
    {
      node_key: "apply_discount",
      node_type: "send_message",
      config: { text: "Coupon code REPEAT10 applied! View our catalogue to place your discounted order.", next_node_key: "end" } as SendMessageNodeConfig,
    },
    {
      node_key: "no_thanks",
      node_type: "send_message",
      config: { text: "No worries! Let us know whenever you are ready to shop.", next_node_key: "end" } as SendMessageNodeConfig,
    },
    { node_key: "end", node_type: "end", config: {} },
  ],
};

// 12. Subscription Renewal Notice (Platform SaaS accounts)
const SUBSCRIPTION_NOTICE: FlowTemplate = {
  slug: "subscription_notice",
  name: "Subscription Renewal Alert",
  description: "Sends expiry notifications and instant renewal links to CRM account owners.",
  icon: "Package",
  trigger_type: "keyword",
  trigger_config: { keywords: ["renew", "subscription"], match_type: "exact" },
  entry_node_id: "start",
  nodes: [
    { node_key: "start", node_type: "start", config: { next_node_key: "renew_msg" } },
    {
      node_key: "renew_msg",
      node_type: "send_buttons",
      config: {
        text: "Your DIGISOLVNET CRM subscription is due for renewal. Renew today to avoid interruption.",
        buttons: [
          { reply_id: "renew_now", title: "Renew Now", next_node_key: "renew_link" },
          { reply_id: "renew_later", title: "Remind Tomorrow", next_node_key: "remind_later" },
        ],
      } as SendButtonsNodeConfig,
    },
    {
      node_key: "renew_link",
      node_type: "send_message",
      config: { text: "Please visit https://example.com/pricing or check your dashboard billing tab to renew.", next_node_key: "end" } as SendMessageNodeConfig,
    },
    {
      node_key: "remind_later",
      node_type: "send_message",
      config: { text: "We have scheduled a reminder for tomorrow. Have a great day!", next_node_key: "end" } as SendMessageNodeConfig,
    },
    { node_key: "end", node_type: "end", config: {} },
  ],
};

// ============================================================
// Registry of All 12 Workflow Templates
// ============================================================

const TEMPLATES: Record<string, FlowTemplate> = {
  incoming_message: INCOMING_MESSAGE,
  welcome_menu: WELCOME_MENU,
  catalogue_browsing: CATALOGUE_BROWSING,
  order_builder: ORDER_BUILDER,
  consent_and_details: CONSENT_AND_DETAILS,
  checkout_verification: CHECKOUT_VERIFICATION,
  order_confirmation: ORDER_CONFIRMATION,
  order_tracking: ORDER_TRACKING,
  support_escalation: SUPPORT_ESCALATION,
  post_purchase_feedback: POST_PURCHASE_FEEDBACK,
  repeat_purchase: REPEAT_PURCHASE,
  subscription_notice: SUBSCRIPTION_NOTICE,
};

export function getFlowTemplate(slug: string): FlowTemplate | null {
  return TEMPLATES[slug] ?? null;
}

export function listFlowTemplates(): FlowTemplate[] {
  return Object.values(TEMPLATES);
}
