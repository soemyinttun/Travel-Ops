/** Phone number with only digits and a leading +, for tel: and sms: links. */
export const dial = (phone: string) => phone.replace(/[^\d+]/g, '')

/** Opens the phone's own message app with the text ready to send (nothing is sent by the app). */
export const smsLink = (phone: string, text: string) => `sms:${dial(phone)}?&body=${encodeURIComponent(text)}`
export const telLink = (phone: string) => `tel:${dial(phone)}`
