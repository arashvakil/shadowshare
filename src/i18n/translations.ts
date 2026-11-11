export type Language = "en" | "fa" | "pi";

type TranslationKeys = {
  // Onboarding
  language_prompt: string;
  language_switched: string;
  welcome: string;
  welcome_returning: string;

  // What is this
  what_is_this: string;

  // Referral flow
  need_invite: string;
  invalid_referral: string;
  referral_full: string;
  already_has_key: string;
  getkey_creating: string;
  getkey_success: string;
  getkey_error: string;

  // Referral link
  your_referral_link: string;
  referral_used_up: string;

  // Setup steps (bot photo captions — HTML)
  setup_step1_photo: string;
  setup_step2_photo: string;
  setup_all_set: string;

  // Device picker
  setup_pick_device: string;
  btn_device_iphone: string;
  btn_device_android: string;
  setup_step1_iphone: string;
  setup_step1_android: string;

  // Legacy text-only setup (kept for fallback)
  setup_step1: string;
  setup_step2: string;
  setup_done: string;

  // My key
  mykey_no_key: string;
  mykey_show: string;
  mykey_show_sub: string;
  mykey_revoked: string;

  // Help
  help: string;

  // Misc
  error_generic: string;
  rate_limited: string;
  btn_what_is_this: string;
  btn_download_android: string;
  btn_download_iphone: string;
  btn_installed: string;
  btn_show_my_key: string;
  btn_my_invite_link: string;
  btn_done: string;
  btn_help: string;
  btn_change_language: string;
  btn_next: string;
  btn_copy_key: string;
  btn_show_qr: string;
  btn_show_sub_qr: string;
  btn_show_sub_link: string;
  btn_add_to_streisand: string;
  btn_reset_keys: string;
  reset_confirm: string;
  reset_success: string;
  reset_no_key: string;
  qr_caption: string;
  qr_caption_sub: string;
  qr_or_scan: string;
  amnezia_file_caption: string;

  // Multi-protocol setup
  setup_step2_sub: string;
  setup_img_plus: string;
  setup_img_clipboard: string;
  connection_confirmed: string;
  connection_share_invite: string;

  // Manual referral code entry
  btn_enter_code: string;
  enter_code_prompt: string;
  enter_code_invalid: string;

  // Status
  status_no_key: string;
  status_message: string;

  // Admin
  admin_unauthorized: string;
  admin_no_users: string;
  admin_users_list: string;
  admin_revoke_usage: string;
  admin_revoke_not_found: string;
  admin_revoke_success: string;
  admin_revoke_error: string;
  admin_stats: string;
  admin_my_link: string;

  // AmneziaWG
  btn_show_awg_config: string;
  btn_download_amneziavpn: string;
  awg_config_message: string;

  // OpenVPN + Cloak
  btn_show_ovpn_config: string;
  ovpn_config_message: string;
  ovpn_unavailable_bot: string;

  // NaiveProxy
  btn_show_naive_config: string;
  naive_config_message: string;

  // ShadowTLS
  btn_show_shadowtls_config: string;
  shadowtls_config_message: string;

  // App picker (bot setup flow)
  setup_pick_app: string;
  btn_app_singbox: string;
  btn_app_hiddify: string;
  btn_app_amneziavpn: string;
  setup_download_singbox: string;
  setup_download_hiddify: string;
  setup_download_amneziavpn: string;
  setup_step2_amnezia: string;

  // Config file fallback (for blocked CDN)
  btn_get_config_file: string;
  config_file_caption: string;
  config_file_error: string;

  // Beta channel
  join_beta: string;
  btn_join_beta: string;

  // Feature disabled
  feature_disabled: string;
  registration_closed: string;

  // V2rayNG (bot)
  btn_v2ray_sub: string;
  v2ray_sub_message: string;

  // Worker VLESS URIs (bot + web)
  btn_worker_uris: string;
  worker_uris_title: string;
  worker_uris_desc: string;
  worker_uris_copy_hint: string;

  // Backup Tunnels (bot)
  btn_show_backup_tunnels: string;
  backup_tunnels_bot_title: string;

  // DNS Tunnel (bot)
  btn_show_dnstt: string;
  dnstt_bot_title: string;
  dnstt_bot_warning: string;
  dnstt_bot_android_title: string;
  dnstt_bot_android_desc: string;
  dnstt_bot_ios_title: string;
  dnstt_bot_ios_desc: string;
  dnstt_bot_ios_steps: string;

  // MasterDNS Tunnel (bot)
  btn_show_masterdns: string;
  masterdns_bot_warning: string;
  masterdns_bot_platform_picker: string;
  masterdns_bot_android_steps: string;
  masterdns_bot_desktop_steps: string;
  masterdns_bot_config_values: string;
  masterdns_bot_proxy_hint: string;

  // NPV Tunnel (bot)
  btn_show_npv: string;
  npv_warning: string;

  // Deep links (bot setup)
  btn_open_in_singbox: string;
  btn_open_in_hiddify: string;

  // Dashboard (bot)
  dashboard_title: string;
  btn_dashboard: string;
  bot_network_status: string;
  bot_other_options_note: string;
  btn_masterdns_recommended: string;

  // Invite sharing (bot)
  invite_share_message: string;

  // Slipstream guide (Hiddify)
  slipstream_bot_guide: string;

  // Backup Tunnels (web app)
  backup_tunnels_section_title: string;
  npv_card_title: string;
  npv_card_desc: string;
  npv_field_protocol: string;
  npv_field_ssh_host: string;
  npv_field_ssh_port: string;
  npv_field_udpgw_port: string;
  npv_field_username: string;
  npv_field_password: string;
  npv_udpgw_hint: string;
  npv_app_android: string;
  npv_app_ios: string;
  dnstt_card_title: string;
  dnstt_card_desc: string;
  dnstt_android_title: string;
  dnstt_android_desc: string;
  dnstt_android_btn: string;
  dnstt_ios_title: string;
  dnstt_ios_steps_web: string;
  dnstt_copied_hint: string;
  dnstt_backup_resolvers: string;
  dnstt_resolver_freshness: string;

  // MasterDNS Tunnel (web app)
  masterdns_card_title: string;
  masterdns_card_warning: string;
  masterdns_card_desc: string;
  masterdns_download_config: string;
  masterdns_android_title: string;
  masterdns_android_steps: string;
  masterdns_windows_title: string;
  masterdns_windows_steps: string;
  masterdns_desktop_title: string;
  masterdns_desktop_steps: string;
  masterdns_proxy_hint: string;
  masterdns_resolvers_hint: string;

  // MTProto Proxy (Telegram access)
  mtproto_section_title: string;
  mtproto_card_title: string;
  mtproto_card_desc: string;
  mtproto_copy_link: string;
  mtproto_copied_hint: string;
  mtproto_open_telegram: string;
  btn_show_mtproto: string;
  mtproto_bot_message: string;
  mtproto_qr_hint: string;
};

