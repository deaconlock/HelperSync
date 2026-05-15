import { generateInviteCode, buildInviteUrl } from "./utils";

export function createInviteData() {
  const code = generateInviteCode();
  const url = buildInviteUrl(code);
  return { code, url };
}

export function buildHelperWhatsAppMessage(
  inviteCode: string,
  appUrl: string,
  helperName: string,
  language: string,
  pin?: string
): string {
  const pinLine = pin ? `\nPIN: ${pin}` : "";
  const messages: Record<string, string> = {
    en: `Hi ${helperName}! You've been invited to join HelperSync.\nLink: ${appUrl}/join/${inviteCode}\nCode: ${inviteCode}${pinLine}`,
    my: `မင်္ဂလာပါ ${helperName}! HelperSync တွင် ပါဝင်ရန် ဖိတ်ကြားပါသည်။\nLink: ${appUrl}/join/${inviteCode}\nကုဒ်: ${inviteCode}${pinLine}`,
    tl: `Kumusta ${helperName}! Inimbitahan ka sa HelperSync.\nLink: ${appUrl}/join/${inviteCode}\nCode: ${inviteCode}${pinLine}`,
    id: `Halo ${helperName}! Anda diundang bergabung di HelperSync.\nLink: ${appUrl}/join/${inviteCode}\nKode: ${inviteCode}${pinLine}`,
  };
  return messages[language] ?? messages.en;
}
