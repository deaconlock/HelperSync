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
  language: string
): string {
  const messages: Record<string, string> = {
    en: `Hi ${helperName}! You've been invited to join HelperSync. Use invite code: ${inviteCode} or click: ${appUrl}/join/${inviteCode}`,
    my: `မင်္ဂလာပါ ${helperName}! HelperSync တွင် ပါဝင်ရန် ဖိတ်ကြားပါသည်။ ကုဒ်: ${inviteCode} သို့မဟုတ် နှိပ်ပါ: ${appUrl}/join/${inviteCode}`,
    tl: `Kumusta ${helperName}! Inimbitahan ka sa HelperSync. Gamitin ang code: ${inviteCode} o bisitahin: ${appUrl}/join/${inviteCode}`,
    id: `Halo ${helperName}! Anda diundang bergabung di HelperSync. Gunakan kode: ${inviteCode} atau kunjungi: ${appUrl}/join/${inviteCode}`,
  };
  return messages[language] ?? messages.en;
}