// ---------------------------------------------------------------------------
// English
// ---------------------------------------------------------------------------
const en: TranslationKeys = {
  language_prompt:
    "\u{1F44B} Hi! Welcome!\n" +
    "\u{1F30D} Free VPN \u{2014} private, unrestricted internet\n" +
    "\u{23F1} 2 min setup\n\n" +
    "\u{1F1EE}\u{1F1F7} Salam! VPN-e raayegaan \u{2014} internet-e azad va khosoosi\n\n" +
    "\u{1F1EE}\u{1F1F7} \u0633\u0644\u0627\u0645! VPN \u0631\u0627\u06CC\u06AF\u0627\u0646 \u{2014} \u0627\u06CC\u0646\u062A\u0631\u0646\u062A \u0622\u0632\u0627\u062F \u0648 \u062E\u0635\u0648\u0635\u06CC\n\n" +
    "Choose your language / \u0632\u0628\u0627\u0646\u062A \u0631\u0648 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646:",
  language_switched: "Language set to English \u{2705}",

  welcome:
    "Great! Here's how this works:\n\n" +
    "Someone you trust shared a link with you. " +
    "That link gives you a free VPN key. " +
    "Then you install a free VPN app " +
    "and add the key in. That's it \u{2014} you'll be connected!\n\n" +
    "If you arrived from an invite link, your key is being set up now...",

  welcome_returning:
    "Welcome back! \u{1F44B}\n\n" +
    "You already have a VPN key. Tap below to see it.",

  what_is_this:
    "This bot gives you a secure VPN connection.\n\n" +
    "A VPN lets you access the internet freely and privately. " +
    "It works like a secret tunnel \u{2014} nobody can see what " +
    "you're doing online.\n\n" +
    "To use it, you need an invite link from someone " +
    "you trust. Ask them to share their link with you!",

  need_invite:
    "You need an invite link to get started.\n\n" +
    "Ask a friend who already uses this to share their invite link with you. " +
    "It looks like:\nt.me/...?start=ref_...",

  invalid_referral:
    "That invite link isn't valid \u{274C}\n\n" +
    "Ask the person who shared it to check their link.",

  referral_full:
    "That person has used all their invites \u{1F61E}\n\n" +
    "Ask someone else who uses this to share their invite link.",

  already_has_key:
    "You already have a VPN key! \u{2705}\n\nTap below to see it.",

  getkey_creating:
    "\u{23F3} Setting up your VPN key... This takes a few seconds.",

  getkey_success:
    "Your VPN key is ready! \u{1F389}\n\n" +
    "Here's what we'll do next:\n" +
    "1\uFE0F\u20E3 Download a VPN app (we'll help you pick one)\n" +
    "2\uFE0F\u20E3 Come back here to get your key\n" +
    "3\uFE0F\u20E3 Add the key in the app and connect\n\n" +
    "It only takes 2 minutes. Let's start!",

  getkey_error:
    "Something went wrong \u{1F615}\n\n" +
    "Please try again in a few minutes.",

  your_referral_link:
    "Share the love! \u{1F496}\n\n" +
    "You have {remaining} invites left. " +
    "Share this link with friends who need VPN access:\n\n" +
    "`{link}`\n\n" +
    "When they tap the link, they'll get their own key automatically.",

  referral_used_up:
    "You've used all {max} of your invites.\n\n" +
    "Thanks for helping others get connected! \u{1F64F}",

  setup_step1_photo:
    "<b>Step 1 of 2: Get a VPN app \u{2B07}\uFE0F</b>\n\n" +
    "First, what device are you setting up?",

  setup_step2_photo:
    "<b>Step 2 of 2: Copy your key \u{1F511}</b>\n\n" +
    "Awesome, you've got the VPN app! \u{1F44F}\n\n" +
    "Your VPN key is in the next message. Tap and hold it to copy.",

  setup_all_set:
    "\u{1F389} You're all set!\n\n" +
    "Your VPN app runs in the background \u{2014} whenever you need the VPN, just open the app and tap Connect.\n\n" +
    "Need your key again? Send /mykey",

  join_beta: "Join our Telegram channel for updates, troubleshooting, and to share feedback:",
  btn_join_beta: "\u{1F4E2} Join Beta Channel",

  setup_pick_device:
    "<b>Step 1 of 2: Get a VPN app \u{2B07}\uFE0F</b>\n\n" +
    "First, what device are you setting up?",
  btn_device_iphone: "\u{1F34E} iPhone",
  btn_device_android: "\u{1F4F1} Android",
  setup_step1_iphone:
    "<b>Step 1 of 2: Download sing-box \u{2B07}\uFE0F</b>\n\n" +
    "We recommend <b>sing-box</b> \u{2014} free, open-source, and it covers VLESS, ShadowTLS, and Shadowsocks.\n\n" +
    "Tap below to download it from the App Store.\n\n" +
    "Once it's installed, come back here and tap \"\u{2705} I installed it, next!\"",
  setup_step1_android:
    "<b>Step 1 of 2: Download sing-box \u{2B07}\uFE0F</b>\n\n" +
    "We recommend <b>sing-box</b> \u{2014} free, open-source, and it covers VLESS, ShadowTLS, and Shadowsocks.\n\n" +
    "Tap below to download it from the Play Store.\n\n" +
    "Once it's installed, come back here and tap \"\u{2705} I installed it, next!\"",

  setup_step1:
    "Step 1 of 2: Get a VPN app \u{2B07}\uFE0F\n\n" +
    "You need a VPN app to connect. We recommend <b>sing-box</b> (free, open-source) \u2014 it covers VLESS, ShadowTLS, and Shadowsocks.\n\n" +
    "Tap below to download it for your device.\n\n" +
    "Once it's installed, come back here and tap \"\u{2705} I installed it, next!\"",

  setup_step2:
    "Step 2 of 2: Copy your key \u{1F511}\n\n" +
    "Awesome, you've got the VPN app! \u{1F44F}\n\n" +
    "Your VPN key is in the next message. Tap and hold it to copy.",

  setup_done:
    "\u{1F389} You're all set!\n\n" +
    "Your VPN app runs in the background \u{2014} whenever you need the VPN, just open the app and tap Connect.\n\n" +
    "Need your key again? Send /mykey",

  mykey_no_key:
    "You don't have a VPN key yet.\n\n" +
    "You need an invite link from a friend to get started.",

  mykey_show:
    "Here's your VPN key \u{1F511}\n\n" +
    "<code>{accessUrl}</code>\n\n" +
    "Tap and hold the key above to copy it, then paste it in your VPN app.",

  mykey_show_sub:
    "\u{1F517} <b>Subscription Link</b>\n\n" +
    "<code>{subUrl}</code>\n\n" +
    "Copy this link and add it in your VPN app \u{2192} + \u{2192} Add from clipboard.",

  mykey_revoked:
    "Your key has been deactivated.\n\n" +
    "Please contact the person who invited you for help.",

  help:
    "Need help? Here's a quick guide:\n\n" +
    "\u{1F4F1} <b>VPN Apps:</b>\n" +
    "\u{2022} <b>sing-box</b> (Recommended) \u{2014} 7 protocols, auto-picks fastest path\n" +
    "\u{2022} <b>Hiddify</b> \u{2014} same 7 protocols, easier interface\n" +
    "\u{2022} <b>AmneziaVPN</b> \u{2014} AmneziaWG 2.0 + OpenVPN+Cloak\n\n" +
    "\u{1F511} Get your key: /mykey\n" +
    "\u{1F496} Invite friends: /invite\n\n" +
    "\u{1F4CB} <b>How to connect:</b>\n" +
    "1. Open your VPN app\n" +
    "2. Tap + \u{2192} Add from clipboard\n" +
    "3. Tap Connect\n\n" +
    "\u{1F527} <b>Troubleshooting:</b>\n" +
    "\u{2022} <b>Select WS-Worker or HU-Worker</b> \u{2014} these are currently the only working connections. iPhone: tap proxy name at top. Android: tap the \u{1F4C1} folder icon next to \"Started\".\n" +
    "\u{2022} \"No response\"? Try switching between WS-Worker and HU-Worker\n" +
    "\u{2022} iOS \"failed to start core\"? Update your app to the latest version from the App Store\n" +
    "\u{2022} Try enabling Fragment in your app's settings \u{2014} it can help bypass network restrictions\n" +
    "\u{2022} Still stuck? Install <b>1.1.1.1 (WARP)</b> from your app store, turn it on, then connect your VPN on top \u{2014} this can bypass deep filtering\n" +
    "\u{2022} If pages don't load even when connected, change your DNS to <b>1.1.1.1</b> or enable DNS-over-HTTPS (DoH) in your VPN app settings\n\n" +
    "\u{1F310} Change language: /language",

  error_generic: "Something went wrong. Please try again.",
  rate_limited: "Please wait a moment before sending another message.",

  btn_what_is_this: "\u{2753} What is this?",
  btn_download_android: "\u{1F4F1} sing-box (Play Store)",
  btn_download_iphone: "\u{1F34E} sing-box (App Store)",
  btn_installed: "\u{2705} I installed it, next!",
  btn_show_my_key: "\u{1F511} Show my key",
  btn_my_invite_link: "\u{1F496} My invite link",
  btn_done: "\u{2705} Done!",
  btn_help: "\u{2753} Help",
  btn_change_language: "\u{1F310} Change language",
  btn_next: "Next \u{27A1}\uFE0F",
  btn_copy_key: "\u{1F4CB} Copy Key",
  btn_show_qr: "\u{1F4F2} Show QR Code",
  btn_show_sub_qr: "\u{1F4F2} Auto-Config QR",
  btn_show_sub_link: "\u{1F517} Auto-Config (recommended)",
  btn_add_to_streisand: "\u{1F680} Add to Streisand (1-tap)",
  btn_reset_keys: "\u{1F504} Reset my keys",
  reset_confirm: "Are you sure you want to reset your VPN keys? Your current keys will stop working and you'll get new ones. You'll need to re-import the new profile in your VPN app.",
  reset_success:
    "\u{2705} <b>Keys reset successfully!</b>\n\n" +
    "Your old keys have been deactivated and new ones have been created.\n" +
    "Please delete the old profile from your VPN app and add the new one below.",
  reset_no_key: "You don't have any active keys to reset.",
  qr_caption: "Scan this QR code with your phone camera to add the VPN key.",
  qr_caption_sub: "Scan this QR code in a compatible client to add the auto-config profile.",
  qr_or_scan: "Or scan this QR code:",
  amnezia_file_caption: "Config file — open in AmneziaVPN to import.",
  setup_step2_sub:
    "<b>Step 2 of 2: Add your VPN profile \u{1F517}</b>\n\n" +
    "Copy the subscription link below and add it in your VPN app.\n\n" +
    "Open your VPN app \u{2192} + \u{2192} Add from clipboard.\n\n" +
    "\u{26A0}\uFE0F <b>Important:</b> After importing, select <b>WS-Worker</b> or <b>HU-Worker</b> \u{2014} these are currently the only working connections.\n" +
    "\u{2022} iPhone: tap the proxy name at the top\n" +
    "\u{2022} Android: tap the \u{1F4C1} folder icon next to \"Started\"",
  setup_img_plus: "Tap your app's add-profile button",
  setup_img_clipboard: "Then import from clipboard or link",
  connection_confirmed:
    "\u{1F389} You're online! Your VPN is working perfectly.\n\n" +
    "Welcome to the free internet! \u{1F30D}",
  connection_share_invite:
    "You have {remaining} invites to share with friends and family!\n\n" +
    "Send them this link:\n`{link}`",

  btn_enter_code: "\u{1F4DD} I have a code",
  enter_code_prompt:
    "Type your invite code below.\n\n" +
    "It's the part after ref_ in the link. For example if the link is:\n" +
    "t.me/...?start=ref_<b>a1b2c3d4</b>\n\n" +
    "Just type: <b>a1b2c3d4</b>",
  enter_code_invalid:
    "That doesn't look like a valid invite code \u{274C}\n\n" +
    "The code should be 8 characters (letters and numbers). Try again, or ask your friend to resend the link.",

  status_no_key:
    "You don't have a VPN key yet.\n\n" +
    "You need an invite link from a friend to get started.",
  status_message:
    "\u{1F4CA} <b>VPN Status</b>\n\n" +
    "\u{1F464} ID: <code>{referralCode}</code>\n" +
    "\u{1F511} Key: {keyStatus}\n" +
    "\u{1F4E1} Server: {serverStatus}\n" +
    "\u{1F4C8} Bandwidth used: {bandwidth}\n" +
    "\u{1F4C5} Member since: {createdAt}\n" +
    "\u{1F496} Invites remaining: {invitesRemaining}",

  admin_unauthorized: "You are not authorized to use admin commands.",
  admin_no_users: "No registered users.",
  admin_users_list: "Registered users:\n\n{list}",
  admin_revoke_usage: "Usage: /admin_revoke <telegram_id>",
  admin_revoke_not_found: "User not found.",
  admin_revoke_success: "Revoked VPN key for user {telegramId}.",
  admin_revoke_error: "Failed to revoke key.",
  admin_stats:
    "Server Stats:\n\n" +
    "Total users: {totalUsers}\n" +
    "Active keys: {activeKeys}\n" +
    "Total data transferred: {totalTransfer}",
  admin_my_link:
    "Your admin invite link (unlimited invites):\n\n`{link}`",
  btn_show_awg_config: "\u{1F6E1}\uFE0F AmneziaWG 2.0 Config",
  btn_download_amneziavpn: "\u{2B07}\uFE0F Download AmneziaVPN",
  awg_config_message:
    "\u{1F6E1}\uFE0F <b>AmneziaWG 2.0</b>\n\n" +
    "Obfuscated WireGuard with DPI-resistant packet padding, dynamic headers, and junk packet injection. " +
    "It uses UDP \u{2014} may not work in countries that block UDP traffic.\n\n" +
    "To use it, install <b>AmneziaVPN</b> and import this config:",

  btn_show_ovpn_config: "\u{1F510} OpenVPN+Cloak Config",
  ovpn_config_message:
    "\u{1F510} <b>OpenVPN + Cloak</b>\n\n" +
    "This is an alternative VPN protocol that disguises OpenVPN traffic as regular HTTPS. " +
    "It uses TCP \u{2014} works even where UDP is blocked.\n\n" +
    "To use it, install <b>AmneziaVPN</b> and paste this link:",
  ovpn_unavailable_bot: "OpenVPN + Cloak is temporarily unavailable. We're working on fixing it. Please use your other VPN protocols in the meantime.",

  btn_show_naive_config: "\u{1F310} NaiveProxy Config",
  naive_config_message:
    "\u{1F310} <b>NaiveProxy</b>\n\n" +
    "NaiveProxy uses the real Chromium network stack \u{2014} indistinguishable from normal Chrome browsing. " +
    "Very resistant to DPI detection.\n\n" +
    "Copy this URI into <b>sing-box</b> or another client that supports naive:// links:",

  btn_show_shadowtls_config: "\u{1F9E5} ShadowTLS Config",
  shadowtls_config_message:
    "\u{1F9E5} <b>ShadowTLS v3 + Shadowsocks</b>\n\n" +
    "This is an extra stealth path for advanced clients. Import the JSON into <b>sing-box</b>, or use the Shadowsocks URI below in any compatible app.\n\n" +
    "sing-box JSON:",

  // App picker (bot setup flow)
  setup_pick_app:
    "<b>Step 1 of 3: Choose your VPN app</b>\n\n" +
    "Pick the app you'll use to connect. You can always come back and try a different one!",
  btn_app_singbox: "\u{1F4E6} sing-box \u{2014} Recommended",
  btn_app_hiddify: "\u{1F4E6} Hiddify \u{2014} Easy to use",
  btn_app_amneziavpn: "\u{1F4E6} AmneziaVPN \u{2014} AmneziaWG 2.0 + OpenVPN",
  setup_download_singbox:
    "<b>Step 2 of 3: Download sing-box</b>\n\n" +
    "Free, open-source, 7 protocols in one profile. The app auto-picks the fastest working path.\n\n" +
    "Tap to download, then come back and tap \u{2705}",
  setup_download_hiddify:
    "<b>Step 2 of 3: Download Hiddify</b>\n\n" +
    "Free, open-source, and easy to use. Same 7 protocols \u{2014} simpler interface.\n\n" +
    "Tap to download, then come back and tap \u{2705}",
  setup_download_amneziavpn:
    "<b>Step 2 of 3: Download AmneziaVPN</b>\n\n" +
    "Free and works on all devices. Supports AmneziaWG 2.0 (DPI-resistant WireGuard) and OpenVPN + Cloak.\n\n" +
    "Tap to download, then come back and tap \u{2705}",
  setup_step2_amnezia:
    "<b>Step 3 of 3: Add your VPN config</b>\n\n" +
    "Copy each config below and add it in AmneziaVPN:\nTap <b>+</b> \u{2192} <b>Insert key</b>",

  btn_get_config_file: "\u{1F4CE} Get config file",
  config_file_caption:
    "\u{1F4E5} <b>sing-box config file</b>\n\n" +
    "Open this file in Hiddify or sing-box to import your profile.\n\n" +
    "Hiddify: tap the file \u{2192} Open with Hiddify\n" +
    "sing-box: Profiles \u{2192} + \u{2192} Import from file",
  config_file_error: "Could not generate config file. Please try again later.",

  feature_disabled: "This feature is currently disabled.",
  registration_closed: "Registration is currently closed.",

  // V2rayNG
  btn_v2ray_sub: "\u{1F4E6} V2rayNG Subscription",
  v2ray_sub_message:
    "\u{1F4E6} <b>V2rayNG (Android only)</b>\n\n" +
    "Includes XHTTP transport \u{2014} one of the hardest protocols to detect.\n\n" +
    "Copy the subscription link and add it in V2rayNG \u{2192} + \u{2192} Import from clipboard.\n\n" +
    "Download V2rayNG: https://play.google.com/store/apps/details?id=com.v2ray.ang",

  // Worker VLESS URIs
  btn_worker_uris: "\u{1F310} Worker Configs (v2ray URI)",
  worker_uris_title: "\u{1F310} <b>Worker Configs (v2ray URI)</b>",
  worker_uris_desc:
    "Copy each URI below and paste into your app:\n" +
    "\u{2022} <b>sing-box</b>: Profiles \u{2192} + \u{2192} Import from clipboard\n" +
    "\u{2022} <b>Hiddify</b>: + \u{2192} Add from clipboard\n\n" +
    "\u{26A0}\uFE0F These are the <b>currently working</b> connections for Iran.",
  worker_uris_copy_hint: "URI copied!",

  // Backup Tunnels
  btn_show_backup_tunnels: "\u{1F6E1}\uFE0F Backup Tunnels",
  backup_tunnels_bot_title: "\u{1F6E1}\uFE0F <b>Backup Tunnels</b>\n\nFallback methods for when VPN protocols are blocked. Choose an option:",

  // MasterDNS Tunnel
  btn_show_masterdns: "\u{26A1} MasterDNS Tunnel",
  masterdns_bot_warning:
    "\u{26A1} <b>MasterDNS Tunnel</b>\n\n" +
    "~10x faster than regular DNS tunnel. Works when everything else is blocked.\n\n" +
    "Choose your platform:",
  masterdns_bot_platform_picker: "Choose your platform:",
  masterdns_bot_android_steps:
    "\u{1F4F1} <b>Android (Termux)</b>\n\n" +
    "1. Install <b>Termux</b> from F-Droid (not Play Store)\n" +
    "2. In Termux, run:\n" +
    "<code>curl -sL \"{downloadUrl}\" | tar -xz &amp;&amp; mv MasterDnsVPN_Client_* mdvpn &amp;&amp; chmod +x mdvpn</code>\n\n" +
    "3. Save the config below to a file named <code>config.toml</code> in Termux\n" +
    "4. Run:\n" +
    "<code>./mdvpn -config config.toml</code>\n\n" +
    "5. Set your phone's Wi-Fi proxy to <code>127.0.0.1:18000</code>\n\n" +
    "Download your config file from the web app for easier setup.",
  masterdns_bot_desktop_steps:
    "\u{1F4BB} <b>Windows / macOS / Linux</b>\n\n" +
    "1. Tap <b>Download Config</b> below to get the zip (contains config + resolvers)\n" +
    "2. Download the client for your OS:\nhttps://github.com/masterking32/MasterDnsVPN#client-download-links-\n\n" +
    "3. Install and open the app, then go to <b>Profiles</b>\n" +
    "4. Tap <b>+</b> → <b>Import TOML</b> → choose <code>client_config.toml</code>\n" +
    "5. Tap <b>Import resolvers</b> → choose <code>client_resolvers.txt</code>\n" +
    "6. Let it run its check — it verifies every resolver, will take a few minutes\n" +
    "7. Once connected, set system proxy to <code>127.0.0.1:18000</code> (SOCKS5)",
  masterdns_bot_config_values:
    "\u{1F4DD} <b>Config Values</b>\n\n" +
    "<b>Domain:</b> <code>{domain}</code>\n" +
    "<b>Encryption:</b> AES-256-GCM\n" +
    "<b>Key:</b> <code>{key}</code>\n" +
    "<b>Local Proxy:</b> <code>127.0.0.1:18000</code> (SOCKS5)",
  masterdns_bot_proxy_hint: "After running, set your device proxy to 127.0.0.1:18000 (SOCKS5).",

  // DNS Tunnel
  btn_show_dnstt: "\u{1F4E1} DNS Tunnel (last resort)",
  btn_show_npv: "\u{1F517} SSH Tunnel (faster)",
  npv_warning: "Direct SSH tunnel. Faster than DNS tunnel but may be blocked on some networks.",
  dnstt_bot_title:
    "\u{1F4E1} <b>DNS Tunnel</b>\n\n" +
    "\u{26A1} <b>Warning:</b> This is extremely slow (~1 Mbps). Only use when ALL other VPN protocols are blocked.\n\n" +
    "Choose your platform:",
  dnstt_bot_warning: "DNS Tunnel is only for emergencies when nothing else works.",
  dnstt_bot_android_title:
    "\u{1F4F1} <b>Android \u{2014} SlipNet</b>\n\n" +
    "1. Download SlipNet APK from GitHub\n" +
    "2. Tap the import button below \u{2014} it opens SlipNet with your config\n" +
    "3. Tap Connect in SlipNet",
  dnstt_bot_android_desc: "Tap below to import your DNS tunnel config into SlipNet:",
  dnstt_bot_ios_title:
    "\u{1F34E} <b>iOS \u{2014} HTTP Injector</b>\n\n" +
    "Download HTTP Injector from the App Store, then set up manually:",
  dnstt_bot_ios_desc: "Follow these steps in HTTP Injector:",
  dnstt_bot_ios_steps:
    "1. Configs tab \u{2192} + \u{2192} New config\n" +
    "2. Tunnel Type: DNS (DNSTT) \u{2192} SSH\n" +
    "3. DNS Resolver: <code>{dnsResolver}</code>\n" +
    "4. Nameserver: <code>{nameserver}</code>\n" +
    "5. Public Key: <code>{pubkey}</code>\n" +
    "6. SSH Host: <code>127.0.0.1</code>\n" +
    "7. SSH Port: <code>2222</code>\n" +
    "8. SSH Username: <code>{sshUser}</code>\n" +
    "9. SSH Password: <code>{sshPass}</code>\n" +
    "10. Save and Start",

  // Deep links
  btn_open_in_singbox: "\u{1F680} Open in sing-box",
  btn_open_in_hiddify: "\u{1F680} Open in Hiddify",

  // Dashboard
  dashboard_title:
    "\u{1F4CB} <b>Your VPN Dashboard</b>\n\n" +
    "Here are all your available connections. Tap any button to view config details.",
  btn_dashboard: "\u{1F4CB} Dashboard",
  bot_network_status:
    "\u{26A0}\u{FE0F} <b>Most VPN protocols are blocked right now.</b>\n\n" +
    "Standard VPN protocols are being actively blocked. <b>MasterDNS Tunnel</b> is the recommended option \u2014 it still works under current conditions.",
  bot_other_options_note:
    "\u{1F4A1} Other options below may not work reliably right now, but are still available:",
  btn_masterdns_recommended: "\u{1F7E2} MasterDNS Tunnel \u2014 WORKS NOW",

  // Invite sharing
  invite_share_message:
    "{shareText}\n{link}",

  // Slipstream guide (Hiddify)
  slipstream_bot_guide:
    "<b>💡 Slipstream (Find Faster IPs)</b>\n\n" +
    "If your connection is slow or unstable from Iran, use Hiddify's Slipstream to find the best CDN IPs:\n\n" +
    "1. In Hiddify, go to <b>Settings → Slipstream</b>\n" +
    "2. Set <b>Domain</b> to: <code>{domain}</code>\n" +
    "3. Set <b>DNS Resolver</b> to: <code>8.8.8.8:53</code>\n" +
    "4. Tap <b>Scan For Working Resolvers</b>\n" +
    "5. Select <b>Advanced → IR DNS Ranges</b>\n" +
    "6. Set count to <b>10000</b>, tap <b>Generate IPs</b>, then <b>Start Scan</b>\n" +
    "7. As working DNS resolvers appear, tap <b>Test Tunnel</b> to verify\n" +
    "8. Select the best results and tap <b>Apply</b> (top right)\n\n" +
    "You may need to repeat the scan.\n\n<b>Pre-scanned IR DNS Ranges (paste into Custom mode):</b>\n<code>194.53.0.0-194.53.255.255\n89.46.0.0-89.46.255.255\n2.177.0.0-2.177.255.255\n2.190.0.0-2.190.255.255\n151.235.0.0-151.235.255.255\n5.74.0.0-5.74.255.255\n2.178.0.0-2.178.255.255\n5.239.0.0-5.239.255.255\n5.238.0.0-5.238.255.255\n5.159.0.0-5.159.255.255\n2.191.0.0-2.191.255.255\n5.233.0.0-5.233.255.255\n2.176.0.0-2.176.255.255\n37.148.0.0-37.148.255.255\n2.180.0.0-2.180.255.255\n89.219.0.0-89.219.255.255\n46.100.0.0-46.100.255.255\n185.173.0.0-185.173.255.255\n2.179.0.0-2.179.255.255\n79.175.0.0-79.175.255.255\n93.118.0.0-93.118.255.255\n78.39.0.0-78.39.255.255\n5.236.0.0-5.236.255.255\n91.92.0.0-91.92.255.255\n94.182.0.0-94.182.255.255\n80.210.0.0-80.210.255.255\n78.38.0.0-78.38.255.255\n2.184.0.0-2.184.255.255\n5.234.0.0-5.234.255.255\n94.183.0.0-94.183.255.255</code>",

  // Backup Tunnels (web)
  backup_tunnels_section_title: "Backup Tunnels",
  npv_card_title: "SSH Tunnel (faster)",
  npv_card_desc: "Direct SSH tunnel. Faster than DNS tunnel but may be blocked on some networks.",
  npv_field_protocol: "Protocol",
  npv_field_ssh_host: "SSH Host",
  npv_field_ssh_port: "SSH Port",
  npv_field_udpgw_port: "Udpgw Port",
  npv_field_username: "Username",
  npv_field_password: "Password",
  npv_udpgw_hint: "Enable UDPGW transparent DNS in your app.",
  npv_app_android: "NapsternetV (Android)",
  npv_app_ios: "NpvTunnel (iPhone)",
  dnstt_card_title: "DNS Tunnel (last resort)",
  dnstt_card_desc: "Extremely slow (~1 Mbps) but works when everything else is blocked. Only for emergencies.",
  dnstt_android_title: "Android — SlipNet",
  dnstt_android_desc: "Tap below to import your DNS tunnel config into SlipNet:",
  dnstt_android_btn: "Open in SlipNet",
  dnstt_ios_title: "iOS — HTTP Injector",
  dnstt_ios_steps_web: "Download HTTP Injector from the App Store, then configure manually:",
  dnstt_copied_hint: "Copied!",
  dnstt_backup_resolvers: "If DNS Resolver doesn't connect, try these backups: {resolvers}",
  dnstt_resolver_freshness: "Resolver IPs are sampled from a pool of pre-verified Iranian ISP servers and rotated every 6 hours. Last updated: {updatedAt}.",

  // MasterDNS Tunnel (web)
  masterdns_card_title: "MasterDNS Tunnel",
  masterdns_card_warning: "EXTREMELY ADVANCED — requires terminal/command line",
  masterdns_card_desc: "~10x faster than regular DNS tunnel. Requires downloading and running a program on your device.",
  masterdns_download_config: "Download Config File",
  masterdns_android_title: "Android (Termux)",
  masterdns_android_steps: "1. Install Termux from F-Droid (not Play Store)\n2. Download and extract the client binary\n3. Save the config file to Termux\n4. Run the client\n5. Set your phone's Wi-Fi proxy to 127.0.0.1:18000",
  masterdns_windows_title: "Windows",
  masterdns_windows_steps: "1. Download the client .zip for Windows\n2. Extract and save the config file to the same folder\n3. Open cmd, run the client\n4. Set system proxy to 127.0.0.1:18000 (SOCKS5)",
  masterdns_desktop_title: "macOS / Linux",
  masterdns_desktop_steps: "1. Download the client for your platform\n2. Save the config file to the same folder\n3. Run in terminal\n4. Set system proxy to 127.0.0.1:18000 (SOCKS5)",
  masterdns_proxy_hint: "After running, set your device proxy to 127.0.0.1:18000 (SOCKS5).",
  masterdns_resolvers_hint: "DNS Resolvers (try if default doesn't connect):",

  // MTProto Proxy
  mtproto_section_title: "Telegram Proxy",
  mtproto_card_title: "MTProto Proxy",
  mtproto_card_desc: "Can't access Telegram? Use this proxy to connect to Telegram without a VPN.",
  mtproto_copy_link: "Copy Proxy Link",
  mtproto_copied_hint: "Proxy link copied! Paste it in your browser or share it.",
  mtproto_open_telegram: "Open in Telegram",
  btn_show_mtproto: "\u{1F4E1} Telegram Proxy",
  mtproto_bot_message: "<b>\u{1F4E1} Telegram Proxy (MTProto)</b>\n\nUse this proxy to access Telegram when it's blocked.\n\nTap the button below to add it to Telegram, or copy the link and share it with others.",
  mtproto_qr_hint: "Scan this QR code to add the proxy to Telegram.",
};

