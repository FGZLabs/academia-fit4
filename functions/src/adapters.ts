export interface PixCharge {
  externalId: string;
  amountCents: number;
  qrCodeText: string;
  qrCodeImageUrl?: string;
  expiresAt: string;
}

export interface PaymentProvider {
  createPixCharge(input: {
    personId: string;
    cycleId: string;
    amountCents: number;
    idempotencyKey: string;
  }): Promise<PixCharge>;
  verifyWebhook(signature: string, rawBody: Uint8Array): Promise<boolean>;
}

export interface WhatsAppProvider {
  sendTemplate(input: {
    to: string;
    templateId: string;
    variables: Record<string, string>;
    idempotencyKey: string;
  }): Promise<{ providerMessageId: string }>;
}

export interface AccessControllerProvider {
  synchronizeAuthorizedUsers(): Promise<void>;
  releaseTurnstile(deviceId: string, personId: string): Promise<void>;
}

export class IntegrationNotConfiguredError extends Error {
  constructor(integration: string) {
    super(`${integration} ainda não possui credenciais/configuração.`);
    this.name = "IntegrationNotConfiguredError";
  }
}