// ---------------------------------------------------------------------------
// Finglish (Farsi in Latin script)
// ---------------------------------------------------------------------------
const pi: TranslationKeys = {
  language_prompt:
    "\u{1F44B} Hi! Welcome!\n" +
    "\u{1F30D} Free VPN \u{2014} private, unrestricted internet\n" +
    "\u{23F1} 2 min setup\n\n" +
    "\u{1F1EE}\u{1F1F7} Salam! VPN-e raayegaan \u{2014} internet-e azad va khosoosi\n\n" +
    "\u{1F1EE}\u{1F1F7} \u0633\u0644\u0627\u0645! VPN \u0631\u0627\u06CC\u06AF\u0627\u0646 \u{2014} \u0627\u06CC\u0646\u062A\u0631\u0646\u062A \u0622\u0632\u0627\u062F \u0648 \u062E\u0635\u0648\u0635\u06CC\n\n" +
    "Choose your language / \u0632\u0628\u0627\u0646\u062A \u0631\u0648 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646:",
  language_switched: "Zaban be Finglish taghir kard \u{2705}",

  welcome:
    "Khoobe! Inja injuri kar mikone:\n\n" +
    "Yeki ke behesh etemad dari, ye link bahat share karde. " +
    "Oon link behet ye kelid-e VPN-e raayegaan mide. " +
    "Baad ye app-e VPN-e raayegaan nasb mikoni " +
    "va kelidet ro toosh ezafe mikoni. Hamin! Vasl mishi!\n\n" +
    "Agar az ye invite link oomadi, kelidet dare sakhte mishe...",

  welcome_returning:
    "Khosh bargashti! \u{1F44B}\n\n" +
    "To alan ye kelid-e VPN dari. Paeen ro bezan ta bebinitesh.",

  what_is_this:
    "In bot behet ye VPN-e amn mide.\n\n" +
    "VPN behet ejaze mide azadane va khosoosi az internet " +
    "estefade koni. Mesl ye tonel-e makhfi kaar mikone \u{2014} " +
    "hichkas nemitune bebine online dari chi kaar mikoni.\n\n" +
    "Baraye estefade, be ye invite link niaaz dari " +
    "ke yeki ke behesh etemad dari bahat share kone!",

  need_invite:
    "Baraye shoru be ye invite link niaaz dari.\n\n" +
    "Az ye doost ke alan estefade mikone bekhah linke davatesh ro " +
    "bahat share kone. Link ye chizi mesl ine:\nt.me/...?start=ref_...",

  invalid_referral:
    "In invite link mo'tabar nist \u{274C}\n\n" +
    "Az kasi ke share karde bekhah linkesh ro check kone.",

  referral_full:
    "Oon nafare hame davat-haash ro estefade karde \u{1F61E}\n\n" +
    "Az ye nafar-e dige ke estefade mikone bekhah linkesh ro share kone.",

  already_has_key:
    "To alan ye kelid-e VPN dari! \u{2705}\n\nPaeen ro bezan ta bebinitesh.",

  getkey_creating:
    "\u{23F3} Kelid-e VPN-et dare sakhte mishe... Chand sanie sabr kon.",

  getkey_success:
    "Kelidet amade-ast! \u{1F389}\n\n" +
    "Ino bayad anjam bedi:\n" +
    "1\uFE0F\u20E3 Ye app-e VPN download kon (komakat mikonim entekhab koni)\n" +
    "2\uFE0F\u20E3 Bargard inja ta kelidet ro begiri\n" +
    "3\uFE0F\u20E3 Kelid ro too app ezafe kon va vasl sho\n\n" +
    "Faghat 2 daghighe tool mikeshe. Shoru konim!",

  getkey_error:
    "Ye moshkeli pish oomad \u{1F615}\n\n" +
    "Lotfan chand daghighe-ye dige dobare try kon.",

  your_referral_link:
    "Ba doostaat share kon! \u{1F496}\n\n" +
    "{remaining} ta davat dari. " +
    "In link ro ba doostaat ke VPN lazem daran share kon:\n\n" +
    "`{link}`\n\n" +
    "Vaghti link ro bezanan, automatic kelid migiran.",

  referral_used_up:
    "Hame {max} ta davataat ro estefade kardi.\n\n" +
    "Mersi ke be baghie komak kardi vasl beshan! \u{1F64F}",

  setup_step1_photo:
    "<b>Marhale 1 az 2: Ye app-e VPN begir \u{2B07}\uFE0F</b>\n\n" +
    "Aval, gooshit chie?",

  setup_step2_photo:
    "<b>Marhale 2 az 2: Kelidet ro copy kon \u{1F511}</b>\n\n" +
    "Aali, app-e VPN ro dari! \u{1F44F}\n\n" +
    "Kelid-e VPN-et too payam-e baadi-e. Roosh negah dar ta copy beshe.",

  setup_all_set:
    "\u{1F389} Tamoom shod!\n\n" +
    "App-e VPN dar pas-zamine ejra mishe \u{2014} har vaght VPN lazem dashti, app ro baz kon va Connect ro bezan.\n\n" +
    "Kelidet ro dobare lazem dari? /mykey ro befrest.",

  join_beta: "Join channel-e Telegram-emoon baraye update-ha, raf-e moshkel, va feedback:",
  btn_join_beta: "\u{1F4E2} Join Channel-e Beta",

  setup_pick_device:
    "<b>Marhale 1 az 2: Ye app-e VPN begir \u{2B07}\uFE0F</b>\n\n" +
    "Aval, gooshit chie?",
  btn_device_iphone: "\u{1F34E} iPhone",
  btn_device_android: "\u{1F4F1} Android",
  setup_step1_iphone:
    "<b>Marhale 1 az 2: sing-box ro download kon \u{2B07}\uFE0F</b>\n\n" +
    "<b>sing-box</b> ro pishnehad mikonim \u{2014} raayegaan, open-source, va 7 ta protocol too ye profile.\n\n" +
    "Paeen ro bezan ta az App Store download koni.\n\n" +
    "Vaghti nasb shod, bargard inja va \"\u{2705} Nasb kardam, baadi!\" ro bezan.",
  setup_step1_android:
    "<b>Marhale 1 az 2: sing-box ro download kon \u{2B07}\uFE0F</b>\n\n" +
    "<b>sing-box</b> ro pishnehad mikonim \u{2014} raayegaan, open-source, va 7 ta protocol too ye profile.\n\n" +
    "Paeen ro bezan ta az Play Store download koni.\n\n" +
    "Vaghti nasb shod, bargard inja va \"\u{2705} Nasb kardam, baadi!\" ro bezan.",

  setup_step1:
    "Marhale 1 az 2: Ye app-e VPN begir \u{2B07}\uFE0F\n\n" +
    "Baraye vasl shodan be ye app-e VPN niaaz dari. <b>sing-box</b> ro pishnehad mikonim (raayegaan, open-source) \u{2014} 7 ta protocol too ye profile.\n\n" +
    "Paeen gooshit ro bezan ta download koni.\n\n" +
    "Vaghti nasb shod, bargard inja va \"\u{2705} Nasb kardam, baadi!\" ro bezan.",

  setup_step2:
    "Marhale 2 az 2: Kelidet ro copy kon \u{1F511}\n\n" +
    "Aali, app-e VPN ro dari! \u{1F44F}\n\n" +
    "Kelid-e VPN-et too payam-e baadi-e. Roosh negah dar ta copy beshe.",

  setup_done:
    "\u{1F389} Tamoom shod!\n\n" +
    "App-e VPN dar pas-zamine ejra mishe \u{2014} har vaght VPN lazem dashti, app ro baz kon va Connect ro bezan.\n\n" +
    "Kelidet ro dobare lazem dari? /mykey ro befrest.",

  mykey_no_key:
    "Hanooz kelid-e VPN nadari.\n\n" +
    "Be ye invite link az ye doost niaaz dari.",

  mykey_show:
    "Kelid-e VPN-et ine \u{1F511}\n\n" +
    "<code>{accessUrl}</code>\n\n" +
    "Rooye kelid negah dar ta copy beshe, baad too app-e VPN paste kon.",

  mykey_show_sub:
    "\u{1F517} <b>Link-e Subscription</b>\n\n" +
    "<code>{subUrl}</code>\n\n" +
    "In link ro copy kon va too app-e VPN \u{2192} + \u{2192} Add from clipboard bezan.",

  mykey_revoked:
    "Kelidet gheyr-fa'aal shode.\n\nLotfan ba kasi ke davatet karde sohbat kon.",

  help:
    "Komak lazem dari? Ino bekhan:\n\n" +
    "\u{1F4F1} <b>App-haye VPN:</b>\n" +
    "\u{2022} <b>sing-box</b> (Pishnehadi) \u{2014} 7 ta protocol, khodesh saree-tarin masir ro entekhab mikone\n" +
    "\u{2022} <b>Hiddify</b> \u{2014} hamon 7 ta protocol, rabete sadeh-tar\n" +
    "\u{2022} <b>AmneziaVPN</b> \u{2014} AmneziaWG 2.0 + OpenVPN+Cloak\n\n" +
    "\u{1F511} Kelidet ro bebin: /mykey\n" +
    "\u{1F496} Davat-e doostaan: /invite\n\n" +
    "\u{1F4CB} <b>Chejuri vasl beshi:</b>\n" +
    "1. App-e VPN ro baz kon\n" +
    "2. + ro bezan \u{2192} Add from clipboard\n" +
    "3. Connect ro bezan\n\n" +
    "\u{1F527} <b>Agar moshkel dari:</b>\n" +
    "\u{2022} <b>WS-Worker ya HU-Worker ro entekhab kon</b> \u{2014} alan faghat inha kaar mikonan. iPhone: bala esm-e proxy ro bezan. Android: icon-e \u{1F4C1} folder ro kenar-e \"Started\" bezan.\n" +
    "\u{2022} \"No response\" dari? Beyn-e WS-Worker va HU-Worker switch kon\n" +
    "\u{2022} iOS \"failed to start core\" dari? App ro az App Store update kon be version-e aakhar\n" +
    "\u{2022} Fragment ro too tanzimaat-e app faal kon \u{2014} mitune komak kone\n" +
    "\u{2022} Hanooz moshkel dari? App-e <b>1.1.1.1 (WARP)</b> ro az app store nasb kon, roshanesh kon, baad VPN ro vasl kon \u{2014} in mitune filter-e sangin ro dor bezane\n" +
    "\u{2022} Agar safahaat baz nemishe vaghti vasl hasti, DNS ro be <b>1.1.1.1</b> avaz kon ya DNS-over-HTTPS (DoH) ro too tanzimaat-e app faal kon\n\n" +
    "\u{1F310} Taghir-e zaban: /language",

  error_generic: "Ye moshkeli pish oomad. Lotfan dobare try kon.",
  rate_limited: "Lotfan chand lahze sabr kon.",

  btn_what_is_this: "\u{2753} In chie?",
  btn_download_android: "\u{1F4F1} sing-box (Play Store)",
  btn_download_iphone: "\u{1F34E} sing-box (App Store)",
  btn_installed: "\u{2705} Nasb kardam, baadi!",
  btn_show_my_key: "\u{1F511} Kelidam ro bebin",
  btn_my_invite_link: "\u{1F496} Link-e davat-e man",
  btn_done: "\u{2705} Tamoom!",
  btn_help: "\u{2753} Komak",
  btn_change_language: "\u{1F310} Taghir zaban",
  btn_next: "Baadi \u{27A1}\uFE0F",
  btn_copy_key: "\u{1F4CB} Copy Kelid",
  btn_show_qr: "\u{1F4F2} QR Code ro bebin",
  btn_show_sub_qr: "\u{1F4F2} QR Auto-Config",
  btn_show_sub_link: "\u{1F517} Auto-Config (pishnehadi)",
  btn_add_to_streisand: "\u{1F680} Ezafe be Streisand (1 tap)",
  btn_reset_keys: "\u{1F504} Reset kelid-ham",
  reset_confirm: "Motma'eni mikhay kelid-hat ro reset koni? Kelid-haye fa'li ghat' mishan va ye kelid-e jadid migiri. Bayad profile-e jadid ro dobare too app-e VPN import koni.",
  reset_success:
    "\u{2705} <b>Kelid-ha ba movafaghiyat reset shod!</b>\n\n" +
    "Kelid-haye ghabli gheyrefaal shodan va kelid-haye jadid sakhte shod.\n" +
    "Lotfan profile-e ghabli ro az app-e VPN pak kon va ye jadid ezafe kon.",
  reset_no_key: "Hich kelid-e faali nadari ke reset koni.",
  qr_caption: "In QR code ro ba dorbin-e gooshit scan kon ta kelid-e VPN ezafe beshe.",
  qr_caption_sub: "In QR code ro too ye app-e sazgar scan kon ta profile-e auto-config ezafe beshe.",
  qr_or_scan: "Ya in QR code ro scan kon:",
  amnezia_file_caption: "File-e config — too AmneziaVPN baazesh kon ta import beshe.",
  setup_step2_sub:
    "<b>Marhale 2 az 2: Profile-e VPN ro ezafe kon \u{1F517}</b>\n\n" +
    "Link-e subscription ro copy kon va too app-e VPN ezafe kon.\n\n" +
    "App-e VPN ro baz kon \u{2192} + \u{2192} Add from clipboard.\n\n" +
    "\u{26A0}\uFE0F <b>Mohem:</b> Baad az import, <b>WS-Worker</b> ya <b>HU-Worker</b> ro entekhab kon \u{2014} alan faghat inha kaar mikonan.\n" +
    "\u{2022} iPhone: bala esm-e proxy ro bezan\n" +
    "\u{2022} Android: icon-e \u{1F4C1} folder ro kenar-e \"Started\" bezan",
  setup_img_plus: "Too app dokme-ye ezafe kardane profile ro bezan",
  setup_img_clipboard: "Baad import az clipboard ya link ro bezan",
  connection_confirmed:
    "\u{1F389} Online shodi! VPN-et daare dorost kaar mikone.\n\n" +
    "Be internet-e azad khosh oomadi! \u{1F30D}",
  connection_share_invite:
    "{remaining} ta davat dari ke ba doostaat va khaanevaadet share koni!\n\n" +
    "In link ro befresti barashoon:\n`{link}`",

  btn_enter_code: "\u{1F4DD} Code daram",
  enter_code_prompt:
    "Code-e davateto paeen type kon.\n\n" +
    "Oon ghesmate baad az ref_ too linke. Masalan agar link ine:\n" +
    "t.me/...?start=ref_<b>a1b2c3d4</b>\n\n" +
    "Faghat type kon: <b>a1b2c3d4</b>",
  enter_code_invalid:
    "In mesl-e ye code-e davat nist \u{274C}\n\n" +
    "Code bayad 8 ta harf va adad bashe. Dobare try kon, ya az doostet bekhah link ro dobare befresste.",

  status_no_key:
    "Hanooz kelid-e VPN nadari.\n\n" +
    "Be ye invite link az ye doost niaaz dari.",
  status_message:
    "\u{1F4CA} <b>Vaziyat-e VPN</b>\n\n" +
    "\u{1F511} Kelid: {keyStatus}\n" +
    "\u{1F4E1} Server: {serverStatus}\n" +
    "\u{1F4C8} Masraf-e data: {bandwidth}\n" +
    "\u{1F4C5} Ozv az: {createdAt}\n" +
    "\u{1F496} Davat-haye baaghi-moonde: {invitesRemaining}",

  admin_unauthorized: "You are not authorized to use admin commands.",
  admin_no_users: "No registered users.",
  admin_users_list: "Registered users:\n\n{list}",
  admin_revoke_usage: "Usage: /admin_revoke <telegram_id>",
  admin_revoke_not_found: "User not found.",
  admin_revoke_success: "Revoked VPN key for user {telegramId}.",
  admin_revoke_error: "Failed to revoke key.",
  admin_stats:
    "Server Stats:\n\n" +
    "Total users: {totalUsers}\n" +
    "Active keys: {activeKeys}\n" +
    "Total data transferred: {totalTransfer}",
  admin_my_link:
    "Your admin invite link (unlimited invites):\n\n`{link}`",
  btn_show_awg_config: "\u{1F6E1}\uFE0F Config-e AmneziaWG 2.0",
  btn_download_amneziavpn: "\u{2B07}\uFE0F Download AmneziaVPN",
  awg_config_message:
    "\u{1F6E1}\uFE0F <b>AmneziaWG 2.0</b>\n\n" +
    "WireGuard-e obfuscate-shode ba packet padding-e zed-e DPI, header-haye dynamic, va tazrigh-e packet-haye junk. " +
    "Az UDP estefade mikone \u{2014} momkene too keshvar-hayi ke UDP block mishan kaar nakone.\n\n" +
    "Baraye estefade, <b>AmneziaVPN</b> ro nasb kon va in config ro import kon:",

  btn_show_ovpn_config: "\u{1F510} Config-e OpenVPN+Cloak",
  ovpn_config_message:
    "\u{1F510} <b>OpenVPN + Cloak</b>\n\n" +
    "In ye protocol-e VPN-e jaayegozin-e ke traffic-e OpenVPN ro mesl-e HTTPS-e mamooli jelveh mide. " +
    "Az TCP estefade mikone \u{2014} hatta jaayi ke UDP block-e kaar mikone.\n\n" +
    "Baraye estefade, <b>AmneziaVPN</b> ro nasb kon va in link ro paste kon:",
  ovpn_unavailable_bot: "OpenVPN + Cloak fa'lan dar dastras nist. Darim rooye fix-esh kaar mikonim. Lotfan az protocol-haye dige-at estefade kon.",

  btn_show_naive_config: "\u{1F310} Config-e NaiveProxy",
  naive_config_message:
    "\u{1F310} <b>NaiveProxy</b>\n\n" +
    "NaiveProxy az network stack-e vaaghe'i-e Chromium estefade mikone \u{2014} ghabel-e tashkhis az browsing-e mamooli-e Chrome nist. " +
    "Kheyli moghavem dar moghabel-e DPI.\n\n" +
    "In URI ro copy kon va too <b>sing-box</b> ya har app-i ke az naive:// poshtibani mikone ezafe kon:",

  btn_show_shadowtls_config: "\u{1F9E5} Config-e ShadowTLS",
  shadowtls_config_message:
    "\u{1F9E5} <b>ShadowTLS v3 + Shadowsocks</b>\n\n" +
    "In ye masir-e makhfi-e ezafi baraye client-haye pishrafte ast. JSON ro too <b>sing-box</b> import kon, ya URI-e Shadowsocks-e paeen ro too har app-e sazgar estefade kon.\n\n" +
    "JSON-e sing-box:",

  // App picker (bot setup flow)
  setup_pick_app:
    "<b>Marhale 1 az 3: App-e VPN-et ro entekhab kon</b>\n\n" +
    "Ye app entekhab kon baraye vasl shodan. Mituni baadan ye app-e dige ham emtehaan koni!",
  btn_app_singbox: "\u{1F4E6} sing-box \u{2014} Pishnehadi",
  btn_app_hiddify: "\u{1F4E6} Hiddify \u{2014} Rahat va aasaan",
  btn_app_amneziavpn: "\u{1F4E6} AmneziaVPN \u{2014} AmneziaWG 2.0 + OpenVPN",
  setup_download_singbox:
    "<b>Marhale 2 az 3: sing-box ro download kon</b>\n\n" +
    "Raayegaan, open-source, 7 ta protocol too ye profile. App khodesh saree-tarin masir ro entekhab mikone.\n\n" +
    "Bezan ta download koni, baad bargard va \u{2705} ro bezan",
  setup_download_hiddify:
    "<b>Marhale 2 az 3: Hiddify ro download kon</b>\n\n" +
    "Raayegaan, open-source va rahat. Hamon 7 ta protocol \u{2014} rabete sadeh-tar.\n\n" +
    "Bezan ta download koni, baad bargard va \u{2705} ro bezan",
  setup_download_amneziavpn:
    "<b>Marhale 2 az 3: AmneziaVPN ro download kon</b>\n\n" +
    "Raayegaan va roo hame dastgaaha kaar mikone. AmneziaWG 2.0 (WireGuard-e zed-e DPI) va OpenVPN + Cloak ro dare.\n\n" +
    "Bezan ta download koni, baad bargard va \u{2705} ro bezan",
  setup_step2_amnezia:
    "<b>Marhale 3 az 3: Config-e VPN ro ezafe kon</b>\n\n" +
    "Har config ro copy kon va too AmneziaVPN ezafe kon:\n<b>+</b> ro bezan \u{2192} <b>Insert key</b>",

  btn_get_config_file: "\u{1F4CE} Gereftane file-e config",
  config_file_caption:
    "\u{1F4E5} <b>File-e config-e sing-box</b>\n\n" +
    "In file ro too Hiddify ya sing-box baaz kon ta profile-et import beshe.\n\n" +
    "Hiddify: file ro bezan \u{2192} Open with Hiddify\n" +
    "sing-box: Profiles \u{2192} + \u{2192} Import from file",
  config_file_error: "Sakhte file-e config moshkel dare. Lotfan baadan emtehaan kon.",

  feature_disabled: "In ghabeliyat faalan gheyrefaal ast.",
  registration_closed: "Sabt-e naam faalan baste ast.",

  // V2rayNG
  btn_v2ray_sub: "\u{1F4E6} Subscription V2rayNG",
  v2ray_sub_message:
    "\u{1F4E6} <b>V2rayNG (faghat Android)</b>\n\n" +
    "XHTTP dare \u{2014} yeki az sakhttarin protocol-ha baraye shenasayi.\n\n" +
    "Link-e subscription ro copy kon va too V2rayNG \u{2192} + \u{2192} Import from clipboard bezan.\n\n" +
    "Download V2rayNG: https://play.google.com/store/apps/details?id=com.v2ray.ang",

  // Worker VLESS URIs
  btn_worker_uris: "\u{1F310} Config-haye Worker (v2ray URI)",
  worker_uris_title: "\u{1F310} <b>Config-haye Worker (v2ray URI)</b>",
  worker_uris_desc:
    "Har URI ro copy kon va too app-et paste kon:\n" +
    "\u{2022} <b>sing-box</b>: Profiles \u{2192} + \u{2192} Import from clipboard\n" +
    "\u{2022} <b>Hiddify</b>: + \u{2192} Add from clipboard\n\n" +
    "\u{26A0}\uFE0F Ina <b>tanha config-haye faaal</b> baraye Iran hastan.",
  worker_uris_copy_hint: "URI copy shod!",

  // Backup Tunnels
  btn_show_backup_tunnels: "\u{1F6E1}\uFE0F Tonel-haye Poshtibaani",
  backup_tunnels_bot_title: "\u{1F6E1}\uFE0F <b>Tonel-haye Poshtibaani</b>\n\nRaah-haye jaaygozin baraye vaghti ke protocol-haye VPN block hastan. Entekhab kon:",

  // MasterDNS Tunnel
  btn_show_masterdns: "\u{26A1} MasterDNS Tunnel",
  masterdns_bot_warning:
    "\u{26A1} <b>MasterDNS Tunnel</b>\n\n" +
    "~10 barabar sari'tar az DNS tunnel-e mamooli. Vaghti hame chiz block bashe kaar mikone.\n\n" +
    "Platform-et ro entekhab kon:",
  masterdns_bot_platform_picker: "Platform-et ro entekhab kon:",
  masterdns_bot_android_steps:
    "\u{1F4F1} <b>Android (Termux)</b>\n\n" +
    "1. <b>Termux</b> ro az F-Droid nasb kon (na Play Store)\n" +
    "2. Too Termux ejra kon:\n" +
    "<code>curl -sL \"{downloadUrl}\" | tar -xz &amp;&amp; mv MasterDnsVPN_Client_* mdvpn &amp;&amp; chmod +x mdvpn</code>\n\n" +
    "3. Config paeen ro too file-e <code>config.toml</code> save kon\n" +
    "4. Ejra kon:\n" +
    "<code>./mdvpn -config config.toml</code>\n\n" +
    "5. Proxy-e Wi-Fi gooshi ro bezar <code>127.0.0.1:18000</code>\n\n" +
    "Baraye raahati bishtar, config file ro az web app download kon.",
  masterdns_bot_desktop_steps:
    "\u{1F4BB} <b>Windows / macOS / Linux</b>\n\n" +
    "1. Rooye <b>Download Config</b> paeen bezan ta zip (config + resolvers) ro begiri\n" +
    "2. Client ro baraye OS-et download kon az:\nhttps://github.com/masterking32/MasterDnsVPN#client-download-links-\n\n" +
    "3. Nasb kon va baaz kon, bero be <b>Profiles</b>\n" +
    "4. Bezan <b>+</b> → <b>Import TOML</b> → <code>client_config.toml</code> ro entekhab kon\n" +
    "5. Bezan <b>Import resolvers</b> → <code>client_resolvers.txt</code> ro entekhab kon\n" +
    "6. Bezar check-esh ro anjam bede — hame resolver-ha ro check mikone, chand daghighe tool mikeshe\n" +
    "7. Vaghti vasl shod, proxy-e system ro bezar <code>127.0.0.1:18000</code> (SOCKS5)",
  masterdns_bot_config_values:
    "\u{1F4DD} <b>Meghdar-haye Config</b>\n\n" +
    "<b>Domain:</b> <code>{domain}</code>\n" +
    "<b>Ramznegari:</b> AES-256-GCM\n" +
    "<b>Key:</b> <code>{key}</code>\n" +
    "<b>Proxy Mahalli:</b> <code>127.0.0.1:18000</code> (SOCKS5)",
  masterdns_bot_proxy_hint: "Ba'd az ejra, proxy-e dastgah ro bezar 127.0.0.1:18000 (SOCKS5).",

  // DNS Tunnel
  btn_show_dnstt: "\u{1F4E1} DNS Tunnel (akharin rah)",
  btn_show_npv: "\u{1F517} SSH Tunnel (sari'tar)",
  npv_warning: "Tonel-e SSH mostaghim. Sari'tar az tonel-e DNS vali momkene rooye ba'zi shabake-ha block bashe.",
  dnstt_bot_title:
    "\u{1F4E1} <b>DNS Tunnel</b>\n\n" +
    "\u{26A1} <b>Hoshdar:</b> In kheyli konde (~1 Mbps). Faghat vaghti estefade kon ke HAME protocol-haye dige block hastan.\n\n" +
    "Platform-et ro entekhab kon:",
  dnstt_bot_warning: "DNS Tunnel faghat baraye moghe'i-e ke hich chiz-e digei kaar nakone.",
  dnstt_bot_android_title:
    "\u{1F4F1} <b>Android \u{2014} SlipNet</b>\n\n" +
    "1. SlipNet APK ro az GitHub download kon\n" +
    "2. Dokme-ye import ro paeen bezan \u{2014} SlipNet ba config-et baaz mishe\n" +
    "3. Too SlipNet Connect ro bezan",
  dnstt_bot_android_desc: "Paeen ro bezan ta config-e DNS tunnel ro too SlipNet import koni:",
  dnstt_bot_ios_title:
    "\u{1F34E} <b>iOS \u{2014} HTTP Injector</b>\n\n" +
    "HTTP Injector ro az App Store download kon, baad dasti set up kon:",
  dnstt_bot_ios_desc: "In marhale-ha ro too HTTP Injector anjam bede:",
  dnstt_bot_ios_steps:
    "1. Configs tab \u{2192} + \u{2192} New config\n" +
    "2. Tunnel Type: DNS (DNSTT) \u{2192} SSH\n" +
    "3. DNS Resolver: <code>{dnsResolver}</code>\n" +
    "4. Nameserver: <code>{nameserver}</code>\n" +
    "5. Public Key: <code>{pubkey}</code>\n" +
    "6. SSH Host: <code>127.0.0.1</code>\n" +
    "7. SSH Port: <code>2222</code>\n" +
    "8. SSH Username: <code>{sshUser}</code>\n" +
    "9. SSH Password: <code>{sshPass}</code>\n" +
    "10. Save kon va Start bezan",

  // Deep links
  btn_open_in_singbox: "\u{1F680} Baaz kardan too sing-box",
  btn_open_in_hiddify: "\u{1F680} Baaz kardan too Hiddify",

  // Dashboard
  dashboard_title:
    "\u{1F4CB} <b>Dashboard-e VPN-et</b>\n\n" +
    "Inja hame connection-haye mojood hastan. Har dokme ro bezan ta joz'iat-e config ro bebini.",
  btn_dashboard: "\u{1F4CB} Dashboard",
  bot_network_status:
    "\u{26A0}\u{FE0F} <b>Alan bishtar protocol-haye VPN block hastan.</b>\n\n" +
    "Protocol-haye VPN-e asli block shodan. <b>MasterDNS Tunnel</b> rooye sharayet-e fe'li kaar mikone \u2014 tosie mikonim az in estefade koni.",
  bot_other_options_note:
    "\u{1F4A1} Gozine-haye paeen momkene alan daroost kaar nakonan, vali dar dastras-an:",
  btn_masterdns_recommended: "\u{1F7E2} MasterDNS Tunnel \u2014 ALAN KAAR MIKONE",

  // Invite sharing
  invite_share_message:
    "{shareText}\n{link}",

  // Slipstream guide (Hiddify)
  slipstream_bot_guide:
    "<b>💡 Slipstream (IP haye behtar peida kon)</b>\n\n" +
    "Age connection kond ya ghati az Iran, ba Slipstream too Hiddify behtarin IP haye CDN ro peida kon:\n\n" +
    "1. Too Hiddify, boro be <b>Settings → Slipstream</b>\n" +
    "2. <b>Domain</b> ro bezar: <code>{domain}</code>\n" +
    "3. <b>DNS Resolver</b> ro bezar: <code>8.8.8.8:53</code>\n" +
    "4. Bezan <b>Scan For Working Resolvers</b>\n" +
    "5. <b>Advanced → IR DNS Ranges</b> ro entekhab kon\n" +
    "6. Tedad ro bezar <b>10000</b>, bezan <b>Generate IPs</b>, baad <b>Start Scan</b>\n" +
    "7. Vaghti DNS ha peida shodan, <b>Test Tunnel</b> ro ham bezan baraye test\n" +
    "8. Behtarin ha ro entekhab kon va bala samte rast <b>Apply</b> ro bezan\n\n" +
    "Momkene lazem bashe scan ro tekrar koni.\n\n<b>IR DNS Range haye scan shode (copy kon too Custom mode):</b>\n<code>194.53.0.0-194.53.255.255\n89.46.0.0-89.46.255.255\n2.177.0.0-2.177.255.255\n2.190.0.0-2.190.255.255\n151.235.0.0-151.235.255.255\n5.74.0.0-5.74.255.255\n2.178.0.0-2.178.255.255\n5.239.0.0-5.239.255.255\n5.238.0.0-5.238.255.255\n5.159.0.0-5.159.255.255\n2.191.0.0-2.191.255.255\n5.233.0.0-5.233.255.255\n2.176.0.0-2.176.255.255\n37.148.0.0-37.148.255.255\n2.180.0.0-2.180.255.255\n89.219.0.0-89.219.255.255\n46.100.0.0-46.100.255.255\n185.173.0.0-185.173.255.255\n2.179.0.0-2.179.255.255\n79.175.0.0-79.175.255.255\n93.118.0.0-93.118.255.255\n78.39.0.0-78.39.255.255\n5.236.0.0-5.236.255.255\n91.92.0.0-91.92.255.255\n94.182.0.0-94.182.255.255\n80.210.0.0-80.210.255.255\n78.38.0.0-78.38.255.255\n2.184.0.0-2.184.255.255\n5.234.0.0-5.234.255.255\n94.183.0.0-94.183.255.255</code>",

  // Backup Tunnels (web)
  backup_tunnels_section_title: "Tonel-haye Poshtibaani",
  npv_card_title: "SSH Tunnel (sari'tar)",
  npv_card_desc: "Tonel-e SSH mostaghim. Sari'tar az tonel-e DNS vali momkene rooye ba'zi shabake-ha block bashe.",
  npv_field_protocol: "Protocol",
  npv_field_ssh_host: "SSH Host",
  npv_field_ssh_port: "SSH Port",
  npv_field_udpgw_port: "Udpgw Port",
  npv_field_username: "Username",
  npv_field_password: "Password",
  npv_udpgw_hint: "UDPGW transparent DNS ro too app-et faal kon.",
  npv_app_android: "NapsternetV (Android)",
  npv_app_ios: "NpvTunnel (iPhone)",
  dnstt_card_title: "DNS Tunnel (akharin rah)",
  dnstt_card_desc: "Kheili kond (~1 Mbps) vali vaghti hame chiz block bashe kaar mikone. Faghat baraye moghe-haye ezterari.",
  dnstt_android_title: "Android — SlipNet",
  dnstt_android_desc: "Paeen ro bezan ta config-e DNS tunnel ro too SlipNet import koni:",
  dnstt_android_btn: "Baz kardan too SlipNet",
  dnstt_ios_title: "iOS — HTTP Injector",
  dnstt_ios_steps_web: "HTTP Injector ro az App Store download kon, baad dasti set up kon:",
  dnstt_copied_hint: "Copy shod!",
  dnstt_backup_resolvers: "Agar DNS Resolver vasl nashe, in backup-ha ro emtahan kon: {resolvers}",
  dnstt_resolver_freshness: "IP-haye resolver az pool-e server-haye ISP iran-e ke az qabl verify shadan entekhaab mishan va har 6 saat avaz mishan. Aakharin update: {updatedAt}.",

  // MasterDNS Tunnel (web)
  masterdns_card_title: "MasterDNS Tunnel",
  masterdns_card_warning: "KHEILI PISHRAFTE — niaz be terminal/command line dare",
  masterdns_card_desc: "~10 barabar sari'tar az DNS tunnel-e mamooli. Niaz be download va ejra-ye barname rooye dastgah-et dare.",
  masterdns_download_config: "Download File Config",
  masterdns_android_title: "Android (Termux)",
  masterdns_android_steps: "1. Termux ro az F-Droid nasb kon (na Play Store)\n2. Client binary ro download va extract kon\n3. Config file ro too Termux save kon\n4. Client ro ejra kon\n5. Proxy-e Wi-Fi gooshi ro bezar 127.0.0.1:18000",
  masterdns_windows_title: "Windows",
  masterdns_windows_steps: "1. Client .zip ro baraye Windows download kon\n2. Extract kon va config file ro save kon\n3. cmd ro baaz kon, client ro ejra kon\n4. Proxy-e system ro bezar 127.0.0.1:18000 (SOCKS5)",
  masterdns_desktop_title: "macOS / Linux",
  masterdns_desktop_steps: "1. Client ro baraye platform-et download kon\n2. Config file ro too haman folder save kon\n3. Too terminal ejra kon\n4. Proxy-e system ro bezar 127.0.0.1:18000 (SOCKS5)",
  masterdns_proxy_hint: "Ba'd az ejra, proxy-e dastgah ro bezar 127.0.0.1:18000 (SOCKS5).",
  masterdns_resolvers_hint: "DNS Resolver-ha (agar default vasl nashe ina ro emtehan kon):",

  // MTProto Proxy
  mtproto_section_title: "Proxy Telegram",
  mtproto_card_title: "MTProto Proxy",
  mtproto_card_desc: "Nemitoni be Telegram vasl beshi? Az in proxy estefade kon baraye vasl shodan be Telegram bedun-e VPN.",
  mtproto_copy_link: "Copy Link Proxy",
  mtproto_copied_hint: "Link proxy copy shod! Too browser paste kon ya share kon.",
  mtproto_open_telegram: "Baz kardan too Telegram",
  btn_show_mtproto: "\u{1F4E1} Proxy Telegram",
  mtproto_bot_message: "<b>\u{1F4E1} Proxy Telegram (MTProto)</b>\n\nAz in proxy estefade kon baraye dastresi be Telegram vaghti filter hast.\n\nDokme zir ro bezan ta be Telegram ezafe she, ya link ro copy kon va share kon.",
  mtproto_qr_hint: "In QR code ro scan kon ta proxy be Telegram ezafe she.",
};

// ---------------------------------------------------------------------------
// Farsi
// ---------------------------------------------------------------------------
const fa: TranslationKeys = {
  language_prompt:
    "\u{1F44B} Hi! Welcome!\n" +
    "\u{1F30D} Free VPN \u{2014} private, unrestricted internet\n" +
    "\u{23F1} 2 min setup\n\n" +
    "\u{1F1EE}\u{1F1F7} Salam! VPN-e raayegaan \u{2014} internet-e azad va khosoosi\n\n" +
    "\u{1F1EE}\u{1F1F7} \u0633\u0644\u0627\u0645! VPN \u0631\u0627\u06CC\u06AF\u0627\u0646 \u{2014} \u0627\u06CC\u0646\u062A\u0631\u0646\u062A \u0622\u0632\u0627\u062F \u0648 \u062E\u0635\u0648\u0635\u06CC\n\n" +
    "Choose your language / \u0632\u0628\u0627\u0646\u062A \u0631\u0648 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646:",
  language_switched: "زبان به فارسی تغییر کرد \u{2705}",

  welcome:
    "عالیه! اینجا اینجوری کار می‌کنه:\n\n" +
    "یکی که بهش اعتماد داری، یه لینک باهات به اشتراک گذاشته. " +
    "اون لینک بهت یه کلید VPN رایگان می‌ده. " +
    "بعد یه اپ VPN رایگان نصب می‌کنی " +
    "و کلیدت رو توش اضافه می‌کنی. همین! وصل می‌شی!\n\n" +
    "اگه از یه لینک دعوت اومدی، کلیدت داره ساخته می‌شه...",

  welcome_returning:
    "خوش برگشتی! \u{1F44B}\n\n" +
    "تو الان یه کلید VPN داری. پایین رو بزن تا ببینیش.",

  what_is_this:
    "این ربات بهت یه اتصال VPN امن می‌ده.\n\n" +
    "VPN بهت اجازه می‌ده آزادانه و خصوصی از اینترنت " +
    "استفاده کنی. مثل یه تونل مخفی کار می‌کنه \u{2014} " +
    "هیچکس نمی‌تونه ببینه آنلاین داری چی‌کار می‌کنی.\n\n" +
    "برای استفاده، به یه لینک دعوت نیاز داری " +
    "که یکی که بهش اعتماد داری باهات به اشتراک بذاره!",

  need_invite:
    "برای شروع به یه لینک دعوت نیاز داری.\n\n" +
    "از یه دوست که الان استفاده می‌کنه بخواه لینک دعوتش رو " +
    "باهات به اشتراک بذاره. لینک یه چیزی مثل اینه:\nt.me/...?start=ref_...",

  invalid_referral:
    "این لینک دعوت معتبر نیست \u{274C}\n\n" +
    "از کسی که به اشتراک گذاشته بخواه لینکش رو چک کنه.",

  referral_full:
    "اون نفر همه دعوت‌هاش رو استفاده کرده \u{1F61E}\n\n" +
    "از یه نفر دیگه که استفاده می‌کنه بخواه لینکش رو به اشتراک بذاره.",

  already_has_key:
    "تو الان یه کلید VPN داری! \u{2705}\n\nپایین رو بزن تا ببینیش.",

  getkey_creating:
    "\u{23F3} کلید VPN-ت داره ساخته می‌شه... چند ثانیه صبر کن.",

  getkey_success:
    "کلیدت آماده‌ست! \u{1F389}\n\n" +
    "اینا رو باید انجام بدی:\n" +
    "1\uFE0F\u20E3 یه اپ VPN دانلود کن (کمکت می‌کنیم انتخاب کنی)\n" +
    "2\uFE0F\u20E3 برگرد اینجا تا کلیدت رو بگیری\n" +
    "3\uFE0F\u20E3 کلید رو تو اپ اضافه کن و وصل شو\n\n" +
    "فقط ۲ دقیقه طول می‌کشه. شروع کنیم!",

  getkey_error:
    "یه مشکلی پیش اومد \u{1F615}\n\n" +
    "لطفا چند دقیقه دیگه دوباره تلاش کن.",

  your_referral_link:
    "با دوستات به اشتراک بذار! \u{1F496}\n\n" +
    "{remaining} تا دعوت داری. " +
    "این لینک رو با دوستات که VPN لازم دارن به اشتراک بذار:\n\n" +
    "`{link}`\n\n" +
    "وقتی لینک رو بزنن، اتوماتیک کلید می‌گیرن.",

  referral_used_up:
    "همه {max} تا دعوتت رو استفاده کردی.\n\n" +
    "ممنون که به بقیه کمک کردی وصل بشن! \u{1F64F}",

  setup_step1_photo:
    "<b>مرحله ۱ از ۲: یه اپ VPN بگیر \u{2B07}\uFE0F</b>\n\n" +
    "اول، گوشیت چیه؟",

  setup_step2_photo:
    "<b>مرحله ۲ از ۲: کلیدت رو کپی کن \u{1F511}</b>\n\n" +
    "عالی، اپ VPN رو داری! \u{1F44F}\n\n" +
    "کلید VPN-ت تو پیام بعدیه. روش نگه‌دار تا کپی بشه.",

  setup_all_set:
    "\u{1F389} تموم شد!\n\n" +
    "اپ VPN در پس‌زمینه اجرا می‌شه \u{2014} هر وقت VPN لازم داشتی، اپ رو باز کن و Connect رو بزن.\n\n" +
    "کلیدت رو دوباره لازم داری؟ /mykey رو بفرست.",

  join_beta: "به کانال تلگرام ما بپیوندید برای اطلاع‌رسانی، رفع مشکل و ارسال بازخورد:",
  btn_join_beta: "\u{1F4E2} عضویت در کانال بتا",

  setup_pick_device:
    "<b>مرحله ۱ از ۲: یه اپ VPN بگیر \u{2B07}\uFE0F</b>\n\n" +
    "اول، گوشیت چیه؟",
  btn_device_iphone: "\u{1F34E} آیفون",
  btn_device_android: "\u{1F4F1} اندروید",
  setup_step1_iphone:
    "<b>مرحله ۱ از ۲: sing-box رو دانلود کن \u{2B07}\uFE0F</b>\n\n" +
    "<b>sing-box</b> رو پیشنهاد می‌کنیم \u{2014} رایگان، اوپن‌سورس، ۷ پروتکل در یک پروفایل.\n\n" +
    "پایین بزن تا از App Store دانلود کنی.\n\n" +
    "وقتی نصب شد، برگرد اینجا و \"\u{2705} نصب کردم، بعدی!\" رو بزن.",
  setup_step1_android:
    "<b>مرحله ۱ از ۲: sing-box رو دانلود کن \u{2B07}\uFE0F</b>\n\n" +
    "<b>sing-box</b> رو پیشنهاد می‌کنیم \u{2014} رایگان، اوپن‌سورس، ۷ پروتکل در یک پروفایل.\n\n" +
    "پایین بزن تا از Play Store دانلود کنی.\n\n" +
    "وقتی نصب شد، برگرد اینجا و \"\u{2705} نصب کردم، بعدی!\" رو بزن.",

  setup_step1:
    "مرحله ۱ از ۲: یه اپ VPN بگیر \u{2B07}\uFE0F\n\n" +
    "برای وصل شدن به یه اپ VPN نیاز داری. <b>sing-box</b> رو پیشنهاد می‌کنیم (رایگان، اوپن‌سورس) \u{2014} ۷ پروتکل در یک پروفایل.\n\n" +
    "پایین بزن تا دانلود کنی.\n\n" +
    "وقتی نصب شد، برگرد اینجا و \"\u{2705} نصب کردم، بعدی!\" رو بزن.",

  setup_step2:
    "مرحله ۲ از ۲: کلیدت رو کپی کن \u{1F511}\n\n" +
    "عالی، اپ VPN رو داری! \u{1F44F}\n\n" +
    "کلید VPN-ت تو پیام بعدیه. روش نگه‌دار تا کپی بشه.",

  setup_done:
    "\u{1F389} تموم شد!\n\n" +
    "اپ VPN در پس‌زمینه اجرا می‌شه \u{2014} هر وقت VPN لازم داشتی، اپ رو باز کن و Connect رو بزن.\n\n" +
    "کلیدت رو دوباره لازم داری؟ /mykey رو بفرست.",

  mykey_no_key:
    "هنوز کلید VPN نداری.\n\nبه یه لینک دعوت از یه دوست نیاز داری.",

  mykey_show:
    "کلید VPN-ت اینه \u{1F511}\n\n" +
    "<code>{accessUrl}</code>\n\n" +
    "روی کلید نگه‌دار تا کپی بشه، بعد تو اپ VPN paste کن.",

  mykey_show_sub:
    "\u{1F517} <b>لینک اشتراک</b>\n\n" +
    "<code>{subUrl}</code>\n\n" +
    "این لینک رو کپی کن و تو اپ VPN \u{2192} + \u{2192} Add from clipboard بزن.",

  mykey_revoked:
    "کلیدت غیرفعال شده.\n\nلطفا با کسی که دعوتت کرده صحبت کن.",

  help:
    "کمک لازم داری؟ اینو بخون:\n\n" +
    "\u{1F4F1} <b>اپ‌های VPN:</b>\n" +
    "\u{2022} <b>sing-box</b> (پیشنهادی) \u{2014} ۷ پروتکل، خودکار سریع‌ترین مسیر رو انتخاب می‌کنه\n" +
    "\u{2022} <b>Hiddify</b> \u{2014} همان ۷ پروتکل، رابط ساده‌تر\n" +
    "\u{2022} <b>AmneziaVPN</b> \u{2014} AmneziaWG 2.0 + OpenVPN+Cloak\n\n" +
    "\u{1F511} کلیدت رو ببین: /mykey\n" +
    "\u{1F496} دعوت دوستان: /invite\n\n" +
    "\u{1F4CB} <b>چجوری وصل بشی:</b>\n" +
    "۱. اپ VPN رو باز کن\n" +
    "۲. + رو بزن \u{2192} Add from clipboard\n" +
    "۳. Connect رو بزن\n\n" +
    "\u{1F527} <b>اگه مشکل داری:</b>\n" +
    "\u{2022} <b>WS-Worker یا HU-Worker رو انتخاب کن</b> \u{2014} الان فقط اینها کار می‌کنن. آیفون: بالا اسم پروکسی رو بزن. اندروید: آیکون \u{1F4C1} پوشه رو کنار «Started» بزن.\n" +
    "\u{2022} «No response» داری؟ بین WS-Worker و HU-Worker سوئیچ کن\n" +
    "\u{2022} iOS «failed to start core» داری؟ اپ رو از App Store به آخرین نسخه آپدیت کن\n" +
    "\u{2022} Fragment رو تو تنظیمات اپ فعال کن \u{2014} می‌تونه کمک کنه\n" +
    "\u{2022} هنوز مشکل داری؟ اپ <b>1.1.1.1 (WARP)</b> رو از اپ استور نصب کن، روشنش کن، بعد VPN رو وصل کن \u{2014} این می‌تونه فیلتر سنگین رو دور بزنه\n" +
    "\u{2022} اگه صفحات باز نمی‌شه وقتی وصل هستی، DNS رو به <b>1.1.1.1</b> عوض کن یا DNS-over-HTTPS (DoH) رو تو تنظیمات اپ فعال کن\n\n" +
    "\u{1F310} تغییر زبان: /language",

  error_generic: "یه مشکلی پیش اومد. لطفا دوباره تلاش کن.",
  rate_limited: "لطفا چند لحظه صبر کن.",

  btn_what_is_this: "\u{2753} این چیه؟",
  btn_download_android: "\u{1F4F1} sing-box (Play Store)",
  btn_download_iphone: "\u{1F34E} sing-box (App Store)",
  btn_installed: "\u{2705} نصب کردم، بعدی!",
  btn_show_my_key: "\u{1F511} کلیدم رو ببین",
  btn_my_invite_link: "\u{1F496} لینک دعوت من",
  btn_done: "\u{2705} تموم!",
  btn_help: "\u{2753} کمک",
  btn_change_language: "\u{1F310} تغییر زبان",

  btn_next: "بعدی \u{27A1}\uFE0F",
  btn_copy_key: "\u{1F4CB} کپی کلید",
  btn_show_qr: "\u{1F4F2} نمایش QR Code",
  btn_show_sub_qr: "\u{1F4F2} QR Auto-Config",
  btn_show_sub_link: "\u{1F517} Auto-Config (پیشنهادی)",
  btn_add_to_streisand: "\u{1F680} اضافه به Streisand (۱ ضربه)",
  btn_reset_keys: "\u{1F504} ریست کلیدها",
  reset_confirm: "مطمئنی می‌خوای کلیدهات رو ریست کنی؟ کلیدهای فعلی قطع می‌شن و کلید جدید می‌گیری. باید پروفایل جدید رو دوباره تو اپ VPN وارد کنی.",
  reset_success:
    "\u{2705} <b>کلیدها با موفقیت ریست شد!</b>\n\n" +
    "کلیدهای قبلی غیرفعال شدن و کلیدهای جدید ساخته شد.\n" +
    "لطفاً پروفایل قبلی رو از اپ VPN پاک کن و پروفایل جدید رو اضافه کن.",
  reset_no_key: "هیچ کلید فعالی نداری که ریست کنی.",
  qr_caption: "این QR code رو با دوربین گوشیت اسکن کن تا کلید VPN اضافه بشه.",
  qr_caption_sub: "این QR code رو در یک اپ سازگار اسکن کن تا پروفایل auto-config اضافه بشه.",
  qr_or_scan: "یا این QR code رو اسکن کن:",
  amnezia_file_caption: "فایل کانفیگ — در AmneziaVPN بازش کن تا ایمپورت بشه.",
  setup_step2_sub:
    "<b>مرحله ۲ از ۲: پروفایل VPN رو اضافه کن \u{1F517}</b>\n\n" +
    "لینک اشتراک رو کپی کن و تو اپ VPN اضافه کن.\n\n" +
    "اپ VPN رو باز کن \u{2192} + \u{2192} Add from clipboard.\n\n" +
    "\u{26A0}\uFE0F <b>مهم:</b> بعد از وارد کردن، <b>WS-Worker</b> یا <b>HU-Worker</b> رو انتخاب کن \u{2014} الان فقط اینها کار می‌کنن.\n" +
    "\u{2022} آیفون: بالا اسم پروکسی رو بزن\n" +
    "\u{2022} اندروید: آیکون \u{1F4C1} پوشه رو کنار «Started» بزن",
  setup_img_plus: "تو اپ دکمه اضافه کردن پروفایل رو بزن",
  setup_img_clipboard: "بعد import از clipboard یا link رو بزن",
  connection_confirmed:
    "\u{1F389} آنلاین شدی! VPN-ت داره درست کار می‌کنه.\n\n" +
    "به اینترنت آزاد خوش اومدی! \u{1F30D}",
  connection_share_invite:
    "{remaining} تا دعوت داری که با دوستات و خانواده‌ت به اشتراک بذاری!\n\n" +
    "این لینک رو بفرست براشون:\n`{link}`",

  btn_enter_code: "\u{1F4DD} کد دارم",
  enter_code_prompt:
    "کد دعوتت رو پایین تایپ کن.\n\n" +
    "اون قسمته بعد از ref_ تو لینکه. مثلا اگه لینک اینه:\n" +
    "t.me/...?start=ref_<b>a1b2c3d4</b>\n\n" +
    "فقط تایپ کن: <b>a1b2c3d4</b>",
  enter_code_invalid:
    "این شبیه یه کد دعوت نیست \u{274C}\n\n" +
    "کد باید ۸ تا حرف و عدد باشه. دوباره امتحان کن، یا از دوستت بخواه لینک رو دوباره بفرسته.",

  status_no_key:
    "هنوز کلید VPN نداری.\n\nبه یه لینک دعوت از یه دوست نیاز داری.",
  status_message:
    "\u{1F4CA} <b>وضعیت VPN</b>\n\n" +
    "\u{1F511} کلید: {keyStatus}\n" +
    "\u{1F4E1} سرور: {serverStatus}\n" +
    "\u{1F4C8} مصرف دیتا: {bandwidth}\n" +
    "\u{1F4C5} عضو از: {createdAt}\n" +
    "\u{1F496} دعوت‌های باقی‌مونده: {invitesRemaining}",

  admin_unauthorized: "You are not authorized to use admin commands.",
  admin_no_users: "No registered users.",
  admin_users_list: "Registered users:\n\n{list}",
  admin_revoke_usage: "Usage: /admin_revoke <telegram_id>",
  admin_revoke_not_found: "User not found.",
  admin_revoke_success: "Revoked VPN key for user {telegramId}.",
  admin_revoke_error: "Failed to revoke key.",
  admin_stats:
    "Server Stats:\n\n" +
    "Total users: {totalUsers}\n" +
    "Active keys: {activeKeys}\n" +
    "Total data transferred: {totalTransfer}",
  admin_my_link:
    "Your admin invite link (unlimited invites):\n\n`{link}`",
  btn_show_awg_config: "\u{1F6E1}\uFE0F \u06A9\u0627\u0646\u0641\u06CC\u06AF AmneziaWG 2.0",
  btn_download_amneziavpn: "\u{2B07}\uFE0F \u062F\u0627\u0646\u0644\u0648\u062F AmneziaVPN",
  awg_config_message:
    "\u{1F6E1}\uFE0F <b>AmneziaWG 2.0</b>\n\n" +
    "WireGuard \u0645\u0628\u0647\u0645\u200C\u0633\u0627\u0632\u06CC\u200C\u0634\u062F\u0647 \u0628\u0627 padding \u067E\u06A9\u062A \u0636\u062F DPI\u060C \u0647\u062F\u0631\u0647\u0627\u06CC \u062F\u0627\u06CC\u0646\u0627\u0645\u06CC\u06A9 \u0648 \u062A\u0632\u0631\u06CC\u0642 \u067E\u06A9\u062A\u200C\u0647\u0627\u06CC junk. " +
    "\u0627\u0632 UDP \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u0645\u06CC\u200C\u06A9\u0646\u0647 \u{2014} \u0645\u0645\u06A9\u0646\u0647 \u062A\u0648 \u06A9\u0634\u0648\u0631\u0647\u0627\u06CC\u06CC \u06A9\u0647 UDP \u0631\u0648 \u0628\u0644\u0627\u06A9 \u0645\u06CC\u200C\u06A9\u0646\u0646 \u06A9\u0627\u0631 \u0646\u06A9\u0646\u0647.\n\n" +
    "\u0628\u0631\u0627\u06CC \u0627\u0633\u062A\u0641\u0627\u062F\u0647\u060C <b>AmneziaVPN</b> \u0631\u0648 \u0646\u0635\u0628 \u06A9\u0646 \u0648 \u0627\u06CC\u0646 \u06A9\u0627\u0646\u0641\u06CC\u06AF \u0631\u0648 import \u06A9\u0646:",

  btn_show_ovpn_config: "\u{1F510} \u06A9\u0627\u0646\u0641\u06CC\u06AF OpenVPN+Cloak",
  ovpn_config_message:
    "\u{1F510} <b>OpenVPN + Cloak</b>\n\n" +
    "\u0627\u06CC\u0646 \u06CC\u06A9 \u067E\u0631\u0648\u062A\u06A9\u0644 VPN \u062C\u0627\u06CC\u06AF\u0632\u06CC\u0646 \u0627\u0633\u062A \u06A9\u0647 \u062A\u0631\u0627\u0641\u06CC\u06A9 OpenVPN \u0631\u0648 \u0645\u062B\u0644 HTTPS \u0639\u0627\u062F\u06CC \u0646\u0634\u0648\u0646 \u0645\u06CC\u200C\u062F\u0647. " +
    "\u0627\u0632 TCP \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u0645\u06CC\u200C\u06A9\u0646\u0647 \u{2014} \u062D\u062A\u06CC \u062C\u0627\u06CC\u06CC \u06A9\u0647 UDP \u0628\u0644\u0627\u06A9 \u0627\u0633\u062A \u06A9\u0627\u0631 \u0645\u06CC\u200C\u06A9\u0646\u0647.\n\n" +
    "\u0628\u0631\u0627\u06CC \u0627\u0633\u062A\u0641\u0627\u062F\u0647\u060C <b>AmneziaVPN</b> \u0631\u0648 \u0646\u0635\u0628 \u06A9\u0646 \u0648 \u0627\u06CC\u0646 \u0644\u06CC\u0646\u06A9 \u0631\u0648 paste \u06A9\u0646:",
  ovpn_unavailable_bot: "OpenVPN + Cloak \u0645\u0648\u0642\u062A\u0627\u064B \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A. \u062F\u0627\u0631\u06CC\u0645 \u0631\u0648\u06CC \u0631\u0641\u0639\u0634 \u06A9\u0627\u0631 \u0645\u06CC\u200C\u06A9\u0646\u06CC\u0645. \u0644\u0637\u0641\u0627\u064B \u0627\u0632 \u067E\u0631\u0648\u062A\u06A9\u0644\u200C\u0647\u0627\u06CC \u062F\u06CC\u06AF\u0631 \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u06A9\u0646\u06CC\u062F.",

  btn_show_naive_config: "\u{1F310} \u06A9\u0627\u0646\u0641\u06CC\u06AF NaiveProxy",
  naive_config_message:
    "\u{1F310} <b>NaiveProxy</b>\n\n" +
    "NaiveProxy \u0627\u0632 \u0634\u0628\u06A9\u0647 \u0648\u0627\u0642\u0639\u06CC Chromium \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u0645\u06CC\u200C\u06A9\u0646\u0647 \u{2014} \u0642\u0627\u0628\u0644 \u062A\u0634\u062E\u06CC\u0635 \u0627\u0632 \u0645\u0631\u0648\u0631 \u0639\u0627\u062F\u06CC Chrome \u0646\u06CC\u0633\u062A. " +
    "\u0628\u0633\u06CC\u0627\u0631 \u0645\u0642\u0627\u0648\u0645 \u062F\u0631 \u0628\u0631\u0627\u0628\u0631 \u0634\u0646\u0627\u0633\u0627\u06CC\u06CC DPI.\n\n" +
    "\u0627\u06CC\u0646 URI \u0631\u0648 \u06A9\u067E\u06CC \u06A9\u0646 \u0648 \u062A\u0648 <b>sing-box</b> \u06CC\u0627 \u0647\u0631 \u0627\u067E\u06CC \u06A9\u0647 \u0627\u0632 naive:// \u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u06CC \u0645\u06CC\u200C\u06A9\u0646\u0647 \u0627\u0636\u0627\u0641\u0647 \u06A9\u0646:",

  btn_show_shadowtls_config: "\u{1F9E5} \u06A9\u0627\u0646\u0641\u06CC\u06AF ShadowTLS",
  shadowtls_config_message:
    "\u{1F9E5} <b>ShadowTLS v3 + Shadowsocks</b>\n\n" +
    "\u0627\u06CC\u0646 \u06CC\u06A9 \u0645\u0633\u06CC\u0631 \u0645\u062E\u0641\u06CC \u0627\u0636\u0627\u0641\u06CC \u0628\u0631\u0627\u06CC \u06A9\u0644\u0627\u06CC\u0646\u062A\u200C\u0647\u0627\u06CC \u067E\u06CC\u0634\u0631\u0641\u062A\u0647 \u0627\u0633\u062A. JSON \u0631\u0627 \u062F\u0631 <b>sing-box</b> \u0627\u06CC\u0645\u067E\u0648\u0631\u062A \u06A9\u0646\u06CC\u062F\u060C \u06CC\u0627 \u0627\u0632 URI \u0634\u062F\u0648\u0633\u0627\u06A9\u0633 \u067E\u0627\u06CC\u06CC\u0646 \u062F\u0631 \u0647\u0631 \u0627\u067E \u0633\u0627\u0632\u06AF\u0627\u0631 \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u06A9\u0646\u06CC\u062F.\n\n" +
    "JSON \u0627\u06CC sing-box:",

  // App picker (bot setup flow)
  setup_pick_app:
    "<b>\u0645\u0631\u062D\u0644\u0647 \u06F1 \u0627\u0632 \u06F3: \u0627\u067E VPN \u0631\u0648 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F</b>\n\n" +
    "\u06CC\u06A9 \u0627\u067E \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F \u0628\u0631\u0627\u06CC \u0648\u0635\u0644 \u0634\u062F\u0646. \u0645\u06CC\u200C\u062A\u0648\u0646\u06CC\u062F \u0628\u0639\u062F\u0627\u064B \u06CC\u06A9 \u0627\u067E \u062F\u06CC\u06AF\u0647 \u0647\u0645 \u0627\u0645\u062A\u062D\u0627\u0646 \u06A9\u0646\u06CC\u062F!",
  btn_app_singbox: "\u{1F4E6} sing-box \u{2014} \u067E\u06CC\u0634\u0646\u0647\u0627\u062F\u06CC",
  btn_app_hiddify: "\u{1F4E6} Hiddify \u{2014} \u0622\u0633\u0627\u0646 \u0648 \u0631\u0627\u062D\u062A",
  btn_app_amneziavpn: "\u{1F4E6} AmneziaVPN \u{2014} AmneziaWG 2.0 + OpenVPN",
  setup_download_singbox:
    "<b>\u0645\u0631\u062D\u0644\u0647 \u06F2 \u0627\u0632 \u06F3: sing-box \u0631\u0648 \u062F\u0627\u0646\u0644\u0648\u062F \u06A9\u0646\u06CC\u062F</b>\n\n" +
    "\u0631\u0627\u06CC\u06AF\u0627\u0646\u060C \u0627\u0648\u067E\u0646\u200C\u0633\u0648\u0631\u0633\u060C \u06F7 \u067E\u0631\u0648\u062A\u06A9\u0644 \u062F\u0631 \u06CC\u06A9 \u067E\u0631\u0648\u0641\u0627\u06CC\u0644. \u0627\u067E \u062E\u0648\u062F\u06A9\u0627\u0631 \u0633\u0631\u06CC\u0639\u200C\u062A\u0631\u06CC\u0646 \u0645\u0633\u06CC\u0631 \u0631\u0648 \u0627\u0646\u062A\u062E\u0627\u0628 \u0645\u06CC\u200C\u06A9\u0646\u0647.\n\n" +
    "\u0628\u0632\u0646\u06CC\u062F \u062A\u0627 \u062F\u0627\u0646\u0644\u0648\u062F \u06A9\u0646\u06CC\u062F\u060C \u0628\u0639\u062F \u0628\u0631\u06AF\u0631\u062F\u06CC\u062F \u0648 \u{2705} \u0631\u0648 \u0628\u0632\u0646\u06CC\u062F",
  setup_download_hiddify:
    "<b>\u0645\u0631\u062D\u0644\u0647 \u06F2 \u0627\u0632 \u06F3: Hiddify \u0631\u0648 \u062F\u0627\u0646\u0644\u0648\u062F \u06A9\u0646\u06CC\u062F</b>\n\n" +
    "\u0631\u0627\u06CC\u06AF\u0627\u0646\u060C \u0627\u0648\u067E\u0646\u200C\u0633\u0648\u0631\u0633 \u0648 \u0622\u0633\u0627\u0646. \u0647\u0645\u0627\u0646 \u06F7 \u067E\u0631\u0648\u062A\u06A9\u0644 \u{2014} \u0631\u0627\u0628\u0637 \u0633\u0627\u062F\u0647\u200C\u062A\u0631.\n\n" +
    "\u0628\u0632\u0646\u06CC\u062F \u062A\u0627 \u062F\u0627\u0646\u0644\u0648\u062F \u06A9\u0646\u06CC\u062F\u060C \u0628\u0639\u062F \u0628\u0631\u06AF\u0631\u062F\u06CC\u062F \u0648 \u{2705} \u0631\u0648 \u0628\u0632\u0646\u06CC\u062F",
  setup_download_amneziavpn:
    "<b>\u0645\u0631\u062D\u0644\u0647 \u06F2 \u0627\u0632 \u06F3: AmneziaVPN \u0631\u0648 \u062F\u0627\u0646\u0644\u0648\u062F \u06A9\u0646\u06CC\u062F</b>\n\n" +
    "\u0631\u0627\u06CC\u06AF\u0627\u0646 \u0648 \u0631\u0648\u06CC \u0647\u0645\u0647 \u062F\u0633\u062A\u06AF\u0627\u0647\u200C\u0647\u0627 \u06A9\u0627\u0631 \u0645\u06CC\u200C\u06A9\u0646\u0647. AmneziaWG 2.0 (WireGuard \u0636\u062F DPI) \u0648 OpenVPN + Cloak \u0631\u0648 \u062F\u0627\u0631\u0647.\n\n" +
    "\u0628\u0632\u0646\u06CC\u062F \u062A\u0627 \u062F\u0627\u0646\u0644\u0648\u062F \u06A9\u0646\u06CC\u062F\u060C \u0628\u0639\u062F \u0628\u0631\u06AF\u0631\u062F\u06CC\u062F \u0648 \u{2705} \u0631\u0648 \u0628\u0632\u0646\u06CC\u062F",
  setup_step2_amnezia:
    "<b>\u0645\u0631\u062D\u0644\u0647 \u06F3 \u0627\u0632 \u06F3: \u06A9\u0627\u0646\u0641\u06CC\u06AF VPN \u0631\u0648 \u0627\u0636\u0627\u0641\u0647 \u06A9\u0646\u06CC\u062F</b>\n\n" +
    "\u0647\u0631 \u06A9\u0627\u0646\u0641\u06CC\u06AF \u0631\u0648 \u06A9\u067E\u06CC \u06A9\u0646\u06CC\u062F \u0648 \u062F\u0631 AmneziaVPN \u0627\u0636\u0627\u0641\u0647 \u06A9\u0646\u06CC\u062F:\n<b>+</b> \u0631\u0648 \u0628\u0632\u0646\u06CC\u062F \u{2192} <b>\u06A9\u0644\u06CC\u062F \u0631\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F</b>",

  btn_get_config_file: "\u{1F4CE} \u062F\u0631\u06CC\u0627\u0641\u062A \u0641\u0627\u06CC\u0644 \u06A9\u0627\u0646\u0641\u06CC\u06AF",
  config_file_caption:
    "\u{1F4E5} <b>\u0641\u0627\u06CC\u0644 \u06A9\u0627\u0646\u0641\u06CC\u06AF sing-box</b>\n\n" +
    "\u0627\u06CC\u0646 \u0641\u0627\u06CC\u0644 \u0631\u0627 \u062F\u0631 Hiddify \u06CC\u0627 sing-box \u0628\u0627\u0632 \u06A9\u0646\u06CC\u062F \u062A\u0627 \u067E\u0631\u0648\u0641\u0627\u06CC\u0644 \u0627\u06CC\u0645\u067E\u0648\u0631\u062A \u0634\u0648\u062F.\n\n" +
    "Hiddify: \u0641\u0627\u06CC\u0644 \u0631\u0627 \u0628\u0632\u0646\u06CC\u062F \u{2192} Open with Hiddify\n" +
    "sing-box: Profiles \u{2192} + \u{2192} Import from file",
  config_file_error: "\u0633\u0627\u062E\u062A \u0641\u0627\u06CC\u0644 \u06A9\u0627\u0646\u0641\u06CC\u06AF \u0645\u0634\u06A9\u0644 \u062F\u0627\u0631\u062F. \u0644\u0637\u0641\u0627\u064B \u0628\u0639\u062F\u0627\u064B \u0627\u0645\u062A\u062D\u0627\u0646 \u06A9\u0646\u06CC\u062F.",

  feature_disabled: "\u0627\u06CC\u0646 \u0642\u0627\u0628\u0644\u06CC\u062A \u062F\u0631 \u062D\u0627\u0644 \u062D\u0627\u0636\u0631 \u063A\u06CC\u0631\u0641\u0639\u0627\u0644 \u0627\u0633\u062A.",
  registration_closed: "ثبت‌نام در حال حاضر بسته است.",

  // V2rayNG
  btn_v2ray_sub: "\u{1F4E6} \u0627\u0634\u062A\u0631\u0627\u06A9 V2rayNG",
  v2ray_sub_message:
    "\u{1F4E6} <b>V2rayNG (\u0641\u0642\u0637 \u0627\u0646\u062F\u0631\u0648\u06CC\u062F)</b>\n\n" +
    "\u0634\u0627\u0645\u0644 XHTTP \u{2014} \u06CC\u06A9\u06CC \u0627\u0632 \u0633\u062E\u062A\u200C\u062A\u0631\u06CC\u0646 \u067E\u0631\u0648\u062A\u06A9\u0644\u200C\u0647\u0627 \u0628\u0631\u0627\u06CC \u0634\u0646\u0627\u0633\u0627\u06CC\u06CC.\n\n" +
    "\u0644\u06CC\u0646\u06A9 \u0627\u0634\u062A\u0631\u0627\u06A9 \u0631\u0648 \u06A9\u067E\u06CC \u06A9\u0646 \u0648 \u062F\u0631 V2rayNG \u{2192} + \u{2192} Import from clipboard \u0628\u0632\u0646.\n\n" +
    "\u062F\u0627\u0646\u0644\u0648\u062F V2rayNG: https://play.google.com/store/apps/details?id=com.v2ray.ang",

  // Worker VLESS URIs
  btn_worker_uris: "\u{1F310} \u06A9\u0627\u0646\u0641\u06CC\u06AF\u200C\u0647\u0627\u06CC Worker (v2ray URI)",
  worker_uris_title: "\u{1F310} <b>\u06A9\u0627\u0646\u0641\u06CC\u06AF\u200C\u0647\u0627\u06CC Worker (v2ray URI)</b>",
  worker_uris_desc:
    "\u0647\u0631 URI \u0631\u0627 \u06A9\u067E\u06CC \u06A9\u0646\u06CC\u062F \u0648 \u062F\u0631 \u0628\u0631\u0646\u0627\u0645\u0647 \u067E\u06CC\u0633\u062A \u06A9\u0646\u06CC\u062F:\n" +
    "\u{2022} <b>sing-box</b>: Profiles \u{2192} + \u{2192} Import from clipboard\n" +
    "\u{2022} <b>Hiddify</b>: + \u{2192} Add from clipboard\n\n" +
    "\u{26A0}\uFE0F \u0627\u06CC\u0646\u200C\u0647\u0627 <b>\u062A\u0646\u0647\u0627 \u06A9\u0627\u0646\u0641\u06CC\u06AF\u200C\u0647\u0627\u06CC \u0641\u0639\u0627\u0644</b> \u0628\u0631\u0627\u06CC \u0627\u06CC\u0631\u0627\u0646 \u0647\u0633\u062A\u0646\u062F.",
  worker_uris_copy_hint: "URI \u06A9\u067E\u06CC \u0634\u062F!",

  // Backup Tunnels
  btn_show_backup_tunnels: "\u{1F6E1}\uFE0F \u062A\u0648\u0646\u0644\u200C\u0647\u0627\u06CC \u067E\u0634\u062A\u06CC\u0628\u0627\u0646",
  backup_tunnels_bot_title: "\u{1F6E1}\uFE0F <b>\u062A\u0648\u0646\u0644\u200C\u0647\u0627\u06CC \u067E\u0634\u062A\u06CC\u0628\u0627\u0646</b>\n\n\u0631\u0627\u0647\u200C\u0647\u0627\u06CC \u062C\u0627\u06CC\u06AF\u0632\u06CC\u0646 \u0628\u0631\u0627\u06CC \u0648\u0642\u062A\u06CC \u06A9\u0647 \u067E\u0631\u0648\u062A\u06A9\u0644\u200C\u0647\u0627\u06CC VPN \u0628\u0644\u0627\u06A9 \u0647\u0633\u062A\u0646\u062F. \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F:",

  // MasterDNS Tunnel
  btn_show_masterdns: "\u{26A1} \u062A\u0648\u0646\u0644 MasterDNS",
  masterdns_bot_warning:
    "\u{26A1} <b>\u062A\u0648\u0646\u0644 MasterDNS</b>\n\n" +
    "\u062D\u062F\u0648\u062F \u06F1\u06F0 \u0628\u0631\u0627\u0628\u0631 \u0633\u0631\u06CC\u0639\u200C\u062A\u0631 \u0627\u0632 \u062A\u0648\u0646\u0644 DNS \u0645\u0639\u0645\u0648\u0644\u06CC. \u0648\u0642\u062A\u06CC \u0647\u0645\u0647 \u0686\u06CC\u0632 \u0641\u06CC\u0644\u062A\u0631 \u0627\u0633\u062A \u06A9\u0627\u0631 \u0645\u06CC\u200C\u06A9\u0646\u062F.\n\n" +
    "\u067E\u0644\u062A\u0641\u0631\u0645 \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F:",
  masterdns_bot_platform_picker: "\u067E\u0644\u062A\u0641\u0631\u0645 \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F:",
  masterdns_bot_android_steps:
    "\u{1F4F1} <b>\u0627\u0646\u062F\u0631\u0648\u06CC\u062F (Termux)</b>\n\n" +
    "\u06F1. <b>Termux</b> \u0631\u0627 \u0627\u0632 F-Droid \u0646\u0635\u0628 \u06A9\u0646\u06CC\u062F (\u0646\u0647 Play Store)\n" +
    "\u06F2. \u062F\u0631 Termux \u0627\u062C\u0631\u0627 \u06A9\u0646\u06CC\u062F:\n" +
    "<code>curl -sL \"{downloadUrl}\" | tar -xz &amp;&amp; mv MasterDnsVPN_Client_* mdvpn &amp;&amp; chmod +x mdvpn</code>\n\n" +
    "\u06F3. \u06A9\u0627\u0646\u0641\u06CC\u06AF \u0632\u06CC\u0631 \u0631\u0627 \u062F\u0631 \u0641\u0627\u06CC\u0644 <code>config.toml</code> \u0630\u062E\u06CC\u0631\u0647 \u06A9\u0646\u06CC\u062F\n" +
    "\u06F4. \u0627\u062C\u0631\u0627 \u06A9\u0646\u06CC\u062F:\n" +
    "<code>./mdvpn -config config.toml</code>\n\n" +
    "\u06F5. \u067E\u0631\u0627\u06A9\u0633\u06CC Wi-Fi \u06AF\u0648\u0634\u06CC \u0631\u0627 \u0631\u0648\u06CC <code>127.0.0.1:18000</code> \u062A\u0646\u0638\u06CC\u0645 \u06A9\u0646\u06CC\u062F\n\n" +
    "\u0628\u0631\u0627\u06CC \u0631\u0627\u062D\u062A\u06CC \u0628\u06CC\u0634\u062A\u0631\u060C \u0641\u0627\u06CC\u0644 \u06A9\u0627\u0646\u0641\u06CC\u06AF \u0631\u0627 \u0627\u0632 \u0648\u0628 \u0627\u067E \u062F\u0627\u0646\u0644\u0648\u062F \u06A9\u0646\u06CC\u062F.",
  masterdns_bot_desktop_steps:
    "\u{1F4BB} <b>Windows / macOS / Linux</b>\n\n" +
    "\u06F1. \u0631\u0648\u06CC \u062F\u06A9\u0645\u0647 <b>Download Config</b> \u067E\u0627\u06CC\u06CC\u0646 \u0628\u0632\u0646\u06CC\u062F \u062A\u0627 \u0641\u0627\u06CC\u0644 zip (\u062D\u0627\u0648\u06CC config \u0648 resolvers) \u062F\u0631\u06CC\u0627\u0641\u062A \u0634\u0648\u062F\n" +
    "\u06F2. \u06A9\u0644\u0627\u06CC\u0646\u062A \u0631\u0627 \u0628\u0631\u0627\u06CC \u0633\u06CC\u0633\u062A\u0645\u200C\u0639\u0627\u0645\u0644 \u062E\u0648\u062F \u062F\u0627\u0646\u0644\u0648\u062F \u06A9\u0646\u06CC\u062F:\nhttps://github.com/masterking32/MasterDnsVPN#client-download-links-\n\n" +
    "\u06F3. \u0646\u0635\u0628 \u06A9\u0646\u06CC\u062F\u060C \u0628\u0631\u0646\u0627\u0645\u0647 \u0631\u0627 \u0628\u0627\u0632 \u06A9\u0646\u06CC\u062F \u0648 \u0628\u0647 \u0628\u062E\u0634 <b>Profiles</b> \u0628\u0631\u0648\u06CC\u062F\n" +
    "\u06F4. \u0631\u0648\u06CC <b>+</b> \u0628\u0632\u0646\u06CC\u062F \u2190 <b>Import TOML</b> \u2190 \u0641\u0627\u06CC\u0644 <code>client_config.toml</code> \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F\n" +
    "\u06F5. \u0633\u067E\u0633 <b>Import resolvers</b> \u0631\u0627 \u0628\u0632\u0646\u06CC\u062F \u2190 \u0641\u0627\u06CC\u0644 <code>client_resolvers.txt</code> \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F\n" +
    "\u06F6. \u0628\u06AF\u0630\u0627\u0631\u06CC\u062F check-\u0627\u0634 \u0627\u0646\u062C\u0627\u0645 \u0634\u0648\u062F \u2014 \u0647\u0645\u0647 resolver-\u0647\u0627 \u0631\u0627 \u062A\u0633\u062A \u0645\u06CC\u200C\u06A9\u0646\u062F\u060C \u0686\u0646\u062F \u062F\u0642\u06CC\u0642\u0647 \u0637\u0648\u0644 \u0645\u06CC\u200C\u06A9\u0634\u062F\n" +
    "\u06F7. \u067E\u0633 \u0627\u0632 \u0627\u062A\u0635\u0627\u0644\u060C \u067E\u0631\u0627\u06A9\u0633\u06CC \u0633\u06CC\u0633\u062A\u0645 \u0631\u0627 \u0631\u0648\u06CC <code>127.0.0.1:18000</code> (SOCKS5) \u062A\u0646\u0638\u06CC\u0645 \u06A9\u0646\u06CC\u062F",
  masterdns_bot_config_values:
    "\u{1F4DD} <b>\u0645\u0642\u0627\u062F\u06CC\u0631 \u06A9\u0627\u0646\u0641\u06CC\u06AF</b>\n\n" +
    "<b>\u062F\u0627\u0645\u0646\u0647:</b> <code>{domain}</code>\n" +
    "<b>\u0631\u0645\u0632\u0646\u06AF\u0627\u0631\u06CC:</b> AES-256-GCM\n" +
    "<b>\u06A9\u0644\u06CC\u062F:</b> <code>{key}</code>\n" +
    "<b>\u067E\u0631\u0627\u06A9\u0633\u06CC \u0645\u062D\u0644\u06CC:</b> <code>127.0.0.1:18000</code> (SOCKS5)",
  masterdns_bot_proxy_hint: "\u0628\u0639\u062F \u0627\u0632 \u0627\u062C\u0631\u0627\u060C \u067E\u0631\u0627\u06A9\u0633\u06CC \u062F\u0633\u062A\u06AF\u0627\u0647 \u0631\u0627 \u0631\u0648\u06CC 127.0.0.1:18000 (SOCKS5) \u062A\u0646\u0638\u06CC\u0645 \u06A9\u0646\u06CC\u062F.",

  // DNS Tunnel
  btn_show_dnstt: "\u{1F4E1} \u062A\u0648\u0646\u0644 DNS (\u0622\u062E\u0631\u06CC\u0646 \u0631\u0627\u0647)",
  btn_show_npv: "\u{1F517} \u062A\u0648\u0646\u0644 SSH (\u0633\u0631\u06CC\u0639\u200C\u062A\u0631)",
  npv_warning: "\u062A\u0648\u0646\u0644 SSH \u0645\u0633\u062A\u0642\u06CC\u0645. \u0633\u0631\u06CC\u0639\u200C\u062A\u0631 \u0627\u0632 \u062A\u0648\u0646\u0644 DNS \u0627\u0645\u0627 \u0645\u0645\u06A9\u0646 \u0627\u0633\u062A \u0631\u0648\u06CC \u0628\u0631\u062E\u06CC \u0634\u0628\u06A9\u0647\u200C\u0647\u0627 \u0645\u0633\u062F\u0648\u062F \u0628\u0627\u0634\u062F.",
  dnstt_bot_title:
    "\u{1F4E1} <b>\u062A\u0648\u0646\u0644 DNS</b>\n\n" +
    "\u{26A1} <b>\u0647\u0634\u062F\u0627\u0631:</b> \u0627\u06CC\u0646 \u0628\u0633\u06CC\u0627\u0631 \u06A9\u0646\u062F \u0627\u0633\u062A (~\u06F1 \u0645\u06AF\u0627\u0628\u06CC\u062A). \u0641\u0642\u0637 \u0648\u0642\u062A\u06CC \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u06A9\u0646 \u06A9\u0647 \u0647\u0645\u0647 \u067E\u0631\u0648\u062A\u06A9\u0644\u200C\u0647\u0627\u06CC \u062F\u06CC\u06AF\u0647 \u0628\u0644\u0627\u06A9 \u0628\u0627\u0634\u0646.\n\n" +
    "\u067E\u0644\u062A\u0641\u0631\u0645\u062A \u0631\u0648 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646:",
  dnstt_bot_warning: "\u062A\u0648\u0646\u0644 DNS \u0641\u0642\u0637 \u0628\u0631\u0627\u06CC \u0645\u0648\u0627\u0642\u0639 \u0627\u0636\u0637\u0631\u0627\u0631\u06CC \u0627\u0633\u062A \u06A9\u0647 \u0647\u06CC\u0686 \u0686\u06CC\u0632 \u062F\u06CC\u06AF\u0647\u200C\u0627\u06CC \u06A9\u0627\u0631 \u0646\u0645\u06CC\u200C\u06A9\u0646\u0647.",
  dnstt_bot_android_title:
    "\u{1F4F1} <b>\u0627\u0646\u062F\u0631\u0648\u06CC\u062F \u{2014} SlipNet</b>\n\n" +
    "\u06F1. APK SlipNet \u0631\u0648 \u0627\u0632 GitHub \u062F\u0627\u0646\u0644\u0648\u062F \u06A9\u0646\n" +
    "\u06F2. \u062F\u06A9\u0645\u0647 import \u0631\u0648 \u067E\u0627\u06CC\u06CC\u0646 \u0628\u0632\u0646 \u{2014} SlipNet \u0628\u0627 \u06A9\u0627\u0646\u0641\u06CC\u06AF\u062A \u0628\u0627\u0632 \u0645\u06CC\u200C\u0634\u0647\n" +
    "\u06F3. \u062F\u0631 SlipNet Connect \u0631\u0648 \u0628\u0632\u0646",
  dnstt_bot_android_desc: "\u067E\u0627\u06CC\u06CC\u0646 \u0631\u0648 \u0628\u0632\u0646 \u062A\u0627 \u06A9\u0627\u0646\u0641\u06CC\u06AF \u062A\u0648\u0646\u0644 DNS \u0631\u0648 \u062F\u0631 SlipNet \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC:",
  dnstt_bot_ios_title:
    "\u{1F34E} <b>iOS \u{2014} HTTP Injector</b>\n\n" +
    "HTTP Injector \u0631\u0648 \u0627\u0632 App Store \u062F\u0627\u0646\u0644\u0648\u062F \u06A9\u0646\u060C \u0628\u0639\u062F \u062F\u0633\u062A\u06CC \u062A\u0646\u0638\u06CC\u0645 \u06A9\u0646:",
  dnstt_bot_ios_desc: "\u0627\u06CC\u0646 \u0645\u0631\u0627\u062D\u0644 \u0631\u0648 \u062F\u0631 HTTP Injector \u0627\u0646\u062C\u0627\u0645 \u0628\u062F\u0647:",
  dnstt_bot_ios_steps:
    "\u06F1. Configs tab \u{2192} + \u{2192} New config\n" +
    "\u06F2. Tunnel Type: DNS (DNSTT) \u{2192} SSH\n" +
    "\u06F3. DNS Resolver: <code>{dnsResolver}</code>\n" +
    "\u06F4. Nameserver: <code>{nameserver}</code>\n" +
    "\u06F5. Public Key: <code>{pubkey}</code>\n" +
    "\u06F6. SSH Host: <code>127.0.0.1</code>\n" +
    "\u06F7. SSH Port: <code>2222</code>\n" +
    "\u06F8. SSH Username: <code>{sshUser}</code>\n" +
    "\u06F9. SSH Password: <code>{sshPass}</code>\n" +
    "\u06F1\u06F0. \u0630\u062E\u06CC\u0631\u0647 \u06A9\u0646 \u0648 Start \u0631\u0648 \u0628\u0632\u0646",

  // Deep links
  btn_open_in_singbox: "\u{1F680} \u0628\u0627\u0632 \u06A9\u0631\u062F\u0646 \u062F\u0631 sing-box",
  btn_open_in_hiddify: "\u{1F680} \u0628\u0627\u0632 \u06A9\u0631\u062F\u0646 \u062F\u0631 Hiddify",

  // Dashboard
  dashboard_title:
    "\u{1F4CB} <b>\u062F\u0634\u0628\u0648\u0631\u062F VPN</b>\n\n" +
    "\u0627\u06CC\u0646\u062C\u0627 \u0647\u0645\u0647 \u0627\u062A\u0635\u0627\u0644\u200C\u0647\u0627\u06CC \u0645\u0648\u062C\u0648\u062F \u0647\u0633\u062A\u0646. \u0647\u0631 \u062F\u06A9\u0645\u0647 \u0631\u0648 \u0628\u0632\u0646 \u062A\u0627 \u062C\u0632\u0626\u06CC\u0627\u062A \u06A9\u0627\u0646\u0641\u06CC\u06AF \u0631\u0648 \u0628\u0628\u06CC\u0646\u06CC.",
  btn_dashboard: "\u{1F4CB} \u062F\u0634\u0628\u0648\u0631\u062F",
  bot_network_status:
    "\u{26A0}\u{FE0F} <b>\u0627\u06A9\u0646\u0648\u0646 \u0628\u06CC\u0634\u062A\u0631 \u067E\u0631\u0648\u062A\u06A9\u0644\u200C\u0647\u0627\u06CC VPN \u0645\u0633\u062F\u0648\u062F \u0647\u0633\u062A\u0646\u062F.</b>\n\n" +
    "\u067E\u0631\u0648\u062A\u06A9\u0644\u200C\u0647\u0627\u06CC VPN \u0627\u0633\u062A\u0627\u0646\u062F\u0627\u0631\u062F \u062F\u0631 \u062D\u0627\u0644 \u0645\u0633\u062F\u0648\u062F \u0634\u062F\u0646 \u0647\u0633\u062A\u0646\u062F. <b>MasterDNS Tunnel</b> \u062A\u0646\u0647\u0627 \u06AF\u0632\u06CC\u0646\u0647\u200C\u0627\u06CC \u0627\u0633\u062A \u06A9\u0647 \u062F\u0631 \u0634\u0631\u0627\u06CC\u0637 \u0641\u0639\u0644\u06CC \u06A9\u0627\u0631 \u0645\u06CC\u200C\u06A9\u0646\u062F \u2014 \u062A\u0648\u0635\u06CC\u0647 \u0645\u06CC\u200C\u0634\u0648\u062F.",
  bot_other_options_note:
    "\u{1F4A1} \u0633\u0627\u06CC\u0631 \u06AF\u0632\u06CC\u0646\u0647\u200C\u0647\u0627\u06CC \u0632\u06CC\u0631 \u0645\u0645\u06A9\u0646 \u0627\u0633\u062A \u0627\u0644\u0627\u0646 \u062F\u0631\u0633\u062A \u06A9\u0627\u0631 \u0646\u06A9\u0646\u0646\u062F \u0648\u0644\u06CC \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0647\u0633\u062A\u0646\u062F:",
  btn_masterdns_recommended: "\u{1F7E2} \u062A\u0648\u0646\u0644 MasterDNS \u2014 \u0627\u0644\u0627\u0646 \u06A9\u0627\u0631 \u0645\u06CC\u200C\u06A9\u0646\u062F",

  // Invite sharing
  invite_share_message:
    "{shareText}\n{link}",

  // Slipstream guide (Hiddify)
  slipstream_bot_guide:
    "<b>💡 \u067e\u06cc\u062f\u0627 \u06a9\u0631\u062f\u0646 IP \u0647\u0627\u06cc \u0628\u0647\u062a\u0631 (Slipstream)</b>\n\n" +
    "\u0627\u06af\u0631 \u0627\u062a\u0635\u0627\u0644 \u06a9\u0646\u062f \u06cc\u0627 \u0646\u0627\u067e\u0627\u06cc\u062f\u0627\u0631 \u0627\u0633\u062a\u060c \u0628\u0627 Slipstream \u0628\u0647\u062a\u0631\u06cc\u0646 IP \u0647\u0627 \u0631\u0627 \u067e\u06cc\u062f\u0627 \u06a9\u0646\u06cc\u062f:\n\n" +
    "\u06f1. \u062f\u0631 Hiddify\u060c \u0628\u0647 <b>Settings \u2192 Slipstream</b> \u0628\u0631\u0648\u06cc\u062f\n" +
    "\u06f2. <b>Domain</b> \u0631\u0627 \u0628\u06af\u0630\u0627\u0631\u06cc\u062f: <code>{domain}</code>\n" +
    "\u06f3. <b>DNS Resolver</b> \u0631\u0627 \u0628\u06af\u0630\u0627\u0631\u06cc\u062f: <code>8.8.8.8:53</code>\n" +
    "\u06f4. \u0631\u0648\u06cc <b>Scan For Working Resolvers</b> \u0628\u0632\u0646\u06cc\u062f\n" +
    "\u06f5. <b>Advanced \u2192 IR DNS Ranges</b> \u0631\u0627 \u0627\u0646\u062a\u062e\u0627\u0628 \u06a9\u0646\u06cc\u062f\n" +
    "\u06f6. \u062a\u0639\u062f\u0627\u062f \u0631\u0627 <b>10000</b> \u0628\u06af\u0630\u0627\u0631\u06cc\u062f\u060c <b>Generate IPs</b> \u0648 <b>Start Scan</b>\n" +
    "\u06f7. \u0648\u0642\u062a\u06cc DNS \u0647\u0627 \u067e\u06cc\u062f\u0627 \u0634\u062f\u0646\u062f\u060c <b>Test Tunnel</b> \u0631\u0627 \u0628\u0632\u0646\u06cc\u062f\n" +
    "\u06f8. \u0628\u0647\u062a\u0631\u06cc\u0646 \u0647\u0627 \u0631\u0627 \u0627\u0646\u062a\u062e\u0627\u0628 \u06a9\u0646\u06cc\u062f \u0648 <b>Apply</b> \u0631\u0627 \u0628\u0632\u0646\u06cc\u062f\n\n" +
    "\u0645\u0645\u06a9\u0646 \u0627\u0633\u062a \u0644\u0627\u0632\u0645 \u0628\u0627\u0634\u062f \u0627\u0633\u06a9\u0646 \u0631\u0627 \u062a\u06a9\u0631\u0627\u0631 \u06a9\u0646\u06cc\u062f. \u0645\u06cc\u200c\u062a\u0648\u0646\u06cc\u062f <b>Custom</b> \u0631\u0627 \u0647\u0645 \u0628\u0627 \u0631\u0646\u062c\u200c\u0647\u0627\u06cc \u0645\u062e\u062a\u0644\u0641 \u0627\u0645\u062a\u062d\u0627\u0646 \u06a9\u0646\u06cc\u062f.\n\n<b>\u0631\u0646\u062c\u200c\u0647\u0627\u06cc DNS \u0627\u06cc\u0631\u0627\u0646\u06cc \u0627\u0633\u06a9\u0646 \u0634\u062f\u0647 (Custom mode):</b>\n<code>194.53.0.0-194.53.255.255\n89.46.0.0-89.46.255.255\n2.177.0.0-2.177.255.255\n2.190.0.0-2.190.255.255\n151.235.0.0-151.235.255.255\n5.74.0.0-5.74.255.255\n2.178.0.0-2.178.255.255\n5.239.0.0-5.239.255.255\n5.238.0.0-5.238.255.255\n5.159.0.0-5.159.255.255\n2.191.0.0-2.191.255.255\n5.233.0.0-5.233.255.255\n2.176.0.0-2.176.255.255\n37.148.0.0-37.148.255.255\n2.180.0.0-2.180.255.255\n89.219.0.0-89.219.255.255\n46.100.0.0-46.100.255.255\n185.173.0.0-185.173.255.255\n2.179.0.0-2.179.255.255\n79.175.0.0-79.175.255.255\n93.118.0.0-93.118.255.255\n78.39.0.0-78.39.255.255\n5.236.0.0-5.236.255.255\n91.92.0.0-91.92.255.255\n94.182.0.0-94.182.255.255\n80.210.0.0-80.210.255.255\n78.38.0.0-78.38.255.255\n2.184.0.0-2.184.255.255\n5.234.0.0-5.234.255.255\n94.183.0.0-94.183.255.255</code>",

  // Backup Tunnels (web)
  backup_tunnels_section_title: "\u062a\u0648\u0646\u0644\u200c\u0647\u0627\u06cc \u067e\u0634\u062a\u06cc\u0628\u0627\u0646",
  npv_card_title: "\u062a\u0648\u0646\u0644 SSH (\u0633\u0631\u06cc\u0639\u200c\u062a\u0631)",
  npv_card_desc: "\u062a\u0648\u0646\u0644 SSH \u0645\u0633\u062a\u0642\u06cc\u0645. \u0633\u0631\u06cc\u0639\u200c\u062a\u0631 \u0627\u0632 \u062a\u0648\u0646\u0644 DNS \u0627\u0645\u0627 \u0645\u0645\u06a9\u0646 \u0627\u0633\u062a \u0631\u0648\u06cc \u0628\u0631\u062e\u06cc \u0634\u0628\u06a9\u0647\u200c\u0647\u0627 \u0645\u0633\u062f\u0648\u062f \u0628\u0627\u0634\u062f.",
  npv_field_protocol: "\u067e\u0631\u0648\u062a\u06a9\u0644",
  npv_field_ssh_host: "SSH Host",
  npv_field_ssh_port: "SSH Port",
  npv_field_udpgw_port: "Udpgw Port",
  npv_field_username: "\u0646\u0627\u0645 \u06a9\u0627\u0631\u0628\u0631\u06cc",
  npv_field_password: "\u0631\u0645\u0632 \u0639\u0628\u0648\u0631",
  npv_udpgw_hint: "UDPGW transparent DNS \u0631\u0627 \u062f\u0631 \u0628\u0631\u0646\u0627\u0645\u0647 \u0641\u0639\u0627\u0644 \u06a9\u0646\u06cc\u062f.",
  npv_app_android: "NapsternetV (\u0627\u0646\u062f\u0631\u0648\u06cc\u062f)",
  npv_app_ios: "NpvTunnel (\u0622\u06cc\u0641\u0648\u0646)",
  dnstt_card_title: "\u062a\u0648\u0646\u0644 DNS (\u0622\u062e\u0631\u06cc\u0646 \u0631\u0627\u0647)",
  dnstt_card_desc: "\u0628\u0633\u06cc\u0627\u0631 \u06a9\u0646\u062f (~\u06f1 \u0645\u06af\u0627\u0628\u06cc\u062a) \u0627\u0645\u0627 \u0648\u0642\u062a\u06cc \u0647\u0645\u0647 \u0686\u06cc\u0632 \u0641\u06cc\u0644\u062a\u0631 \u0627\u0633\u062a \u06a9\u0627\u0631 \u0645\u06cc\u200c\u06a9\u0646\u062f. \u0641\u0642\u0637 \u0628\u0631\u0627\u06cc \u0645\u0648\u0627\u0642\u0639 \u0627\u0636\u0637\u0631\u0627\u0631\u06cc.",
  dnstt_android_title: "\u0627\u0646\u062f\u0631\u0648\u06cc\u062f \u2014 SlipNet",
  dnstt_android_desc: "\u062f\u06a9\u0645\u0647 \u0632\u06cc\u0631 \u0631\u0627 \u0628\u0632\u0646\u06cc\u062f \u062a\u0627 \u06a9\u0627\u0646\u0641\u06cc\u06af \u062a\u0648\u0646\u0644 DNS \u062f\u0631 SlipNet \u0648\u0627\u0631\u062f \u0634\u0648\u062f:",
  dnstt_android_btn: "\u0628\u0627\u0632 \u06a9\u0631\u062f\u0646 \u062f\u0631 SlipNet",
  dnstt_ios_title: "iOS \u2014 HTTP Injector",
  dnstt_ios_steps_web: "HTTP Injector \u0631\u0627 \u0627\u0632 App Store \u062f\u0627\u0646\u0644\u0648\u062f \u06a9\u0646\u06cc\u062f\u060c \u0633\u067e\u0633 \u062f\u0633\u062a\u06cc \u062a\u0646\u0638\u06cc\u0645 \u06a9\u0646\u06cc\u062f:",
  dnstt_copied_hint: "\u06a9\u067e\u06cc \u0634\u062f!",
  dnstt_backup_resolvers: "\u0627\u06af\u0631 DNS Resolver \u0648\u0635\u0644 \u0646\u0634\u062f\u060c \u0627\u06cc\u0646 \u067e\u0634\u062a\u06cc\u0628\u0627\u0646\u200c\u0647\u0627 \u0631\u0627 \u0627\u0645\u062a\u062d\u0627\u0646 \u06a9\u0646\u06cc\u062f: {resolvers}",
  dnstt_resolver_freshness: "\u0622\u062f\u0631\u0633\u200c\u0647\u0627\u06cc IP \u0631\u06cc\u0632\u0627\u0644\u0648\u06cc\u0631 \u0627\u0632 \u06cc\u06a9 \u0645\u062e\u0632\u0646 \u0627\u0632 \u0633\u0631\u0648\u0631\u0647\u0627\u06cc ISP \u0627\u06cc\u0631\u0627\u0646\u06cc \u0627\u0646\u062a\u062e\u0627\u0628 \u0645\u06cc\u200c\u0634\u0648\u0646\u062f \u0648 \u0647\u0631 \u06f6 \u0633\u0627\u0639\u062a \u062a\u063a\u06cc\u06cc\u0631 \u0645\u06cc\u200c\u06a9\u0646\u0646\u062f. \u0622\u062e\u0631\u06cc\u0646 \u0628\u0647\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06cc: {updatedAt}.",

  // MasterDNS Tunnel (web)
  masterdns_card_title: "\u062A\u0648\u0646\u0644 MasterDNS",
  masterdns_card_warning: "\u0628\u0633\u06CC\u0627\u0631 \u067E\u06CC\u0634\u0631\u0641\u062A\u0647 \u2014 \u0646\u06CC\u0627\u0632 \u0628\u0647 \u062A\u0631\u0645\u06CC\u0646\u0627\u0644 \u062F\u0627\u0631\u062F",
  masterdns_card_desc: "\u062D\u062F\u0648\u062F \u06F1\u06F0 \u0628\u0631\u0627\u0628\u0631 \u0633\u0631\u06CC\u0639\u200C\u062A\u0631 \u0627\u0632 \u062A\u0648\u0646\u0644 DNS \u0645\u0639\u0645\u0648\u0644\u06CC. \u0646\u06CC\u0627\u0632 \u0628\u0647 \u062F\u0627\u0646\u0644\u0648\u062F \u0648 \u0627\u062C\u0631\u0627\u06CC \u0628\u0631\u0646\u0627\u0645\u0647 \u062F\u0627\u0631\u062F.",
  masterdns_download_config: "\u062F\u0627\u0646\u0644\u0648\u062F \u0641\u0627\u06CC\u0644 \u06A9\u0627\u0646\u0641\u06CC\u06AF",
  masterdns_android_title: "\u0627\u0646\u062F\u0631\u0648\u06CC\u062F (Termux)",
  masterdns_android_steps: "\u06F1. Termux \u0631\u0627 \u0627\u0632 F-Droid \u0646\u0635\u0628 \u06A9\u0646\u06CC\u062F (\u0646\u0647 Play Store)\n\u06F2. \u0628\u0627\u06CC\u0646\u0631\u06CC \u06A9\u0644\u0627\u06CC\u0646\u062A \u0631\u0627 \u062F\u0627\u0646\u0644\u0648\u062F \u0648 \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u06A9\u0646\u06CC\u062F\n\u06F3. \u0641\u0627\u06CC\u0644 \u06A9\u0627\u0646\u0641\u06CC\u06AF \u0631\u0627 \u062F\u0631 Termux \u0630\u062E\u06CC\u0631\u0647 \u06A9\u0646\u06CC\u062F\n\u06F4. \u06A9\u0644\u0627\u06CC\u0646\u062A \u0631\u0627 \u0627\u062C\u0631\u0627 \u06A9\u0646\u06CC\u062F\n\u06F5. \u067E\u0631\u0627\u06A9\u0633\u06CC Wi-Fi \u06AF\u0648\u0634\u06CC \u0631\u0627 \u0631\u0648\u06CC 127.0.0.1:18000 \u062A\u0646\u0638\u06CC\u0645 \u06A9\u0646\u06CC\u062F",
  masterdns_windows_title: "Windows",
  masterdns_windows_steps: "\u06F1. \u0641\u0627\u06CC\u0644 .zip \u06A9\u0644\u0627\u06CC\u0646\u062A \u0631\u0627 \u0628\u0631\u0627\u06CC Windows \u062F\u0627\u0646\u0644\u0648\u062F \u06A9\u0646\u06CC\u062F\n\u06F2. \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u06A9\u0646\u06CC\u062F \u0648 \u0641\u0627\u06CC\u0644 \u06A9\u0627\u0646\u0641\u06CC\u06AF \u0631\u0627 \u0630\u062E\u06CC\u0631\u0647 \u06A9\u0646\u06CC\u062F\n\u06F3. cmd \u0631\u0627 \u0628\u0627\u0632 \u06A9\u0646\u06CC\u062F\u060C \u06A9\u0644\u0627\u06CC\u0646\u062A \u0631\u0627 \u0627\u062C\u0631\u0627 \u06A9\u0646\u06CC\u062F\n\u06F4. \u067E\u0631\u0627\u06A9\u0633\u06CC \u0633\u06CC\u0633\u062A\u0645 \u0631\u0627 \u0631\u0648\u06CC 127.0.0.1:18000 (SOCKS5) \u062A\u0646\u0638\u06CC\u0645 \u06A9\u0646\u06CC\u062F",
  masterdns_desktop_title: "macOS / Linux",
  masterdns_desktop_steps: "\u06F1. \u06A9\u0644\u0627\u06CC\u0646\u062A \u0631\u0627 \u0628\u0631\u0627\u06CC \u067E\u0644\u062A\u0641\u0631\u0645\u062A\u0627\u0646 \u062F\u0627\u0646\u0644\u0648\u062F \u06A9\u0646\u06CC\u062F\n\u06F2. \u0641\u0627\u06CC\u0644 \u06A9\u0627\u0646\u0641\u06CC\u06AF \u0631\u0627 \u062F\u0631 \u0647\u0645\u0627\u0646 \u067E\u0648\u0634\u0647 \u0630\u062E\u06CC\u0631\u0647 \u06A9\u0646\u06CC\u062F\n\u06F3. \u062F\u0631 \u062A\u0631\u0645\u06CC\u0646\u0627\u0644 \u0627\u062C\u0631\u0627 \u06A9\u0646\u06CC\u062F\n\u06F4. \u067E\u0631\u0627\u06A9\u0633\u06CC \u0633\u06CC\u0633\u062A\u0645 \u0631\u0627 \u0631\u0648\u06CC 127.0.0.1:18000 (SOCKS5) \u062A\u0646\u0638\u06CC\u0645 \u06A9\u0646\u06CC\u062F",
  masterdns_proxy_hint: "\u0628\u0639\u062F \u0627\u0632 \u0627\u062C\u0631\u0627\u060C \u067E\u0631\u0627\u06A9\u0633\u06CC \u062F\u0633\u062A\u06AF\u0627\u0647 \u0631\u0627 \u0631\u0648\u06CC 127.0.0.1:18000 (SOCKS5) \u062A\u0646\u0638\u06CC\u0645 \u06A9\u0646\u06CC\u062F.",
  masterdns_resolvers_hint: "DNS Resolver\u0647\u0627 (\u0627\u06AF\u0631 \u067E\u06CC\u0634\u200C\u0641\u0631\u0636 \u0648\u0635\u0644 \u0646\u0634\u062F \u0627\u06CC\u0646\u0647\u0627 \u0631\u0627 \u0627\u0645\u062A\u062D\u0627\u0646 \u06A9\u0646\u06CC\u062F):",

  // MTProto Proxy
  mtproto_section_title: "\u067e\u0631\u0627\u06a9\u0633\u06cc \u062a\u0644\u06af\u0631\u0627\u0645",
  mtproto_card_title: "\u067e\u0631\u0627\u06a9\u0633\u06cc MTProto",
  mtproto_card_desc: "\u0646\u0645\u06cc\u200c\u062a\u0648\u0627\u0646\u06cc\u062f \u0628\u0647 \u062a\u0644\u06af\u0631\u0627\u0645 \u0648\u0635\u0644 \u0634\u0648\u06cc\u062f\u061f \u0627\u0632 \u0627\u06cc\u0646 \u067e\u0631\u0627\u06a9\u0633\u06cc \u0628\u0631\u0627\u06cc \u0627\u062a\u0635\u0627\u0644 \u0628\u0647 \u062a\u0644\u06af\u0631\u0627\u0645 \u0628\u062f\u0648\u0646 VPN \u0627\u0633\u062a\u0641\u0627\u062f\u0647 \u06a9\u0646\u06cc\u062f.",
  mtproto_copy_link: "\u06a9\u067e\u06cc \u0644\u06cc\u0646\u06a9 \u067e\u0631\u0627\u06a9\u0633\u06cc",
  mtproto_copied_hint: "\u0644\u06cc\u0646\u06a9 \u067e\u0631\u0627\u06a9\u0633\u06cc \u06a9\u067e\u06cc \u0634\u062f! \u062f\u0631 \u0645\u0631\u0648\u0631\u06af\u0631 \u067e\u06cc\u0633\u062a \u06a9\u0646\u06cc\u062f \u06cc\u0627 \u0628\u0647 \u0627\u0634\u062a\u0631\u0627\u06a9 \u0628\u06af\u0630\u0627\u0631\u06cc\u062f.",
  mtproto_open_telegram: "\u0628\u0627\u0632 \u06a9\u0631\u062f\u0646 \u062f\u0631 \u062a\u0644\u06af\u0631\u0627\u0645",
  btn_show_mtproto: "\u{1F4E1} \u067e\u0631\u0627\u06a9\u0633\u06cc \u062a\u0644\u06af\u0631\u0627\u0645",
  mtproto_bot_message: "<b>\u{1F4E1} \u067e\u0631\u0627\u06a9\u0633\u06cc \u062a\u0644\u06af\u0631\u0627\u0645 (MTProto)</b>\n\n\u0627\u0632 \u0627\u06cc\u0646 \u067e\u0631\u0627\u06a9\u0633\u06cc \u0628\u0631\u0627\u06cc \u062f\u0633\u062a\u0631\u0633\u06cc \u0628\u0647 \u062a\u0644\u06af\u0631\u0627\u0645 \u0648\u0642\u062a\u06cc \u0641\u06cc\u0644\u062a\u0631 \u0627\u0633\u062a \u0627\u0633\u062a\u0641\u0627\u062f\u0647 \u06a9\u0646\u06cc\u062f.\n\n\u062f\u06a9\u0645\u0647 \u0632\u06cc\u0631 \u0631\u0627 \u0628\u0632\u0646\u06cc\u062f \u062a\u0627 \u0628\u0647 \u062a\u0644\u06af\u0631\u0627\u0645 \u0627\u0636\u0627\u0641\u0647 \u0634\u0648\u062f\u060c \u06cc\u0627 \u0644\u06cc\u0646\u06a9 \u0631\u0627 \u06a9\u067e\u06cc \u06a9\u0646\u06cc\u062f \u0648 \u0628\u0647 \u0627\u0634\u062a\u0631\u0627\u06a9 \u0628\u06af\u0630\u0627\u0631\u06cc\u062f.",
  mtproto_qr_hint: "\u0627\u06cc\u0646 QR code \u0631\u0627 \u0627\u0633\u06a9\u0646 \u06a9\u0646\u06cc\u062f \u062a\u0627 \u067e\u0631\u0627\u06a9\u0633\u06cc \u0628\u0647 \u062a\u0644\u06af\u0631\u0627\u0645 \u0627\u0636\u0627\u0641\u0647 \u0634\u0648\u062f.",
};

const translations: Record<Language, TranslationKeys> = { en, fa, pi };

export type TranslationKey = keyof TranslationKeys;

export function t(
  lang: Language,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  let text = translations[lang][key];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}
